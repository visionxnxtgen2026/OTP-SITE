import crypto from 'crypto';
import axios from 'axios';
import Client from '../models/clientModel.js';
import VerificationRequest from '../models/requestModel.js';
import User from '../models/userModel.js';
import Application from '../models/applicationModel.js';
import TrustedDevice from '../models/trustedDeviceModel.js';

// Hash helper for challenge codes
const hashCode = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

// Webhook dispatcher helper (STEP 8 Relay)
const triggerWebhook = async (request, status, enteredCode = '') => {
  let url = request.webhookUrl || null;
  if (!url && request.clientId === 'app_cartify_123') {
    url = 'http://localhost:5001/api/callback';
  }

  const codeToRelay = enteredCode || request.enteredCode || request.verificationCodePlain || '';

  if (url) {
    try {
      await axios.post(url, {
        requestId: request.verificationId,
        approved: status === 'APPROVED',
        enteredCode: codeToRelay,
        status: status === 'APPROVED' ? 'Approved' : 'Rejected'
      }, { timeout: 3000 });
      console.log(`[Webhook] STEP 8 Dispatched callback to ${url}: approved=${status === 'APPROVED'}, enteredCode=${codeToRelay}`);
    } catch (e) {
      console.error(`[Webhook Error] Callback dispatch failed:`, e.message);
    }
  }
};


// Simple User Agent parser for native mobile feel
const parseUserAgent = (uaString) => {
  if (!uaString) return 'Unknown Device';
  
  let browser = 'Other Browser';
  if (uaString.includes('Firefox')) browser = 'Firefox';
  else if (uaString.includes('Chrome')) browser = 'Chrome';
  else if (uaString.includes('Safari')) browser = 'Safari';
  else if (uaString.includes('Edge')) browser = 'Edge';

  let os = 'Unknown OS';
  if (uaString.includes('Windows')) os = 'Windows';
  else if (uaString.includes('Macintosh') || uaString.includes('Mac OS')) os = 'macOS';
  else if (uaString.includes('Android')) os = 'Android';
  else if (uaString.includes('iPhone') || uaString.includes('iPad')) os = 'iOS';
  else if (uaString.includes('Linux')) os = 'Linux';

  return `${browser} on ${os}`;
};

/**
 * Creates a verification request for a phone number
 * POST /api/auth/request-verification (3rd party client endpoint)
 */
