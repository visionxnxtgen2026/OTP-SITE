import axios from 'axios';
import { getFirebaseAdmin } from '../config/firebase.js';
import User from '../models/userModel.js';
import VerificationRequest from '../models/requestModel.js';
import Client from '../models/clientModel.js';
import Developer from '../models/developerModel.js';
import Application from '../models/applicationModel.js';
import ApiKey from '../models/apiKeyModel.js';
import { Billing, WalletTransaction } from '../models/billingModel.js';
import ApiRequestLog from '../models/apiRequestLogModel.js';
import TrustedDevice from '../models/trustedDeviceModel.js';
import DeleteAccountSession from '../models/deleteAccountSessionModel.js';
import Configuration from '../models/configModel.js';

/**
 * Link and verify mobile number for current logged in user
 * POST /api/user/verify-phone
 */
export const verifyPhone = async (req, res, next) => {
  try {
    const { phoneToken, countryCode, countryISO, countryName, phoneNumber } = req.body;
    const userId = req.user.id;
    const deviceId = req.headers['x-device-id'] || req.body.deviceId;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'Device ID (x-device-id) is required to authenticate this device.' });
    }

    if (!phoneToken) {
      return res.status(400).json({ success: false, message: 'Firebase Phone ID token is required.' });
    }

    // 1. Resolve Firebase Admin SDK
    let admin;
    try {
      admin = getFirebaseAdmin();
    } catch (err) {
      console.error('[User Controller] Firebase Admin error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Firebase Admin SDK is not configured on the server. Unable to complete verification.'
      });
    }

    // 2. Verify Phone ID Token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(phoneToken);
    } catch (err) {
      console.error('[User Controller] Phone Token Verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired phone verification code. Please retry.'
      });
    }

    const { phone_number } = decodedToken;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Invalid authentication context. Phone number could not be extracted.'
      });
    }

    // Security Check: Match requested phoneNumber with verified token phone number
    if (phoneNumber && phone_number !== phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Security Mismatch: The requested phone number does not match the verified Firebase credential.'
      });
    }

    // 3. Uniqueness Check in MongoDB
    const duplicateUser = await User.findOne({ 
      phoneNumber: phone_number, 
      mobileVerified: true,
      _id: { $ne: userId } // Not the current user
    });

    if (duplicateUser) {
      return res.status(400).json({
        success: false,
        message: 'This mobile number is already linked and verified on another DDS account. Please use a different number.'
      });
    }

    // 4. Update the user account in MongoDB
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    user.phoneNumber = phone_number;
    user.countryCode = countryCode || phone_number.slice(0, phone_number.length - 10);
    user.countryISO = countryISO || '';
    user.countryName = countryName || '';
    
    // Generate permanent, unique DDS ID (e.g. DDS_IN_919876543210)
    const cleanNum = phone_number.replace('+', '');
    const cleanIso = (countryISO || 'UN').toUpperCase();
    user.ddsId = `DDS_${cleanIso}_${cleanNum}`;
    
    user.mobileVerified = true;
    user.phoneVerifiedAt = new Date();
    await user.save();

    // 5. Establish Trusted Device status
    // Invalidate previous trusted device session(s) to enforce a single active trusted device at a time.
    await TrustedDevice.deleteMany({ userId });

    // Create the new trusted device record
    await TrustedDevice.create({
      userId,
      firebaseUid: user.firebaseUid,
      phoneNumber: user.phoneNumber,
      trustedDeviceId: deviceId,
      deviceFingerprint: req.headers['user-agent'] || 'web-browser',
      verifiedAt: new Date(),
      lastSeen: new Date()
    });

    // 6. Emit socket event instantly to update client UI
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers) {
      socketHelpers.emitToUser(userId, 'mobile-verified', {
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        countryISO: user.countryISO,
        countryName: user.countryName,
        ddsId: user.ddsId,
        mobileVerified: true,
        verifiedAt: user.phoneVerifiedAt
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mobile number successfully verified and linked.',
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        countryISO: user.countryISO,
        countryName: user.countryName,
        ddsId: user.ddsId,
        mobileVerified: user.mobileVerified,
        role: user.role,
        preferences: user.preferences
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/user/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-__v');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    // Check if the current device is the trusted device
    const deviceId = req.headers['x-device-id'] || req.query.deviceId;
    const trusted = await TrustedDevice.findOne({ userId: user._id, trustedDeviceId: deviceId });
    
    const userObj = user.toObject();
    if (userObj.mobileVerified && !trusted) {
      userObj.mobileVerified = false;
    }
    
    res.status(200).json({
      success: true,
      user: userObj
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user settings and preferences
 * PATCH /api/user/settings
 */
export const updateSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { displayName, photoURL, preferences } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Apply updates
    if (displayName !== undefined) user.displayName = displayName;
    if (photoURL !== undefined) user.photoURL = photoURL;
    
    if (preferences) {
      if (preferences.language !== undefined) user.preferences.language = preferences.language;
      if (preferences.theme !== undefined) user.preferences.theme = preferences.theme;
      if (preferences.notifications !== undefined) user.preferences.notifications = preferences.notifications;
    }

    await user.save();

    // Trigger instant UI updates over WebSocket
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers) {
      socketHelpers.emitToUser(userId, 'profile-updated', {
        displayName: user.displayName,
        photoURL: user.photoURL,
        preferences: user.preferences
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile and preferences successfully updated.',
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        mobileVerified: user.mobileVerified,
        role: user.role,
        preferences: user.preferences
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Approve a pending third-party verification request
 * POST /api/user/verification-requests/:verificationId/approve
 */
export const approveVerification = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const userId = req.user.id;

    // 1. Fetch current user to verify they have a ddsId
    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.ddsId) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must link and verify a mobile number to generate a DDS Identity first.' 
      });
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

    // 2. Fetch target request and validate PENDING state
    const request = await VerificationRequest.findOne({ verificationId });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Verification request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `This request has already been resolved (${request.status}).` 
      });
    }

    // 3. Confirm target ddsId matches the user ddsId
    if (request.ddsId !== currentUser.ddsId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Authorization Mismatch: You cannot approve verification challenges meant for another DDS ID.' 
      });
    }

    // 4. Expiry check
    if (new Date() > request.expiresAt) {
      request.status = 'EXPIRED';
      await request.save();
      return res.status(400).json({ success: false, message: 'Verification request has expired.' });
    }

    // 5. Update Status
    request.status = 'APPROVED';
    await request.save();

    // 6. Broadcast Real-time socket updates
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers) {
      socketHelpers.emitToUser(userId, 'verification-approved', {
        verificationId: request.verificationId,
        clientName: request.clientName,
        ddsId: request.ddsId,
        resolvedAt: request.updatedAt
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification request approved successfully.',
      request
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Reject a pending third-party verification request
 * POST /api/user/verification-requests/:verificationId/reject
 */
export const rejectVerification = async (req, res, next) => {
  try {
    const { verificationId } = req.params;
    const userId = req.user.id;

    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.ddsId) {
      return res.status(400).json({ success: false, message: 'You must verify a mobile number first.' });
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

    const request = await VerificationRequest.findOne({ verificationId });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Verification request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `This request is already resolved (${request.status}).` 
      });
    }

    if (request.ddsId !== currentUser.ddsId) {
      return res.status(403).json({ success: false, message: 'Authorization Mismatch.' });
    }

    // Update Status
    request.status = 'REJECTED';
    await request.save();

    // Broadcast Real-time socket updates
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers) {
      socketHelpers.emitToUser(userId, 'verification-rejected', {
        verificationId: request.verificationId,
        clientName: request.clientName,
        ddsId: request.ddsId,
        resolvedAt: request.updatedAt
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification request rejected successfully.',
      request
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get verification requests log history for current user
 * GET /api/user/verification-history
 */
export const getVerificationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!currentUser.ddsId) {
      return res.status(200).json({ success: true, history: [] });
    }

    // Fetch and sort descending
    const history = await VerificationRequest.find({ ddsId: currentUser.ddsId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      history
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve database metrics for admin dashboard
 * GET /api/user/admin-stats
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ mobileVerified: true });
    const clientApps = await Client.countDocuments();
    const verificationRequests = await VerificationRequest.countDocuments();
    
    // Fetch registered clients to show in dashboard (includes seeded test client!)
    const clients = await Client.find({}).select('-clientSecret');

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        pendingVerifications: totalUsers - verifiedUsers,
        clientApps,
        verificationRequests
      },
      clients
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Permanently delete the authenticated user's account and all associated data.
 * DELETE /api/user/account
 *
 * Steps performed (in order):
 *  1. Verify caller via DDS JWT (already done by `protect` middleware)
 *  2. Verify the fresh Firebase ID token supplied in the request body
 *     (re-authentication guard — prevents stale-session deletions)
 *  3. Disconnect all active Socket.IO connections for this user
 *  4. Cancel every PENDING verification request and notify developer apps
 *  5. Delete the Firebase Authentication account via Admin SDK
 *  6. Delete all MongoDB records (user, verification, developer, billing, logs)
 *  7. Return 200 so the client can clear local state and redirect
 */
export const deleteUserAccount = async (req, res, next) => {
  const userId = req.user?.id;

  try {
    // ── 1. Load the user record ───────────────────────────────────────────────
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Enforce OTP Verification Session Check
    const deleteSession = await DeleteAccountSession.findOne({ userId });
    if (!deleteSession || !deleteSession.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Security Verification Required: You must verify your linked mobile number before deleting your account.'
      });
    }

    // Check expiration of the OTP verification (15 minutes)
    const verificationAgeMs = Date.now() - new Date(deleteSession.verifiedAt).getTime();
    if (verificationAgeMs > 15 * 60 * 1000) {
      return res.status(403).json({
        success: false,
        message: 'Security Verification Expired: Mobile OTP verification has expired. Please verify again.'
      });
    }

    // ── 2. Re-authentication guard ───────────────────────────────────────────
    // The client must pass a freshly obtained Firebase ID token so we can
    // confirm the user just re-authenticated. This prevents stale-JWT deletions.
    const firebaseIdToken = req.body.firebaseIdToken || req.body.idToken;
    if (!firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: 'A fresh Firebase ID token is required to delete your account.'
      });
    }

    let admin;
    try {
      admin = getFirebaseAdmin();
    } catch (err) {
      return res.status(503).json({
        success: false,
        message: 'Firebase Admin SDK is not available. Please try again later.'
      });
    }

    // Verify the token is valid and was issued recently (checkRevoked = true)
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(firebaseIdToken, true);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Re-authentication failed. Please sign in again before deleting your account.'
      });
    }

    // Confirm the token belongs to the same Firebase user as this account
    if (decoded.uid !== user.firebaseUid) {
      return res.status(403).json({
        success: false,
        message: 'Token mismatch. The supplied credentials do not match this account.'
      });
    }

    // ── 3. Disconnect all active Socket.IO sessions ──────────────────────────
    try {
      const socketHelpers = req.app.get('socketHelpers');
      if (socketHelpers) {
        socketHelpers.forceLogoutUser(userId, 'Account deleted permanently.');
      }
    } catch (socketErr) {
      console.error('[DeleteAccount] Socket disconnect error:', socketErr.message);
      // Non-fatal — continue with deletion
    }

    // ── 4. Cancel all PENDING verification requests & notify developer apps ──
    try {
      const pendingRequests = await VerificationRequest.find({
        ddsId: user.ddsId,
        status: 'PENDING'
      });

      if (pendingRequests.length > 0) {
        await VerificationRequest.updateMany(
          { ddsId: user.ddsId, status: 'PENDING' },
          { $set: { status: 'CANCELLED' } }
        );

        // Fire-and-forget webhook callbacks for each cancelled request
        for (const request of pendingRequests) {
          try {
            let webhookUrl = null;
            if (request.clientId === 'app_cartify_123') {
              webhookUrl = 'http://localhost:5001/api/callback';
            }
            if (webhookUrl) {
              await axios.post(
                webhookUrl,
                { requestId: request.verificationId, status: 'Cancelled' },
                { timeout: 2000 }
              );
            }
          } catch (webhookErr) {
            console.error('[DeleteAccount] Webhook callback failed:', webhookErr.message);
          }
        }
      }
    } catch (reqErr) {
      console.error('[DeleteAccount] Verification request cancellation error:', reqErr.message);
    }

    // ── 5. Delete the Firebase Authentication account ────────────────────────
    // Do this BEFORE removing MongoDB records so we can still roll back if
    // the Firebase call fails and the user still exists in our DB.
    try {
      await admin.auth().deleteUser(user.firebaseUid);
    } catch (firebaseErr) {
      if (firebaseErr.code !== 'auth/user-not-found') {
        return res.status(500).json({
          success: false,
          message: 'Failed to remove Firebase account. Please try again.'
        });
      }
    }

    // ── 6. Delete all MongoDB records ────────────────────────────────────────
    // 6a. Developer ecosystem cleanup (if this user is also a developer)
    try {
      const developer = await Developer.findOne({ firebaseUid: user.firebaseUid });
      if (developer) {
        const devId = developer._id;

        await ApiKey.deleteMany({ developerId: devId });
        await ApiRequestLog.deleteMany({ developerId: devId });
        await Application.deleteMany({ developerId: devId });
        await Billing.deleteMany({ developerId: devId });
        await WalletTransaction.deleteMany({ developerId: devId });
        await Developer.deleteOne({ _id: devId });

        console.log(`[DeleteAccount] Cleaned up developer profile for userId ${userId}`);
      }
    } catch (devErr) {
      console.error('[DeleteAccount] Developer cleanup error:', devErr.message);
    }

    // 6b. Delete all verification requests (history) linked to this DDS ID
    if (user.ddsId) {
      await VerificationRequest.deleteMany({ ddsId: user.ddsId });
    }

    // 6c. Delete the user document itself
    await User.deleteOne({ _id: userId });

    // 6d. Clean up trusted devices and delete sessions
    await TrustedDevice.deleteMany({ userId });
    await DeleteAccountSession.deleteMany({ userId });

    console.log(`[DeleteAccount] Successfully deleted account for userId ${userId} (firebaseUid: ${user.firebaseUid})`);

    // ── 7. Respond — client clears local state and redirects ─────────────────
    return res.status(200).json({
      success: true,
      message: 'Your DDS account and all associated data have been permanently deleted.'
    });

  } catch (error) {
    console.error('[DeleteAccount] Unhandled error:', error);
    next(error);
  }
};

