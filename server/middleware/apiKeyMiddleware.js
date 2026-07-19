/**
 * ==========================================================================
 * DDS API KEY MIDDLEWARE — v3 (Dual-Key Security)
 * ==========================================================================
 *
 * Both the Public Key and Secret Key are required for every request.
 * Neither key alone is sufficient. Both must belong to the same DB record.
 *
 * Validation flow (identical to Stripe, OpenAI, Gemini):
 *
 *   Step 1 — Read x-dds-public-key header
 *            → Look up ApiKey record by publicKey
 *            → If not found: 401 "Invalid Public Key"
 *
 *   Step 2 — Read Authorization: Bearer dds_sk_xxx header
 *            → Compute SHA-256(rawSecret)
 *            → Compare with record.secretSha256
 *            → If no match: 401 "Invalid Secret Key"
 *
 *   Step 3 — Check key status
 *            → If revoked: 403 "Key Revoked"
 *
 *   Step 4 — Resolve Application
 *            → If not found / inactive: 403
 *
 *   Step 5 — Resolve Developer
 *            → If not found / suspended: 403
 *
 *   Step 6 — Billing check → 402 if insufficient
 *
 *   Step 7 — Attach req.apiClient → call next()
 *
 * Required headers (developer's BACKEND server only — never browser JS):
 *   x-dds-public-key: dds_pk_xxx        ← identifies the application
 *   Authorization: Bearer dds_sk_xxx    ← authenticates the request
 *
 * The secret key is NEVER stored in plaintext.
 * Only SHA-256(secret) is stored and compared.
 * ==========================================================================
 */

import crypto from 'crypto';
import ApiKey from '../models/apiKeyModel.js';
import Application from '../models/applicationModel.js';
import Developer from '../models/developerModel.js';

// ── Header extraction helpers ─────────────────────────────────────────────────

/**
 * Extract the Public Key from standard DDS headers.
 * Accepted locations (in priority order):
 *   x-dds-public-key   ← preferred (explicit DDS header)
 *   x-public-key       ← legacy compat
 *   x-client-id        ← OAuth-style compat
 */
const extractPublicKey = (req) => {
  return (
    req.headers['x-dds-public-key'] ||
    req.headers['x-public-key']     ||
    req.headers['x-client-id']      ||
    null
  );
};

/**
 * Extract the raw Secret Key from the Authorization header or fallback headers.
 * Accepted locations (in priority order):
 *   Authorization: Bearer dds_sk_xxx  ← preferred
 *   x-dds-secret                      ← legacy compat
 *   x-api-key                         ← legacy compat
 *   x-client-secret                   ← legacy compat
 */
const extractRawSecret = (req) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return (
    req.headers['x-dds-secret']    ||
    req.headers['x-api-key']       ||
    req.headers['x-client-secret'] ||
    req.body?.apiKey               ||
    req.body?.clientSecret         ||
    req.body?.secretKey            ||
    null
  );
};

