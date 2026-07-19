/**
 * ==========================================================================
 * DDS API CONTROLLER — v2
 * ==========================================================================
 *
 * Handles third-party developer authentication requests.
 * All application/developer resolution is done by resolveApiKey middleware.
 * This controller ONLY handles business logic.
 * ==========================================================================
 */

import crypto from 'crypto';
import VerificationRequest from '../models/requestModel.js';
import User from '../models/userModel.js';
import billingService from '../services/billingService.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const hashCode = (code) =>
  crypto.createHash('sha256').update(code).digest('hex');

/**
 * Generates a cryptographically secure random numeric string of `length` digits.
 * Uses rejection sampling on crypto.randomBytes to ensure perfectly uniform
 * distribution — never biased toward lower values like Math.random() would be.
 *
 * @param {number} length  Number of digits (e.g. 6, 8, 12, 20)
 * @returns {string}       Zero-padded numeric string of exactly `length` digits
 */
const secureRandomDigits = (length) => {
  // We need a number in [0, 10^length). Work byte-by-byte until the
  // drawn value falls within the bias-free range (rejection sampling).
  const max = BigInt(10) ** BigInt(length); // exclusive upper bound
  const byteLen = Math.ceil(length * Math.log2(10) / 8) + 2; // generous headroom

  let value;
  do {
    const buf = crypto.randomBytes(byteLen);
    // Interpret the buffer as an unsigned big-endian integer
    value = BigInt('0x' + buf.toString('hex'));
  } while (value >= (BigInt(2) ** BigInt(byteLen * 8) / max) * max);
  // rejection sampling: re-draw if in the bias-inducing tail

  // Convert to decimal and zero-pad to exactly `length` digits
  return (value % max).toString().padStart(length, '0');
};

/**
 * Normalize any phone input to E.164 format.
 *
 * Handles:
 *   "8637628773"       → "+918637628773"  (10-digit, assumed India)
 *   "918637628773"     → "+918637628773"  (12-digit with 91 prefix)
 *   "+91 8637 628 773" → "+918637628773"
 *   "+1 415 555 2671"  → "+14155552671"
 */
const normalizeToE164 = (raw, countryHint = 'IN') => {
  if (!raw) return null;

  // Strip whitespace, dashes, parentheses
  let n = String(raw).replace(/[\s\-().]/g, '').trim();

  if (n.startsWith('+'))   return n;         // Already E.164
  if (n.startsWith('00'))  return '+' + n.slice(2); // 00-prefixed international

  // 10-digit — apply country hint
  if (/^\d{10}$/.test(n)) {
    const defaultCode = countryHint === 'IN' ? '91' : '1';
    return '+' + defaultCode + n;
  }

  // 12-digit starting with 91 (India, no +)
  if (/^91\d{10}$/.test(n)) return '+' + n;

  return n; // Return as-is and let validation catch it
};

