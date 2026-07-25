/**
 * ==========================================================================
 * DDS API CONTROLLER — Enterprise Authentication Service
 * ==========================================================================
 *
 * Implements end-to-end authentication request, verification, polling,
 * status checks, cancelation, and usage endpoints for the DDS SDK.
 * ==========================================================================
 */

import crypto from 'crypto';
import VerificationRequest from '../models/requestModel.js';
import User from '../models/userModel.js';
import Application from '../models/applicationModel.js';
import ApiRequestLog from '../models/apiRequestLogModel.js';
import billingService from '../services/billingService.js';
import { generateAuthenticationId, generateSecureRandomBase62 } from '../utils/credentialGenerator.js';

// Secure random digit code generator (4 to 20 digits)
const generateNumericCode = (length = 6) => {
  const len = Math.max(4, Math.min(20, Number(length) || 6));
  let code = '';
  while (code.length < len) {
    const bytes = crypto.randomBytes(4);
    const num = bytes.readUInt32BE(0) % 10;
    code += num.toString();
  }
  return code;
};

// Normalize phone to E.164
const normalizeToE164 = (raw, countryHint = 'IN') => {
  if (!raw) return null;
  let n = String(raw).replace(/[\s\-().]/g, '').trim();
  if (n.startsWith('+')) return n;
  if (n.startsWith('00')) return '+' + n.slice(2);
  if (/^\d{10}$/.test(n)) {
    const defaultCode = countryHint === 'IN' ? '91' : '1';
    return '+' + defaultCode + n;
  }
  if (/^91\d{10}$/.test(n)) return '+' + n;
  return n;
};

// User Agent Parser
const parseUserAgent = (ua = '') => {
  const browser =
    ua.includes('Edg') ? 'Edge' :
    ua.includes('Firefox') ? 'Firefox' :
    ua.includes('Chrome') ? 'Chrome' :
    ua.includes('Safari') ? 'Safari' : 'SDK Client';
  const os =
    ua.includes('Windows') ? 'Windows' :
    ua.includes('Mac') ? 'macOS' :
    ua.includes('Android') ? 'Android' :
    ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' :
    ua.includes('Linux') ? 'Linux' : 'Server';
  return `${browser} on ${os}`;
};

/**
 * POST /api/v1/auth/request
 * Initiates push authentication request for user.
 */