/**
 * Get status of the delete account verification session.
 * GET /api/user/account/delete/status
 */
export const getDeleteAccountStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let session = await DeleteAccountSession.findOne({ userId });
    if (!session) {
      return res.status(200).json({
        success: true,
        session: {
          attempts: 0,
          locked: false,
          dailyLocked: false,
          isVerified: false
        }
      });
    }

    const now = new Date();
    const isDailyLocked = session.dailyLockUntil && session.dailyLockUntil > now;
    const isLocked = session.lockedUntil && session.lockedUntil > now;

    return res.status(200).json({
      success: true,
      session: {
        attempts: session.attempts,
        locked: isLocked,
        lockedUntil: session.lockedUntil,
        dailyLocked: isDailyLocked,
        dailyLockUntil: session.dailyLockUntil,
        isVerified: session.isVerified,
        verifiedAt: session.verifiedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start a new delete account verification session.
 * POST /api/user/account/delete/start
 */
export const startDeleteAccountVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { verificationId } = req.body;

    if (!verificationId) {
      return res.status(400).json({ success: false, message: 'Firebase verificationId is required.' });
    }

    let session = await DeleteAccountSession.findOne({ userId });
    if (!session) {
      session = new DeleteAccountSession({ userId });
    }

    const now = new Date();

    // Check daily lock
    if (session.dailyLockUntil && session.dailyLockUntil > now) {
      const remainingMs = session.dailyLockUntil.getTime() - now.getTime();
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return res.status(403).json({
        success: false,
        message: `Maximum daily verification limit reached. Please try again after ${remainingHours} hours.`,
        dailyLocked: true,
        lockedUntil: session.dailyLockUntil
      });
    }

    // Check 30-min lock
    if (session.lockedUntil && session.lockedUntil > now) {
      const remainingMs = session.lockedUntil.getTime() - now.getTime();
      const remainingMins = Math.ceil(remainingMs / (1000 * 60));
      return res.status(403).json({
        success: false,
        message: `Maximum verification attempts reached. Please try again after ${remainingMins} minutes.`,
        locked: true,
        lockedUntil: session.lockedUntil
      });
    }

    // If lock period expired, reset the attempts count
    session.attempts = 0;
    session.firebaseSessionInfo = verificationId;
    session.isVerified = false;
    session.verifiedAt = null;

    // Reset daily lock count if reset window passed (e.g. 24 hours after reset at)
    if (session.lockCountResetAt && now > session.lockCountResetAt) {
      session.lockCountToday = 0;
      session.lockCountResetAt = null;
    }

    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Delete verification session initialized.',
      session: {
        attempts: 0,
        locked: false,
        dailyLocked: false,
        isVerified: false
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP code for delete account verification.
 * POST /api/user/account/delete/verify-otp
 */
export const verifyDeleteAccountOTP = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'OTP verification code is required.' });
    }

    let session = await DeleteAccountSession.findOne({ userId });
    if (!session || !session.firebaseSessionInfo) {
      return res.status(400).json({ success: false, message: 'No active delete account verification session found. Please request a new code.' });
    }

    const now = new Date();

    // Check daily lock
    if (session.dailyLockUntil && session.dailyLockUntil > now) {
      return res.status(403).json({
        success: false,
        message: 'Maximum daily verification limit reached. Please try again after 24 hours.',
        dailyLocked: true,
        lockedUntil: session.dailyLockUntil
      });
    }

    // Check 30-min lock
    if (session.lockedUntil && session.lockedUntil > now) {
      return res.status(403).json({
        success: false,
        message: 'Maximum verification attempts reached. Please try again after 30 minutes.',
        locked: true,
        lockedUntil: session.lockedUntil
      });
    }

    // Increment attempts
    session.attempts += 1;

    // Verify OTP using Identity Toolkit REST API
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'FIREBASE_API_KEY server configuration is missing.' });
    }

    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`;
    
    // Retrieve dynamic config
    const maxDeleteAttempts = await Configuration.getVal('accountDeleteOtpAttempts', 3);
    const deleteLockTimeHours = await Configuration.getVal('deleteLockTimeHours', 24);
    const tempLockTimeMins = await Configuration.getVal('verificationLockTimeMins', 30);

    try {
      // Call Google Identity Toolkit endpoint
      const response = await axios.post(verifyUrl, {
        sessionInfo: session.firebaseSessionInfo,
        code: code
      }, {
        timeout: 5000
      });

      // Verification successful!
      session.isVerified = true;
      session.verifiedAt = new Date();
      session.attempts = 0; // Reset attempts on success
      await session.save();

      return res.status(200).json({
        success: true,
        message: 'Mobile number ownership verified successfully. You may proceed with account deletion.',
        isVerified: true
      });

    } catch (firebaseErr) {
      // Verification failed
      const remainingAttempts = maxDeleteAttempts - session.attempts;
      
      if (session.attempts >= maxDeleteAttempts) {
        // Lock user
        session.lockCountToday += 1;
        session.lockedUntil = new Date(Date.now() + tempLockTimeMins * 60 * 1000); // dynamic lock
        session.attempts = 0; // Reset attempt counter for the next window

        if (!session.lockCountResetAt) {
          session.lockCountResetAt = new Date(Date.now() + deleteLockTimeHours * 60 * 60 * 1000); // Reset count after daily lock hours
        }

        // Daily lock if triggered multiple times (abuse protection threshold: e.g. 3 blocks)
        if (session.lockCountToday >= 3) {
          session.dailyLockUntil = new Date(Date.now() + deleteLockTimeHours * 60 * 60 * 1000); // daily lock hours
          await session.save();
          return res.status(429).json({
            success: false,
            message: `Maximum daily verification limit reached. Please try again after ${deleteLockTimeHours} hours.`,
            dailyLocked: true,
            lockedUntil: session.dailyLockUntil
          });
        }

        await session.save();
        return res.status(429).json({
          success: false,
          message: `Maximum verification attempts reached. Please try again after ${tempLockTimeMins} minutes.`,
          locked: true,
          lockedUntil: session.lockedUntil
        });
      }

      await session.save();
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining.`,
        remainingAttempts
      });
    }

  } catch (error) {
    next(error);
  }
};