const parseUserAgent = (ua = '') => {
  const browser =
    ua.includes('Edg') ? 'Edge' :
    ua.includes('Firefox') ? 'Firefox' :
    ua.includes('Chrome') ? 'Chrome' :
    ua.includes('Safari') ? 'Safari' : 'Unknown Browser';

  const os =
    ua.includes('Windows') ? 'Windows' :
    ua.includes('Mac') ? 'macOS' :
    ua.includes('Android') ? 'Android' :
    ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' :
    ua.includes('Linux') ? 'Linux' : 'Unknown OS';

  return `${browser} on ${os}`;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/request
 *
 * Trigger a DDS authentication request for a user.
 * Called from the developer's backend server — never from client-side code.
 *
 * Required header:
 *   Authorization: Bearer dds_sk_xxx
 *
 * Required body:
 *   { "phoneNumber": "+918637628773" }
 *
 * Optional:
 *   { "phoneNumber": "8637628773", "country": "IN" }
 */
/**
 * POST /api/v1/auth/request
 * POST /api/auth/request
 *
 * STEP 2: Developer Backend sends authentication request to DDS.
 * DDS validates credentials, locates user by phone, creates request record,
 * and immediately sends Push Notification / Popup to user's DDS App.
 *
 * NO verification code exists at this stage — code is generated ONLY by Developer Backend (Step 4).
 */
export const requestVerification = async (req, res, next) => {
  try {
    // req.apiClient is injected by resolveApiKey middleware
    const { app, developer } = req.apiClient;

    // ── Extract and normalize phone number ────────────────────────────────────
    const rawPhone = req.body.phone || req.body.phoneNumber || req.body.mobileNumber;
    const countryHint = req.body.country || 'IN';

    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PHONE_NUMBER',
        message: 'phone is required.',
        example: { phone: '+919876543210' }
      });
    }

    const e164Phone = normalizeToE164(rawPhone, countryHint);

    if (!e164Phone || !/^\+\d{7,15}$/.test(e164Phone)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PHONE_NUMBER',
        message: `"${rawPhone}" could not be normalized to a valid E.164 phone number.`,
        normalized: e164Phone,
        hint: 'Provide the number in E.164 format: +919876543210'
      });
    }

    // ── Resolve DDS user from phone number ────────────────────────────────────
    const user = await User.findOne({ phoneNumber: e164Phone, mobileVerified: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: `No verified DDS user found for ${e164Phone}.`,
        hint: 'The user must have a verified DDS account to authenticate via your application.'
      });
    }

    // ── Resolve / auto-generate ddsId ─────────────────────────────────────────
    let ddsId = user.ddsId;
    if (!ddsId) {
      ddsId = `dds_${crypto.randomBytes(8).toString('hex')}`;
      user.ddsId = ddsId;
      await user.save();
      console.log(`[DDS] Auto-generated ddsId for user ${user._id}: ${ddsId}`);
    }

    const expirySeconds = Number(req.body.expiresIn) || Number(req.body.expiry) || 300;
    const duplicateProtect = req.body.duplicateProtection !== false; // default true
    const dupDelay = Number(req.body.duplicateRequestDelay) || 60; // seconds
    const maxAttempts = req.body.maxAttempts || 'Unlimited';
    const webhookUrl = req.body.webhookUrl || req.body.callbackUrl || '';

    const allowedAttempts = ['3', '5', '10', 'Unlimited'];
    if (!allowedAttempts.includes(String(maxAttempts))) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_MAX_ATTEMPTS',
        message: `maxAttempts must be one of: ${allowedAttempts.join(', ')}`
      });
    }

    // ── Check if user is online FIRST ──────────────────────────────────────────
    const socketHelpers = req.app.get('socketHelpers');
    const mongoUserId = user._id.toString();
    const isOnline = socketHelpers ? socketHelpers.getOnlineUserIds().includes(mongoUserId) : false;

    if (!isOnline) {
      return res.status(422).json({
        success: false,
        error: 'USER_OFFLINE',
        message: 'DDS Mobile App is offline. Please open the app and try again.'
      });
    }

    // ── Check for active PENDING request (Duplicate Protection) ───────────────
    if (duplicateProtect) {
      const activeRequest = await VerificationRequest.findOne({
        ddsId,
        clientId: app.applicationId,
        status: 'PENDING',
        expiresAt: { $gt: new Date() }
      });

      if (activeRequest) {
        console.log(`[DDS] Returning existing PENDING request: ${activeRequest.verificationId} for ${ddsId}`);

        const codeStr = activeRequest.verificationCodePlain || '000000';

        // Emit push popup again asynchronously
        setImmediate(() => {
          if (socketHelpers) {
            socketHelpers.emitToUser(mongoUserId, 'verification-request', {
              verificationRequestId: activeRequest.verificationId,
              applicationName: app.applicationName,
              clientName: app.applicationName,
              developerName: developer.company || developer.displayName || 'Verified DDS Developer',
              applicationLogo: app.logoUrl || null,
              userPhoneNumber: e164Phone,
              popupDelivered: true,
              codeSubmitted: true,
              verificationCode: codeStr,
              verificationCodeLength: 6,
              expiresAt: activeRequest.expiresAt,
              device: activeRequest.device,
              location: activeRequest.location
            });
          }
        });

        return res.status(200).json({
          success: true,
          requestId: activeRequest.verificationId,
          verificationCode: codeStr,
          popupDelivered: true,
          codeSubmitted: true,
          expiresIn: Math.max(0, Math.floor((new Date(activeRequest.expiresAt).getTime() - Date.now()) / 1000)),
          expiresAt: activeRequest.expiresAt,
          userOnline: true
        });
      }
    } else {
      const delayCutoff = new Date(Date.now() - dupDelay * 1000);
      const recentRequest = await VerificationRequest.findOne({
        ddsId,
        clientId: app.applicationId,
        createdAt: { $gte: delayCutoff }
      });

      if (recentRequest) {
        return res.status(429).json({
          success: false,
          error: 'DUPLICATE_REQUEST',
          message: `A verification request was already created for this user within the last ${dupDelay} seconds.`,
          retryAfter: Math.ceil((recentRequest.createdAt.getTime() + dupDelay * 1000 - Date.now()) / 1000)
        });
      }
    }

    // ── Billing Limit Check ───────────────────────────────────────────────────
    const Application = (await import('../models/applicationModel.js')).default;

    const freshApp = await Application.findById(app._id);
    if (!freshApp) {
      return res.status(404).json({
        success: false,
        error: 'APPLICATION_NOT_FOUND',
        message: 'Application not found.'
      });
    }

    // ── Create Request (Server generates code here!) ──────────────────────────
    const requestId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);
    const verificationCode = String(crypto.randomInt(100000, 1000000));

    const hashCode = (code) => {
      return crypto.createHash('sha256').update(code).digest('hex');
    };

    const device = parseUserAgent(req.headers['user-agent']);
    const location = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-client-location']
      || 'Unknown';

    const request = new VerificationRequest({
      verificationId: requestId,
      ddsId,
      userPhoneNumber: e164Phone,
      verificationCode: hashCode(verificationCode),
      verificationCodePlain: verificationCode,
      verificationCodeLength: 6,
      expiresAt,
      status: 'PENDING',
      popupDelivered: true,
      popupDeliveredAt: new Date(),
      codeSubmitted: true,
      codeSubmittedAt: new Date(),
      clientName: app.applicationName,
      clientId: app.applicationId,
      device,
      location,
      maxAttempts,
      webhookUrl
    });
    await request.save();

    // ── Update Billing Counter and Logs ──────────────────────────────────────
    try {
      await Application.findByIdAndUpdate(freshApp._id, {
        $inc: { totalRequests: 1 }
      });
      console.log(`[Billing System] Request initialized: incremented totalRequests for App ID: ${freshApp.applicationId}`);
    } catch (billError) {
      console.error('[Billing System] Failed to update request count:', billError.message);
    }

    // Return response immediately so Website receives code and switches screens first
    res.status(200).json({
      success: true,
      requestId,
      verificationCode,
      popupDelivered: true,
      popupDeliveredAt: request.popupDeliveredAt,
      expiresIn: expirySeconds,
      expiresAt,
      userOnline: true
    });

    // Push real-time popup to user's DDS mobile app asynchronously
    setImmediate(() => {
      if (socketHelpers) {
        socketHelpers.emitToUser(mongoUserId, 'verification-request', {
          verificationRequestId: requestId,
          applicationName: app.applicationName,
          clientName: app.applicationName,
          developerName: developer.company || developer.displayName || 'Verified DDS Developer',
          applicationLogo: app.logoUrl || null,
          userPhoneNumber: e164Phone,
          popupDelivered: true,
          codeSubmitted: true,
          verificationCode,
          verificationCodeLength: 6,
          expiresAt,
          device,
          location
        });
        console.log(`[DDS Auth] ✅ Push notification dispatched asynchronously: RequestId=${requestId}`);
      }
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/code
 * POST /api/auth/code
 *
 * STEP 5: Developer Backend sends the generated verification code to DDS.
 *
 * Body:
 * {
 *   "requestId": "...",
 *   "verificationCode": "821649"
 * }
 *
 * Allowed lengths: 4, 5, 6, 8, 10, 12, 16, 20 digits.
 * DDS stores code securely and pushes real-time event to DDS mobile app (Step 7).
 */
export const submitVerificationCode = async (req, res, next) => {
  try {
    const { app } = req.apiClient;
    const { requestId, verificationCode } = req.body;

    if (!requestId || !verificationCode) {
      return res.status(400).json({
        success: false,
        error: 'missing_parameters',
        message: 'requestId and verificationCode are required.',
        example: { requestId: '...', verificationCode: '821649' }
      });
    }

    const codeStr = String(verificationCode).trim();
    const allowedLengths = [4, 5, 6, 8, 10, 12, 16, 20];
    if (!allowedLengths.includes(codeStr.length) || !/^\d+$/.test(codeStr)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_verification_code',
        message: `verificationCode must be a numeric string of length: ${allowedLengths.join(', ')}.`
      });
    }

    const request = await VerificationRequest.findOne({
      verificationId: requestId,
      clientId: app.applicationId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'request_not_found',
        message: 'Verification request not found or unauthorized.'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'invalid_request_status',
        message: `Cannot attach code to a request in state: ${request.status}.`
      });
    }

    if (new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
      return res.status(400).json({
        success: false,
        error: 'request_expired',
        message: 'Verification request has expired.'
      });
    }

    // Update request with code
    request.verificationCode = hashCode(codeStr);
    request.verificationCodePlain = codeStr;
    request.verificationCodeLength = codeStr.length;
    request.codeSubmitted = true;
    request.codeSubmittedAt = new Date();
    await request.save();

    // Find user to emit real-time socket event to DDS Mobile App (Step 7)
    const user = await User.findOne({ ddsId: request.ddsId });
    if (user) {
      const socketHelpers = req.app.get('socketHelpers');
      if (socketHelpers) {
        socketHelpers.emitToUser(user._id.toString(), 'verification-code-attached', {
          verificationRequestId: request.verificationId,
          verificationCode: codeStr,
          verificationCodeLength: codeStr.length,
          applicationName: request.clientName,
          expiresAt: request.expiresAt
        });
        console.log(`[DDS Auth] ✅ Step 5/7: Code attached and pushed to user socket`);
      }
    }

    return res.status(200).json({
      success: true,
      requestId: request.verificationId,
      codeStored: true,
      verificationCodeLength: codeStr.length,
      expiresAt: request.expiresAt
    });

  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/status/:requestId
 * GET /api/auth/status/:requestId
 *
 * STEP 8: Poll for verification status.
 * Returns approval result AND user-entered code for developer verification.
 */
export const checkVerificationStatus = async (req, res, next) => {
  try {
    const { app } = req.apiClient;
    const { requestId } = req.params;

    const request = await VerificationRequest.findOne({
      verificationId: requestId,
      clientId: app.applicationId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'request_not_found',
        message: 'Verification request not found or does not belong to this application.'
      });
    }

    // Auto-expire stale pending requests
    if (request.status === 'PENDING' && new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
    }

    return res.status(200).json({
      success: true,
      requestId: request.verificationId,
      pending: request.status === 'PENDING',
      status: request.status,          // PENDING | APPROVED | REJECTED | EXPIRED
      approved: request.status === 'APPROVED',
      enteredCode: request.enteredCode || '',
      ddsId: request.ddsId,
      resolvedAt: request.updatedAt
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/approve
 *
 * User approves request inside DDS User Application.
 * Saves entered code and sets status to APPROVED.
 */
export const approveAuthRequest = async (req, res, next) => {
  try {
    const requestId = req.body.requestId || req.body.verificationRequestId;
    const enteredCode = String(req.body.enteredCode || req.body.code || '').trim();

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'missing_request_id',
        message: 'requestId is required.'
      });
    }

    const request = await VerificationRequest.findOne({ verificationId: requestId });
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'request_not_found',
        message: 'Authentication request not found.'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'request_already_resolved',
        message: `Request is already in state: ${request.status}`
      });
    }

    if (new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
      return res.status(400).json({
        success: false,
        error: 'request_expired',
        message: 'Authentication request has expired.'
      });
    }

    request.status = 'APPROVED';
    request.approved = true;
    request.enteredCode = enteredCode;
    await request.save();

    // Record usage since this is a successful authentication request
    try {
      const Application = (await import('../models/applicationModel.js')).default;
      const billingService = (await import('../services/billingService.js')).billingService;
      
      const app = await Application.findOne({ applicationId: request.clientId });
      if (app) {
        await billingService.recordUsage(app.developerId, app._id);
        
        // Increment application success counters
        await Application.findByIdAndUpdate(app._id, {
          $inc: { successRequests: 1, dailyUsage: 1, monthlyUsage: 1, totalUsage: 1 }
        });
      }
    } catch (billErr) {
      console.error('[Billing System] Failed to record usage on approval:', billErr.message);
    }

    const user = await User.findOne({ ddsId: request.ddsId });
    if (user) {
      const socketHelpers = req.app.get('socketHelpers');
      if (socketHelpers) {
        socketHelpers.emitToUser(user._id.toString(), 'verification-resolved', {
          verificationRequestId: request.verificationId,
          status: 'APPROVED',
          approved: true,
          enteredCode
        });
      }
    }

    return res.status(200).json({
      success: true,
      requestId: request.verificationId,
      status: 'Approved',
      approved: true,
      enteredCode
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/reject
 *
 * User rejects request inside DDS User Application.
 */
export const rejectAuthRequest = async (req, res, next) => {
  try {
    const requestId = req.body.requestId || req.body.verificationRequestId;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'missing_request_id',
        message: 'requestId is required.'
      });
    }

    const request = await VerificationRequest.findOne({ verificationId: requestId });
    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'request_not_found',
        message: 'Authentication request not found.'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'request_already_resolved',
        message: `Request is already in state: ${request.status}`
      });
    }

    request.status = 'REJECTED';
    request.approved = false;
    await request.save();

    const user = await User.findOne({ ddsId: request.ddsId });
    if (user) {
      const socketHelpers = req.app.get('socketHelpers');
      if (socketHelpers) {
        socketHelpers.emitToUser(user._id.toString(), 'verification-resolved', {
          verificationRequestId: request.verificationId,
          status: 'REJECTED',
          approved: false
        });
      }
    }

    return res.status(200).json({
      success: true,
      requestId: request.verificationId,
      status: 'Rejected',
      approved: false
    });
  } catch (err) {
    next(err);
  }
};