export const requestVerification = async (req, res, next) => {
  const startTime = req.apiClient?.startTime || Date.now();
  try {
    const { app, developer, apiKeyDoc } = req.apiClient;

    const targetUserId = req.body.userId || req.body.ddsUserId;
    const rawPhone = req.body.mobileNumber || req.body.phoneNumber || req.body.phone;
    const countryHint = req.body.country || 'IN';

    if (!targetUserId && !rawPhone) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_IDENTIFIER',
        message: 'Either userId (dds_usr_...) or mobileNumber (+91...) is required.'
      });
    }

    // Resolve user by ddsId or phone
    let user = null;
    if (targetUserId) {
      user = await User.findOne({ ddsId: targetUserId });
    }
    
    if (!user && rawPhone) {
      const e164Phone = normalizeToE164(rawPhone, countryHint);
      if (e164Phone) {
        user = await User.findOne({ phoneNumber: e164Phone });
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'No registered DDS user was found for the provided identifier.'
      });
    }

    // Ensure permanent dds_usr_ User ID exists
    if (!user.ddsId) {
      user.ddsId = `dds_usr_${generateSecureRandomBase62(15)}`;
      await user.save();
    }

    const codeLength = Math.max(4, Math.min(20, Number(req.body.codeLength || app.verificationSettings?.codeLength || 6)));
    const expiresInSeconds = Number(req.body.expiresIn || req.body.expiry || 120);
    const validExpiry = [30, 60, 120, 300, 600].includes(expiresInSeconds) ? expiresInSeconds : 120;

    const authId = generateAuthenticationId(18); // auth_01JXYZ123ABC456DEF
    const expiresAt = new Date(Date.now() + validExpiry * 1000);
    const verificationCode = generateNumericCode(codeLength);

    const device = parseUserAgent(req.headers['user-agent']);
    const location = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-client-location'] || 'Unknown Location';

    const authRequest = new VerificationRequest({
      verificationId: authId,
      ddsId: user.ddsId,
      userPhoneNumber: user.phoneNumber || '',
      verificationCode: crypto.createHash('sha256').update(verificationCode).digest('hex'),
      verificationCodePlain: verificationCode,
      verificationCodeLength: codeLength,
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
      maxAttempts: 'Unlimited',
      webhookUrl: req.body.webhookUrl || app.verificationSettings?.webhookUrl || ''
    });

    await authRequest.save();

    // Increment Usage Counters
    await Application.findByIdAndUpdate(app._id, {
      $inc: { totalRequests: 1, dailyUsage: 1, monthlyUsage: 1, totalUsage: 1 },
      $set: { lastUsed: new Date(), lastRequest: new Date() }
    });

    // Create Audit Log
    const latency = Date.now() - startTime;
    await ApiRequestLog.create({
      developerId: developer._id,
      applicationId: app._id,
      applicationIdStr: app.applicationId,
      apiKeyId: apiKeyDoc._id,
      endpoint: '/api/v1/auth/request',
      method: 'POST',
      authenticationId: authId,
      status: 'SUCCESS',
      cost: 15,
      latency,
      responseTimeMs: latency,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      sdkVersion: req.headers['x-dds-sdk-version'] || '1.0.0',
      verificationCodeLength: codeLength,
      expiry: validExpiry,
      userDecision: 'Pending'
    }).catch(err => console.error('[Audit Log Error]', err.message));

    console.log(`\n==========================================================`);
    console.log(`[DDS Push Auth Pipeline] Authentication Request Created: ${authId}`);
    console.log(`  User Found: ${user.displayName || user.email} (MongoDB _id: ${user._id})`);
    console.log(`  User Mobile Number: ${user.phoneNumber || 'none'}`);
    console.log(`  User DDS ID: ${user.ddsId}`);
    console.log(`  Developer ID: ${developer.developerId || developer._id}`);
    console.log(`  Application: ${app.applicationName} (${app.applicationId})`);
    console.log(`==========================================================\n`);

    // Dispatch real-time Socket event to Mobile App
    const socketPayload = {
      verificationRequestId: authId,
      authenticationId: authId,
      applicationName: app.applicationName,
      clientName: app.applicationName,
      developerName: developer.displayName || developer.company || 'Verified Developer',
      applicationLogo: app.logoUrl || null,
      userPhoneNumber: user.phoneNumber || '',
      verificationCode,
      verificationCodeLength: codeLength,
      expiresAt,
      device,
      location,
      status: 'PENDING'
    };

    const socketHelpers = req.app.get('socketHelpers');
    const io = req.app.get('io');
    let socketSent = false;

    if (socketHelpers) {
      const helperRes = socketHelpers.emitToUser(user._id.toString(), 'verification-request', socketPayload);
      socketHelpers.emitToUser(user._id.toString(), 'authentication_request', socketPayload);
      if (helperRes) socketSent = true;
    }

    if (io) {
      io.to(user._id.toString()).to(user.phoneNumber).to(user.ddsId).emit('verification-request', socketPayload);
      io.to(user._id.toString()).to(user.phoneNumber).to(user.ddsId).emit('authentication_request', socketPayload);
      socketSent = true;
    }

    if (socketSent) {
      console.log(`[DDS Real-Time Socket] Event "authentication_request" & "verification-request" sent to User ${user._id}`);
    } else {
      console.log(`[DDS Real-Time Socket] User ${user._id} appears offline. Request persisted in DB for reconnect sync.`);
    }

    // Dispatch Firebase FCM Push Notification if fcmToken exists
    if (user.fcmToken) {
      console.log(`[DDS Firebase FCM] Token Found: ${user.fcmToken.slice(0, 15)}...`);
      try {
        const { getFirebaseAdmin } = await import('../config/firebase.js');
        const admin = getFirebaseAdmin();
        if (admin && admin.messaging) {
          const pushMessage = {
            token: user.fcmToken,
            notification: {
              title: `Authentication Request from ${app.applicationName}`,
              body: `Verification Code: ${verificationCode}. Tap to approve or reject.`
            },
            data: {
              type: 'authentication_request',
              authenticationId: authId,
              verificationRequestId: authId,
              applicationName: app.applicationName,
              verificationCode: String(verificationCode)
            }
          };
          console.log(`[DDS Firebase FCM] Sending FCM Push Notification...`);
          const fcmRes = await admin.messaging().send(pushMessage);
          console.log(`[DDS Firebase FCM] Push Sent Successfully. FCM Message ID: ${fcmRes}`);
        }
      } catch (fcmError) {
        console.error(`[DDS Firebase FCM] FCM Push Failure Reason: ${fcmError.message}`);
      }
    } else {
      console.log(`[DDS Firebase FCM] No FCM token registered for User ${user._id}.`);
    }

    // Exact Part 8 Success Response Format
    return res.status(200).json({
      success: true,
      authenticationId: authId,
      requestId: authId,
      verificationCode,
      status: 'pending',
      expiresIn: validExpiry
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/verify
 * Verifies code manually against authentication ID.
 */
export const verifyAuthentication = async (req, res, next) => {
  try {
    const { app } = req.apiClient;
    const authId = req.body.authenticationId || req.body.requestId;
    const enteredCode = String(req.body.verificationCode || req.body.enteredCode || '').trim();

    if (!authId || !enteredCode) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'authenticationId and verificationCode are required.'
      });
    }

    const request = await VerificationRequest.findOne({
      verificationId: authId,
      clientId: app.applicationId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'REQUEST_NOT_FOUND',
        message: 'Authentication request not found.'
      });
    }

    if (request.status === 'EXPIRED' || new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
      return res.status(200).json({
        success: false,
        status: 'expired'
      });
    }

    if (request.status === 'REJECTED') {
      return res.status(200).json({
        success: false,
        status: 'rejected'
      });
    }

    const expectedHash = crypto.createHash('sha256').update(enteredCode).digest('hex');
    const matches = (request.verificationCode === expectedHash) || (request.verificationCodePlain === enteredCode);

    if (matches) {
      request.status = 'APPROVED';
      request.approved = true;
      request.enteredCode = enteredCode;
      await request.save();

      return res.status(200).json({
        success: true,
        authenticationId: authId,
        status: 'approved',
        userVerified: true
      });
    } else {
      return res.status(200).json({
        success: false,
        status: 'rejected',
        userVerified: false,
        reason: 'Invalid verification code'
      });
    }

  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/status/:requestId
 * Check request status.
 */
