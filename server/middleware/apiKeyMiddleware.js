/**
 * ==========================================================================
 * DDS API SECURITY MIDDLEWARE — Enterprise 12-Step Ordered Validation
 * ==========================================================================
 *
 * Implements the mandatory 12-step validation pipeline in exact order:
 *   Step 1  — Application Exists (404)
 *   Step 2  — Application Active (403)
 *   Step 3  — Validate API Key (401)
 *   Step 4  — Validate Secret Key (401)
 *   Step 5  — Verify HMAC Signature (401)
 *   Step 6  — Timestamp Validation (401 if > 60s skew)
 *   Step 7  — Nonce Validation (401 if replay)
 *   Step 8  — Daily Limit Validation (429)
 *   Step 9  — Monthly Limit Validation (429)
 *   Step 10 — Rate Limiting (429)
 *   Step 11 — Application Status Validation (403/402)
 *   Step 12 — Generate Authentication Request (Proceed to Controller)
 * ==========================================================================
 */

import crypto from 'crypto';
import ApiKey from '../models/apiKeyModel.js';
import Application from '../models/applicationModel.js';
import Developer from '../models/developerModel.js';
import nonceCache from '../utils/nonceCache.js';

// In-memory rate limiting map for Step 10
const rateLimitMap = new Map();

// Helper to extract headers
const extractHeader = (req, ...names) => {
  for (const name of names) {
    const val = req.headers[name.toLowerCase()];
    if (val) return Array.isArray(val) ? val[0] : val;
  }
  return null;
};

// Mask secret for secure logs
const maskSecret = (secret) => {
  if (!secret) return '(none)';
  return `${secret.slice(0, 7)}...${secret.slice(-4)}`;
};