// ── Utility: mask secret for logging (never log actual secret) ────────────────
const maskSecret = (secret) => {
  if (!secret) return '(none)';
  return `${secret.slice(0, 11)}${'*'.repeat(Math.max(0, secret.length - 15))}${secret.slice(-4)}`;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * resolveApiKey — Express middleware.
 *
 * Performs strict dual-key authentication.
 * Attaches req.apiClient = { apiKeyDoc, app, developer } on success.
 * Returns structured JSON error responses on any failure.
 */
export const resolveApiKey = async (req, res, next) => {
  const logPrefix = '[DDS Auth]';

  // ── Audit log header ────────────────────────────────────────────────────────
  console.log(`${logPrefix} ──────────────────────────────────────────────────`);
  console.log(`${logPrefix} Authentication Started`);

  try {
    // ── Step 1: Extract both keys and optional App ID ─────────────────────────
    const publicKey  = extractPublicKey(req);
    const rawSecret  = extractRawSecret(req);
    const incomingAppId = req.headers['x-app-id'] || req.headers['x-dds-app-id'] || req.body?.applicationId || req.query?.appId || req.body?.appId;

    console.log(`${logPrefix} Received Public Key:   ${publicKey  || '(not provided)'}`);
    console.log(`${logPrefix} Received Secret Key:   ${maskSecret(rawSecret)}`);
    if (incomingAppId) {
      console.log(`${logPrefix} Received App ID:       ${incomingAppId}`);
    }

    // Both keys are required — fail fast with specific error per missing key
    if (!publicKey) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Missing Public Key`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(401).json({
        success: false,
        error: 'MISSING_PUBLIC_KEY',
        message: 'DDS Public Key is required.',
        hint: 'Add the header: x-dds-public-key: dds_pk_xxx'
      });
    }

    if (!rawSecret) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Missing Secret Key`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(401).json({
        success: false,
        error: 'MISSING_SECRET_KEY',
        message: 'DDS Secret Key is required.',
        hint: 'Add the header: Authorization: Bearer dds_sk_xxx'
      });
    }

    // ── Step 2: Validate key format ───────────────────────────────────────────
    if (!publicKey.startsWith('dds_pk_')) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Invalid Public Key Format`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(401).json({
        success: false,
        error: 'INVALID_PUBLIC_KEY',
        message: 'The supplied Public API Key is invalid.',
        hint: 'Use the public key from your DDS Developer Dashboard.'
      });
    }

    if (!rawSecret.startsWith('dds_sk_') && !rawSecret.startsWith('DDS_SECRET_')) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Invalid Secret Key Format`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(401).json({
        success: false,
        error: 'INVALID_SECRET_KEY',
        message: 'The supplied Secret API Key is invalid.',
        hint: 'Use the secret key from your DDS Developer Dashboard.'
      });
    }

    // ── Step 3: Look up by Public Key (Step 1 in the security flow) ──────────
    // The public key IDENTIFIES which application is making the request.
    // We find the record first, then verify the secret against IT specifically.
    // Select BOTH hash fields: secretSha256 (current) and secretHash (legacy fallback).
    const apiKeyDoc = await ApiKey
      .findOne({ publicKey })
      .select('+secretSha256 +secretHash');

    const appFound = !!apiKeyDoc;
    console.log(`${logPrefix} Application Found:     ${appFound ? 'Yes' : 'No'}`);
    console.log(`${logPrefix} Public Key Valid:      ${appFound ? 'Yes' : 'No'}`);

    if (!apiKeyDoc) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Invalid Public Key`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(401).json({
        success: false,
        error: 'INVALID_PUBLIC_KEY',
        message: 'The supplied Public API Key is invalid.',
        hint: 'Verify your DDS_PUBLIC_KEY matches the value in your DDS Developer Dashboard.'
      });
    }

    // ── Step 4: Verify Secret Key against this SPECIFIC record ───────────────
    // SHA-256(incoming secret) must match the stored hash.
    // Records created before the field rename may have their hash in `secretHash`
    // instead of `secretSha256`. We treat both as equivalent SHA-256 storage.
    const incomingSecretSha256 = crypto
      .createHash('sha256')
      .update(rawSecret)
      .digest('hex');

    // Resolve the authoritative stored hash — prefer secretSha256, fall back to secretHash.
    // Both fields store an identical SHA-256 hex digest; the field name changed in v2.
    const storedHash = apiKeyDoc.secretSha256 || apiKeyDoc.secretHash || null;
    const secretMatches = (typeof storedHash === 'string' && storedHash.length > 0 && incomingSecretSha256 === storedHash);

    // ── Diagnostic logging (never expose full secrets) ─────────────────────────
    console.log(`${logPrefix} ── Secret Key Diagnostics ──`);
    console.log(`${logPrefix}   Application ID:           ${apiKeyDoc.applicationId}`);
    console.log(`${logPrefix}   Stored Public Key:        ${apiKeyDoc.publicKey}`);
    console.log(`${logPrefix}   Received Public Key:      ${publicKey}`);
    console.log(`${logPrefix}   Public Key Match:         ${apiKeyDoc.publicKey === publicKey ? 'Yes' : 'No'}`);
    console.log(`${logPrefix}   secretSha256 field:       ${apiKeyDoc.secretSha256 ? `present (${apiKeyDoc.secretSha256.slice(0, 8)}...${apiKeyDoc.secretSha256.slice(-4)})` : '(NULL — legacy record)'}`);
    console.log(`${logPrefix}   secretHash field (legacy):${apiKeyDoc.secretHash  ? `present (${apiKeyDoc.secretHash.slice(0, 8)}...${apiKeyDoc.secretHash.slice(-4)})` : '(NULL)'}`);
    console.log(`${logPrefix}   Resolved Stored Hash:     ${storedHash ? `${storedHash.slice(0, 8)}...${storedHash.slice(-4)} (${storedHash.length} chars)` : '(MISSING — both fields NULL)'}`);
    console.log(`${logPrefix}   Received Secret Length:   ${rawSecret.length} chars`);
    console.log(`${logPrefix}   Received Secret Key:      ${maskSecret(rawSecret)}`);
    console.log(`${logPrefix}   Hash Algorithm:           SHA-256 (hex)`);
    console.log(`${logPrefix}   Computed Incoming Hash:   ${incomingSecretSha256.slice(0, 8)}...${incomingSecretSha256.slice(-4)}`);
    console.log(`${logPrefix}   Secret Key Hash Match:    ${secretMatches ? 'Yes' : 'No'}`);
    console.log(`${logPrefix} ── End Diagnostics ──`);

    if (!secretMatches) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Invalid Secret Key`);
      if (!storedHash) {
        console.warn(`${logPrefix}   CAUSE: Both secretSha256 and secretHash are NULL/UNDEFINED.`);
        console.warn(`${logPrefix}   The key record has no stored hash to compare against.`);
      } else {
        console.warn(`${logPrefix}   CAUSE: SHA-256 of received secret does not match stored hash.`);
        console.warn(`${logPrefix}   Received key may be incorrect or the key was regenerated.`);
      }
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(401).json({
        success: false,
        error: 'INVALID_SECRET_KEY',
        message: 'The supplied Secret API Key is invalid.',
        hint: 'Verify your DDS_SECRET_KEY matches the value shown when the key was created.'
      });
    }

    // ── Inline migration: promote secretHash → secretSha256 if needed ─────────
    // If we succeeded using the legacy secretHash field, atomically write the
    // correct secretSha256 field so future requests use the canonical path.
    if (!apiKeyDoc.secretSha256 && apiKeyDoc.secretHash) {
      ApiKey.findByIdAndUpdate(apiKeyDoc._id, {
        $set:   { secretSha256: storedHash },
        $unset: { secretHash: '' }
      }).catch(() => {});
      console.log(`${logPrefix}   [Migration] Promoted secretHash → secretSha256 for key ${apiKeyDoc._id}`);
    }

    // ── Step 5: Check key revocation status ──────────────────────────────────
    console.log(`${logPrefix} Application Status:    ${apiKeyDoc.status}`);

    if (apiKeyDoc.status !== 'active') {
      console.warn(`${logPrefix} Authentication Result: FAILED — Key Revoked`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(403).json({
        success: false,
        error: 'KEY_REVOKED',
        message: 'This API key has been revoked.',
        hint: 'Generate a new API key from your DDS Developer Dashboard.'
      });
    }

    // ── Step 6: Resolve Application ───────────────────────────────────────────
    const app = await Application.findById(apiKeyDoc.applicationId);

    if (!app) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Application Not Found`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(403).json({
        success: false,
        error: 'APPLICATION_NOT_FOUND',
        message: 'Application Not Found.',
        hint: 'The application linked to this API key no longer exists.'
      });
    }

    // ── Step 6b: Validate Application ID ──────────────────────────
    if (!incomingAppId) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Missing Application ID`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(400).json({
        success: false,
        error: 'INVALID_APP_ID',
        message: 'Application ID is required.',
        hint: 'Verify that your DDS_APP_ID matches the value in your DDS Developer Dashboard.'
      });
    }

    if (incomingAppId !== app.applicationId) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Invalid Application ID ("${incomingAppId}" !== "${app.applicationId}")`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(401).json({
        success: false,
        error: 'INVALID_APP_ID',
        message: 'The supplied Application ID is invalid or does not match the API credentials.',
        hint: 'Verify that your DDS_APP_ID matches the value in your DDS Developer Dashboard.'
      });
    }

    if (app.status !== 'active') {
      console.warn(`${logPrefix} Authentication Result: FAILED — Application Disabled (${app.applicationName})`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(403).json({
        success: false,
        error: 'APPLICATION_DISABLED',
        message: 'Application Disabled.',
        detail: `Application "${app.applicationName}" is currently inactive.`,
        hint: 'Re-enable the application in your DDS Developer Dashboard.'
      });
    }

    // ── Step 7: Resolve Developer ──────────────────────────────────────────────
    const developer = await Developer.findById(apiKeyDoc.developerId);

    if (!developer) {
      console.warn(`${logPrefix} Authentication Result: FAILED — Developer Account Not Found`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(403).json({
        success: false,
        error: 'DEVELOPER_NOT_FOUND',
        message: 'Developer account not found.',
        hint: 'Contact DDS support.'
      });
    }

    if (developer.status !== 'active' || developer.billingStatus === 'overdue') {
      console.warn(`${logPrefix} Authentication Result: FAILED — Developer Account Suspended (${developer.developerId})`);
      console.log(`${logPrefix} ──────────────────────────────────────────────────`);
      return res.status(402).json({
        success: false,
        error: 'PAYMENT_REQUIRED',
        message: 'Your developer account has been suspended due to unpaid invoices. Please complete payment to continue using DDS Authentication.'
      });
    }

    // ── Step 9: Attach context and proceed ────────────────────────────────────
    req.apiClient = { apiKeyDoc, app, developer };

    console.log(`${logPrefix} Authentication Result: SUCCESS`);
    console.log(`${logPrefix}   App:       ${app.applicationName} (${app.applicationId})`);
    console.log(`${logPrefix}   Developer: ${developer.displayName || developer.company} (${developer.developerId})`);
    console.log(`${logPrefix} ──────────────────────────────────────────────────`);

    // Fire-and-forget usage stats update — never blocks the request
    ApiKey.findByIdAndUpdate(apiKeyDoc._id, {
      lastUsedAt: new Date(),
      $inc: { requestCount: 1 }
    }).catch(() => {});

    next();

  } catch (err) {
    console.error(`${logPrefix} Authentication Result: FAILED — Internal Error: ${err.message}`);
    console.log(`${logPrefix} ──────────────────────────────────────────────────`);
    next(err);
  }
};