export const checkVerificationStatus = async (req, res, next) => {
  try {
    const { app } = req.apiClient;
    const authId = req.params.requestId || req.params.authenticationId;

    const request = await VerificationRequest.findOne({ verificationId: authId });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'REQUEST_NOT_FOUND',
        message: 'Authentication request not found.'
      });
    }

    if (request.status === 'PENDING' && new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
    }

    const statusLower = request.status.toLowerCase();
    const isApproved = statusLower === 'approved' || request.approved === true;

    console.log(`[DDS Status Poll Audit] Request "${authId}" -> Status: "${request.status}" | Approved: ${isApproved}`);

    if (isApproved) {
      return res.status(200).json({
        success: true,
        authenticationId: authId,
        status: 'approved',
        approved: true,
        enteredCode: request.enteredCode || request.verificationCodePlain
      });
    } else if (statusLower === 'rejected') {
      return res.status(200).json({
        success: false,
        authenticationId: authId,
        status: 'rejected',
        approved: false
      });
    } else if (statusLower === 'expired') {
      return res.status(200).json({
        success: false,
        authenticationId: authId,
        status: 'expired',
        approved: false
      });
    } else if (statusLower === 'cancelled') {
      return res.status(200).json({
        success: false,
        authenticationId: authId,
        status: 'cancelled',
        approved: false
      });
    }

    return res.status(200).json({
      success: true,
      authenticationId: authId,
      status: 'pending',
      approved: false
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/cancel
 * Cancels active pending request.
 */
export const cancelAuthRequest = async (req, res, next) => {
  try {
    const { app } = req.apiClient;
    const authId = req.body.authenticationId || req.body.requestId;

    if (!authId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_AUTHENTICATION_ID',
        message: 'authenticationId is required.'
      });
    }

    const request = await VerificationRequest.findOne({
      verificationId: authId,
      clientId: app.applicationId
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'REQUEST_NOT_FOUND',
        message: 'Authentication request not found.'
      });
    }

    request.status = 'CANCELLED';
    await request.save();

    return res.status(200).json({
      success: true,
      authenticationId: authId,
      status: 'cancelled'
    });

  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/usage
 * Returns application limits and usage stats.
 */
export const getAppUsage = async (req, res, next) => {
  try {
    const { app } = req.apiClient;
    return res.status(200).json({
      success: true,
      applicationId: app.applicationId,
      applicationName: app.applicationName,
      dailyUsage: app.dailyUsage || 0,
      dailyLimit: app.dailyLimit || 1000,
      monthlyUsage: app.monthlyUsage || 0,
      monthlyLimit: app.monthlyLimit || 30000,
      totalRequests: app.totalRequests || 0
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/health
 * Health check endpoint for SDK.
 */
export const getHealthStatus = async (req, res, next) => {
  return res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
};

/**
 * POST /api/v1/auth/approve
 * User app approval.
 */
export const approveAuthRequest = async (req, res, next) => {
  try {
    const requestId = req.body.requestId || req.body.verificationRequestId || req.body.authenticationId;
    const enteredCode = String(req.body.enteredCode || req.body.code || '').trim();

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'requestId is required.' });
    }

    const request = await VerificationRequest.findOne({ verificationId: requestId });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Already in state: ${request.status}` });
    }

    if (new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
      return res.status(400).json({ success: false, message: 'Expired' });
    }

    request.status = 'APPROVED';
    request.approved = true;
    request.approvedAt = new Date();
    request.enteredCode = enteredCode;
    await request.save();

    console.log(`\n==========================================================`);
    console.log(`[DDS API Controller] Authentication Request Approved: ${requestId}`);
    console.log(`  Application: ${request.clientName} (${request.clientId})`);
    console.log(`  Status: APPROVED | Approved At: ${request.approvedAt.toISOString()}`);
    console.log(`==========================================================\n`);

    // Update log
    await ApiRequestLog.findOneAndUpdate(
      { authenticationId: requestId },
      { userDecision: 'Approve', status: 'SUCCESS' }
    ).catch(() => {});

    const socketHelpers = req.app.get('socketHelpers');
    const io = req.app.get('io');
    const statusPayload = {
      authenticationId: requestId,
      verificationRequestId: requestId,
      status: 'approved',
      approved: true,
      developerId: request.clientId,
      applicationId: request.clientId,
      enteredCode
    };

    const user = await User.findOne({ ddsId: request.ddsId });
    if (user && socketHelpers) {
      socketHelpers.emitToUser(user._id.toString(), 'verification-resolved', statusPayload);
      socketHelpers.emitToUser(user._id.toString(), 'verification-approved', statusPayload);
      socketHelpers.emitToUser(user._id.toString(), 'authentication_status_changed', statusPayload);
    }

    if (io) {
      io.to(requestId).to(request.clientId).emit('authentication_status_changed', statusPayload);
      io.to(requestId).to(request.clientId).emit('verification-approved', statusPayload);
    }

    return res.status(200).json({
      success: true,
      authenticationId: request.verificationId,
      status: 'approved',
      approved: true
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/reject
 * User app rejection.
 */
export const rejectAuthRequest = async (req, res, next) => {
  try {
    const requestId = req.body.requestId || req.body.verificationRequestId || req.body.authenticationId;
    if (!requestId) {
      return res.status(400).json({ success: false, message: 'requestId is required.' });
    }

    const request = await VerificationRequest.findOne({ verificationId: requestId });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    request.status = 'REJECTED';
    request.approved = false;
    await request.save();

    await ApiRequestLog.findOneAndUpdate(
      { authenticationId: requestId },
      { userDecision: 'Reject', status: 'FAILED' }
    ).catch(() => {});

    const user = await User.findOne({ ddsId: request.ddsId });
    if (user) {
      const socketHelpers = req.app.get('socketHelpers');
      if (socketHelpers) {
        socketHelpers.emitToUser(user._id.toString(), 'verification-resolved', {
          verificationRequestId: request.verificationId,
          authenticationId: request.verificationId,
          status: 'REJECTED',
          approved: false
        });
      }
    }

    return res.status(200).json({
      success: false,
      authenticationId: request.verificationId,
      status: 'rejected'
    });
  } catch (err) {
    next(err);
  }
};

export const submitVerificationCode = verifyAuthentication;