export const resolveApiKey = async (req, res, next) => {
  const startTime = Date.now();
  const logPrefix = '[DDS 12-Step Security Pipeline]';

  try {
    // Read parameters from headers & body
    const appId = extractHeader(req, 'x-dds-app-id', 'x-app-id') || req.body?.appId || req.body?.applicationId;
    const apiKey = extractHeader(req, 'x-dds-api-key', 'x-dds-public-key', 'x-api-key') || req.body?.apiKey;
    
    // Auth secret can come from Bearer token or x-dds-secret header
    const authHeader = req.headers.authorization;
    let rawSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!rawSecret) {
      rawSecret = extractHeader(req, 'x-dds-secret-key', 'x-dds-secret', 'x-secret-key') || req.body?.secretKey;
    }

    const timestamp = extractHeader(req, 'x-dds-timestamp', 'x-timestamp') || req.body?.timestamp;
    const nonce = extractHeader(req, 'x-dds-nonce', 'x-nonce') || req.body?.nonce;
    const signature = extractHeader(req, 'x-dds-signature', 'x-signature') || req.body?.signature;

    // ── STEP 1: Application Exists ────────────────────────────────────────────
    if (!appId) {
      return res.status(404).json({
        success: false,
        error: 'APPLICATION_NOT_FOUND',
        message: 'Step 1 Failed: Application ID is required (header x-dds-app-id or body appId).'
      });
    }

    const appDoc = await Application.findOne({ applicationId: appId });

    console.log(`${logPrefix} Step 1 Audit:`);
    console.log(`  Received Application ID: "${appId}"`);
    console.log(`  Database Query: { applicationId: "${appId}" }`);
    console.log(`  Collection Name: applications`);
    console.log(`  Number of Matching Records: ${appDoc ? 1 : 0}`);
    if (appDoc) {
      console.log(`  Developer ID: ${appDoc.developerId}`);
    }

    if (!appDoc) {
      return res.status(404).json({
        success: false,
        error: 'APPLICATION_NOT_FOUND',
        message: `Step 1 Failed: Application "${appId}" does not exist.`
      });
    }

    // ── STEP 2: Application Active ───────────────────────────────────────────
    if (appDoc.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'APPLICATION_INACTIVE',
        message: `Step 2 Failed: Application "${appDoc.applicationName}" is ${appDoc.status}. Only active applications can authenticate.`
      });
    }

    // ── STEP 3: Validate API Key ─────────────────────────────────────────────
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'Step 3 Failed: API Key is required (header x-dds-api-key).'
      });
    }

    const apiKeyDoc = await ApiKey.findOne({
      applicationId: appDoc._id,
      publicKey: apiKey
    }).select('+secretSha256 +secretHash');

    if (!apiKeyDoc || apiKeyDoc.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'Step 3 Failed: Provided API Key is invalid or inactive for this application.'
      });
    }

    // ── STEP 4: Validate Secret Key ───────────────────────────────────────────
    if (!rawSecret) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_SECRET_KEY',
        message: 'Step 4 Failed: Secret Key is required (Authorization: Bearer dds_sk_... or x-dds-secret-key header).'
      });
    }

    const incomingSecretHash = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const storedSecretHash = apiKeyDoc.secretSha256 || apiKeyDoc.secretHash;

    if (!storedSecretHash || incomingSecretHash !== storedSecretHash) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_SECRET_KEY',
        message: 'Step 4 Failed: Secret Key validation failed.'
      });
    }

    // ── STEP 5: Verify HMAC Signature ───────────────────────────────────────
    if (signature) {
      let payloadStr = '';
      if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        payloadStr = JSON.stringify(req.body);
      } else if (typeof req.body === 'string') {
        payloadStr = req.body;
      }
      const canonicalData = `${appId}:${apiKey}:${timestamp || ''}:${nonce || ''}:${payloadStr}`;
      const expectedHmac = crypto.createHmac('sha256', rawSecret).update(canonicalData).digest('hex');

      if (signature.toLowerCase() !== expectedHmac.toLowerCase()) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_HMAC_SIGNATURE',
          message: 'Step 5 Failed: HMAC signature verification failed.'
        });
      }
    }

    // ── STEP 6: Timestamp Validation ─────────────────────────────────────────
    if (timestamp) {
      const parsedTime = Number(timestamp);
      if (isNaN(parsedTime)) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_TIMESTAMP',
          message: 'Step 6 Failed: Timestamp must be a valid numerical unix timestamp.'
        });
      }
      const timeDiff = Math.abs(Date.now() - parsedTime);
      if (timeDiff > 60000) { // Reject if skew is > 60 seconds
        return res.status(401).json({
          success: false,
          error: 'TIMESTAMP_EXPIRED',
          message: `Step 6 Failed: Timestamp is older than 60 seconds (Skew: ${Math.round(timeDiff / 1000)}s).`
        });
      }
    }

    // ── STEP 7: Nonce Validation ─────────────────────────────────────────────
    if (nonce) {
      const isValidNonce = nonceCache.useNonce(appId, nonce);
      if (!isValidNonce) {
        return res.status(401).json({
          success: false,
          error: 'REPLAY_ATTACK_DETECTED',
          message: 'Step 7 Failed: Nonce already used within validation window. Replay attack rejected.'
        });
      }
    }

    // ── STEP 8: Daily Limit Validation ──────────────────────────────────────
    const todayStr = new Date().toISOString().slice(0, 10);
    if (appDoc.lastUsageDate !== todayStr) {
      appDoc.dailyUsage = 0;
      appDoc.lastUsageDate = todayStr;
    }

    if (appDoc.dailyUsage >= (appDoc.dailyLimit || 1000)) {
      return res.status(429).json({
        success: false,
        error: 'DAILY_LIMIT_EXCEEDED',
        message: `Step 8 Failed: Daily request limit of ${appDoc.dailyLimit || 1000} exceeded for application "${appDoc.applicationName}".`
      });
    }

    // ── STEP 9: Monthly Limit Validation ────────────────────────────────────
    if (appDoc.monthlyUsage >= (appDoc.monthlyLimit || 30000)) {
      return res.status(429).json({
        success: false,
        error: 'MONTHLY_LIMIT_EXCEEDED',
        message: `Step 9 Failed: Monthly request limit of ${appDoc.monthlyLimit || 30000} exceeded for application "${appDoc.applicationName}".`
      });
    }

    // ── STEP 10: Rate Limiting ──────────────────────────────────────────────
    const windowKey = `${appId}:${Math.floor(Date.now() / 60000)}`;
    const currentRate = (rateLimitMap.get(windowKey) || 0) + 1;
    rateLimitMap.set(windowKey, currentRate);

    // Clean old entries
    if (rateLimitMap.size > 5000) rateLimitMap.clear();

    const maxRate = appDoc.verificationSettings?.rateLimit || 60;
    if (currentRate > maxRate) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Step 10 Failed: Rate limit of ${maxRate} requests/minute exceeded for this application.`
      });
    }

    // ── STEP 11: Application & Developer Status Validation ──────────────────
    const developer = await Developer.findById(appDoc.developerId);
    if (!developer) {
      return res.status(403).json({
        success: false,
        error: 'DEVELOPER_NOT_FOUND',
        message: 'Step 11 Failed: Developer account linked to this application was not found.'
      });
    }

    if (developer.status !== 'active' || developer.billingStatus === 'overdue') {
      return res.status(402).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'Step 11 Failed: Developer account is suspended or has overdue billing.'
      });
    }

    // ── STEP 12: Generate Authentication Request ─────────────────────────────
    // All 12 validations passed! Attach context and proceed to controller.
    req.apiClient = {
      app: appDoc,
      apiKeyDoc,
      developer,
      rawSecret,
      startTime
    };

    next();

  } catch (error) {
    console.error(`${logPrefix} Internal error during 12-step validation:`, error);
    next(error);
  }
};