export const requestSecureVerification = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const clientSecret = req.headers['x-client-secret'];
    const { clientId, phoneNumber } = req.body;

    if (!apiKey || !clientSecret) {
      return res.status(401).json({ 
        success: false, 
        message: 'API Credentials (x-api-key and x-client-secret) are required.' 
      });
    }

    // 1. Authenticate client application
    const client = await Client.findOne({ apiKey, status: 'active' });
    if (!client || client.clientSecret !== clientSecret) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or revoked client credentials.' 
      });
    }

    if (client.clientId !== clientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client ID mismatch.' 
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target phoneNumber (E.164 format) is required.' 
      });
    }

    // 2. Find target verified user
    const user = await User.findOne({ phoneNumber, mobileVerified: true });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Mobile number not registered or not verified in DDS platform.' 
      });
    }

    // ── Check for active PENDING request ──────────────────────────────────────
    const activeRequest = await VerificationRequest.findOne({
      ddsId: user.ddsId,
      clientId: client.clientId,
      status: 'PENDING',
      expiresAt: { $gt: new Date() }
    });

    if (activeRequest) {
      const socketHelpers = req.app.get('socketHelpers');
      if (socketHelpers) {
        socketHelpers.emitToUser(user._id.toString(), 'verification-request', {
          verificationRequestId: activeRequest.verificationId,
          clientName: client.clientName,
          expiresAt: activeRequest.expiresAt
        });
      }

      return res.status(200).json({
        success: true,
        verificationRequestId: activeRequest.verificationId,
        sixDigitCode: activeRequest.verificationCodePlain || '000000',
        expiresAt: activeRequest.expiresAt
      });
    }

    // 3. Generate secure random 6-digit code
    const rawCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
    const verificationRequestId = crypto.randomUUID();

    // 4. Resolve client device & location metadata
    const userAgent = req.headers['user-agent'] || '';
    const device = parseUserAgent(userAgent);
    const location = req.headers['x-client-location'] || 'India'; // Fallback to local region

    // 5. Store Verification Request with hashed code
    const request = new VerificationRequest({
      verificationId: verificationRequestId,
      ddsId: user.ddsId,
      verificationCode: hashCode(rawCode),
      verificationCodePlain: rawCode,
      expiresAt,
      status: 'PENDING',
      clientName: client.clientName,
      clientId: client.clientId,
      device,
      location
    });
    await request.save();

    // 6. Push real-time event to user's socket room
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers) {
      // NOTE: We DO NOT send the verificationCode to the socket to prevent phishing/leakage!
      // The user must read it on the client application screen and manually type it inside the DDS app.
      socketHelpers.emitToUser(user._id.toString(), 'verification-request', {
        verificationRequestId,
        clientName: client.clientName,
        expiresAt
      });
    }

    res.status(200).json({
      success: true,
      verificationRequestId,
      sixDigitCode: rawCode,
      expiresAt
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Validate challenge code typed inside the DDS app
 * POST /api/auth/verify-code (DDS App endpoint, requires User JWT)
 */
export const verifyApprovalCode = async (req, res, next) => {
  try {
    const { verificationRequestId, code } = req.body;
    const userId = req.user.id;

    if (!verificationRequestId || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'verificationRequestId and 6-digit code are required.' 
      });
    }

    // Find current user to match ddsId
    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.ddsId) {
      return res.status(400).json({ 
        success: false, 
        message: 'DDS Identity not linked or verified.' 
      });
    }

    // Enforce Trusted Device Rule
    const deviceId = req.headers['x-device-id'];
    const trusted = await TrustedDevice.findOne({ userId, trustedDeviceId: deviceId });
    if (!trusted) {
      return res.status(403).json({
        success: false,
        message: 'Untrusted Device: Verification requests can only be processed from your registered trusted mobile device.'
      });
    }

    // Find verification request
    const request = await VerificationRequest.findOne({ verificationId: verificationRequestId });
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'Verification request not found.' 
      });
    }

    // Expiry check
    if (new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
      return res.status(400).json({ 
        success: false, 
        message: 'Verification Request Expired' 
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `This challenge is already resolved (${request.status}).` 
      });
    }

    // Check code match (compare hashes)
    if (hashCode(code) !== request.verificationCode) {
      // Increment attempt counter
      request.attempts = (request.attempts || 0) + 1;

      // Enforce maxAttempts from the verification request document itself
      let maxAttemptsLimit = null;
      if (request.maxAttempts && request.maxAttempts !== 'Unlimited') {
        maxAttemptsLimit = parseInt(request.maxAttempts, 10);
      }

      if (maxAttemptsLimit !== null && request.attempts >= maxAttemptsLimit) {
        // Auto-reject after hitting the limit
        request.status = 'REJECTED';
        await request.save();

        // Notify developer via webhook (fire-and-forget)
        if (request.webhookUrl) {
          axios.post(request.webhookUrl, {
            requestId: request.verificationId,
            status: 'Rejected',
            reason: 'max_attempts_exceeded'
          }, { timeout: 3000 }).catch(() => {});
        } else if (request.clientId === 'app_cartify_123') {
          axios.post('http://localhost:5001/api/callback', {
            requestId: request.verificationId,
            status: 'Rejected',
            reason: 'max_attempts_exceeded'
          }, { timeout: 3000 }).catch(() => {});
        }

        // Notify all sockets for this user
        const socketHelpers = req.app.get('socketHelpers');
        if (socketHelpers) {
          socketHelpers.emitToUser(userId, 'verification-rejected', {
            verificationRequestId: request.verificationId,
            clientName: request.clientName,
            ddsId: request.ddsId,
            status: 'REJECTED',
            reason: 'max_attempts_exceeded',
            resolvedAt: request.updatedAt
          });
        }

        return res.status(400).json({
          success: false,
          error: 'max_attempts_exceeded',
          message: `Maximum verification attempts (${maxAttemptsLimit}) reached. This request has been rejected. Please start a new login.`
        });
      }

      await request.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid Verification Code',
        attemptsUsed: request.attempts,
        ...(maxAttemptsLimit !== null && { attemptsRemaining: Math.max(0, maxAttemptsLimit - request.attempts) })
      });
    }

    // Notify third-party via Socket that user entered code (optional progress signal)
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers) {
      // Emit 'verification-code-entered' status update
      socketHelpers.emitToUser(userId, 'verification-code-entered', {
        verificationRequestId,
        clientName: request.clientName
      });
    }

    res.status(200).json({
      success: true,
      message: 'Code verified successfully.',
      details: {
        clientName: request.clientName,
        location: request.location,
        device: request.device,
        time: request.createdAt
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Approve verification (DDS App endpoint, requires User JWT)
 * POST /api/auth/approve-verification
 */
export const approveSecureVerification = async (req, res, next) => {
  try {
    const { verificationRequestId, code, enteredCode } = req.body;
    const userId = req.user.id;
    const codeVal = enteredCode || code || '';

    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.ddsId) {
      return res.status(400).json({ success: false, message: 'DDS Identity not verified.' });
    }

    // Enforce Trusted Device Rule
    const deviceId = req.headers['x-device-id'];
    const trusted = await TrustedDevice.findOne({ userId, trustedDeviceId: deviceId });
    if (!trusted) {
      return res.status(403).json({
        success: false,
        message: 'Untrusted Device: Verification requests can only be approved from your registered trusted mobile device.'
      });
    }

    const request = await VerificationRequest.findOne({ verificationId: verificationRequestId });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Verification request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Request already resolved (${request.status}).` });
    }

    if (new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
      return res.status(400).json({ success: false, message: 'Verification Request Expired' });
    }

    // Approve & store entered code
    request.status = 'APPROVED';
    request.approved = true;
    if (codeVal) {
      request.enteredCode = codeVal;
    }
    await request.save();

    // ─── Deduct cost & log request for developer metrics ───
    try {
      const Application = (await import('../models/applicationModel.js')).default;
      const Developer = (await import('../models/developerModel.js')).default;
      const ApiRequestLog = (await import('../models/apiRequestLogModel.js')).default;
      const ApiKey = (await import('../models/apiKeyModel.js')).default;
      const billingService = (await import('../services/billingService.js')).billingService;

      const app = await Application.findOne({ applicationId: request.clientId });
      if (app) {
        const developer = await Developer.findById(app.developerId);
        if (developer) {
          // Record usage and charge dynamically (daily 5 free, ₹0.50 beyond)
          const { isFree, cost } = await billingService.recordUsage(developer._id, app._id);

          // Update application success metrics
          await Application.findByIdAndUpdate(app._id, {
            $inc: { successRequests: 1, dailyUsage: 1, monthlyUsage: 1, totalUsage: 1 }
          });

          const activeKey = await ApiKey.findOne({ applicationId: app._id, status: 'active' });

          await ApiRequestLog.create({
            developerId: developer._id,
            applicationId: app._id,
            apiKeyId: activeKey ? activeKey._id : app._id,
            endpoint: '/api/v1/auth/request',
            method: 'POST',
            status: 'SUCCESS',
            cost: cost, // in paise
            responseTimeMs: 80,
            ipAddress: req.ip || '127.0.0.1'
          });
        }
      }
    } catch (err) {
      console.error('[Billing/Logging Error]', err.message);
    }

    // Broadcast success instantly over socket
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers) {
      socketHelpers.emitToUser(userId, 'verification-approved', {
        verificationRequestId: request.verificationId,
        clientName: request.clientName,
        ddsId: request.ddsId,
        status: 'APPROVED',
        approved: true,
        enteredCode: request.enteredCode || codeVal,
        resolvedAt: request.updatedAt
      });
    }

    // Trigger Webhook Callback (STEP 8 Relay)
    await triggerWebhook(request, 'APPROVED', request.enteredCode || codeVal);

    res.status(200).json({
      success: true,
      message: 'Verification request approved successfully.',
      status: 'APPROVED',
      approved: true,
      enteredCode: request.enteredCode || codeVal
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Reject verification (DDS App endpoint, requires User JWT)
 * POST /api/auth/reject-verification
 */
export const rejectSecureVerification = async (req, res, next) => {
  try {
    const { verificationRequestId } = req.body;
    const userId = req.user.id;

    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.ddsId) {
      return res.status(400).json({ success: false, message: 'DDS Identity not verified.' });
    }

    // Enforce Trusted Device Rule
    const deviceId = req.headers['x-device-id'];
    const trusted = await TrustedDevice.findOne({ userId, trustedDeviceId: deviceId });
    if (!trusted) {
      return res.status(403).json({
        success: false,
        message: 'Untrusted Device: Verification requests can only be rejected from your registered trusted mobile device.'
      });
    }

    const request = await VerificationRequest.findOne({ verificationId: verificationRequestId });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Verification request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Request already resolved (${request.status}).` });
    }

    // Reject
    request.status = 'REJECTED';
    await request.save();

    // Log failed request
    try {
      const Application = (await import('../models/applicationModel.js')).default;
      const Developer = (await import('../models/developerModel.js')).default;
      const ApiRequestLog = (await import('../models/apiRequestLogModel.js')).default;
      const ApiKey = (await import('../models/apiKeyModel.js')).default;

      const app = await Application.findOne({ applicationId: request.clientId });
      if (app) {
        app.totalRequests = (app.totalRequests || 0) + 1;
        app.failedRequests = (app.failedRequests || 0) + 1;
        await app.save();

        const developer = await Developer.findById(app.developerId);
        const activeKey = await ApiKey.findOne({ applicationId: app._id, status: 'active' });

        await ApiRequestLog.create({
          developerId: developer ? developer._id : app.developerId,
          applicationId: app._id,
          apiKeyId: activeKey ? activeKey._id : app._id,
          endpoint: '/api/v1/auth/request',
          method: 'POST',
          status: 'FAILED',
          cost: 0,
          responseTimeMs: 65,
          ipAddress: req.ip || '127.0.0.1'
        });
      }
    } catch (err) {
      console.error('[Logging Error]', err.message);
    }

    // Broadcast rejection instantly over socket
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers) {
      socketHelpers.emitToUser(userId, 'verification-rejected', {
        verificationRequestId: request.verificationId,
        clientName: request.clientName,
        ddsId: request.ddsId,
        status: 'REJECTED',
        resolvedAt: request.updatedAt
      });
    }

    // Trigger Webhook Callback
    await triggerWebhook(request, 'REJECTED');

    res.status(200).json({
      success: true,
      message: 'Verification request rejected successfully.',
      status: 'REJECTED'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Returns verification status to third-party clients
 * GET /api/auth/status/:verificationRequestId
 */
export const checkSecureVerificationStatus = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const clientSecret = req.headers['x-client-secret'];
    const { verificationRequestId } = req.params;

    if (!apiKey || !clientSecret) {
      return res.status(401).json({ 
        success: false, 
        message: 'API Credentials are required.' 
      });
    }

    // Authenticate client
    const client = await Client.findOne({ apiKey, status: 'active' });
    if (!client || client.clientSecret !== clientSecret) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid API Client credentials.' 
      });
    }

    // Fetch Request
    const request = await VerificationRequest.findOne({ 
      verificationId: verificationRequestId,
      clientId: client.clientId 
    });
    if (!request) {
      return res.status(404).json({ 
        success: false, 
        message: 'Verification request not found.' 
      });
    }

    // Expiry check
    if (request.status === 'PENDING' && new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
    }

    res.status(200).json({
      success: true,
      verificationRequestId: request.verificationId,
      status: request.status,
      resolvedAt: request.updatedAt
    });

  } catch (error) {
    next(error);
  }
};
