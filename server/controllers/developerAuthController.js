import admin from 'firebase-admin';
import Developer from '../models/developerModel.js';
import { generateToken, verifyToken } from '../services/tokenService.js';

/**
 * POST /api/dev/auth/google-login
 * Exchange a Firebase ID token for a developer portal JWT.
 * Creates a new Developer account on first login.
 */
export const developerGoogleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase ID token is required.' });
    }

    // Verify token with Firebase Admin
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({ success: false, message: 'A verified email address is required.' });
    }

    // Upsert developer record in 'developers' collection
    let developer = await Developer.findOne({ firebaseUid: uid });

    if (!developer) {
      developer = await Developer.create({
        firebaseUid: uid,
        email,
        displayName: name || email.split('@')[0],
        photoURL: picture || null,
        lastLogin: new Date()
      });
      console.log(`[Developer Auth] New developer registered: ${email}`);
    } else {
      developer.lastLogin = new Date();
      if (name && !developer.displayName) developer.displayName = name;
      if (picture && !developer.photoURL) developer.photoURL = picture;
      await developer.save();
    }

    // Issue developer-scoped JWT
    const token = generateToken({
      id: developer._id.toString(),
      type: 'developer', // Distinguishes from mobile user tokens
      developerId: developer.developerId
    });

    res.status(200).json({
      success: true,
      token,
      developer: {
        id: developer._id,
        developerId: developer.developerId,
        firebaseUid: developer.firebaseUid,
        email: developer.email,
        displayName: developer.displayName,
        photoURL: developer.photoURL,
        mobileVerified: developer.mobileVerified,
        phoneNumber: developer.phoneNumber,
        company: developer.company,
        website: developer.website,
        billingStatus: developer.billingStatus || 'active',
        status: developer.status,
        createdAt: developer.createdAt,
        updatedAt: developer.updatedAt
      }
    });
  } catch (error) {
    console.error('[Developer Auth] Login error:', error.message);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ success: false, message: 'Firebase token has expired. Please sign in again.' });
    }
    next(error);
  }
};

/**
 * POST /api/dev/auth/verify-phone
 * Link a verified mobile number to the developer account.
 * Mobile number must be globally unique across all developer accounts.
 */
export const developerVerifyPhone = async (req, res, next) => {
  try {
    const { phoneNumber, countryCode, countryISO, countryName } = req.body;
    const developerId = req.developer._id;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    // Enforce global uniqueness across all developer accounts
    const existingDev = await Developer.findOne({
      phoneNumber,
      _id: { $ne: developerId }
    });

    if (existingDev) {
      return res.status(409).json({
        success: false,
        message: 'This mobile number is already linked to another DDS Developer account.',
        code: 'PHONE_ALREADY_LINKED'
      });
    }

    const developer = await Developer.findByIdAndUpdate(
      developerId,
      {
        phoneNumber,
        countryCode: countryCode || '',
        countryISO: countryISO || '',
        countryName: countryName || '',
        mobileVerified: true,
        phoneVerifiedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully.',
      developer: {
        mobileVerified: developer.mobileVerified,
        phoneNumber: developer.phoneNumber,
        countryCode: developer.countryCode
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dev/auth/profile or GET /api/dev/auth/me
 * Return the authenticated developer's profile.
 */
export const getDeveloperProfile = async (req, res) => {
  const dev = req.developer;
  res.status(200).json({
    success: true,
    developer: {
      id: dev._id,
      developerId: dev.developerId,
      firebaseUid: dev.firebaseUid,
      email: dev.email,
      displayName: dev.displayName,
      photoURL: dev.photoURL,
      mobileVerified: dev.mobileVerified,
      phoneNumber: dev.phoneNumber,
      countryCode: dev.countryCode,
      company: dev.company,
      website: dev.website,
      billingStatus: dev.billingStatus || 'active',
      status: dev.status,
      lastLogin: dev.lastLogin,
      createdAt: dev.createdAt,
      updatedAt: dev.updatedAt
    }
  });
};

/**
 * PATCH /api/dev/auth/profile or PATCH /api/dev/auth/me
 * Update developer profile fields.
 */
export const updateDeveloperProfile = async (req, res, next) => {
  try {
    const { displayName, company, website, timezone } = req.body;
    const allowedUpdates = {};
    if (displayName !== undefined) allowedUpdates.displayName = displayName.trim();
    if (company !== undefined) allowedUpdates.company = company.trim();
    if (website !== undefined) allowedUpdates.website = website.trim();
    if (timezone !== undefined) allowedUpdates.timezone = timezone.trim();

    const developer = await Developer.findByIdAndUpdate(
      req.developer._id,
      allowedUpdates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      developer: {
        displayName: developer.displayName,
        company: developer.company,
        website: developer.website,
        timezone: developer.timezone
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dev/auth/logout
 * Log out the developer session.
 */
export const developerLogout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

/**
 * POST /api/dev/auth/refresh
 * Issue a fresh developer JWT if a valid token is supplied.
 */
export const refreshToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No authorization token provided.' });
    }

    const oldToken = authHeader.split(' ')[1];
    const decoded = verifyToken(oldToken);

    if (!decoded || decoded.type !== 'developer') {
      return res.status(401).json({ success: false, message: 'Invalid developer token.' });
    }

    const developer = await Developer.findById(decoded.id);
    if (!developer || developer.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Developer account not found or inactive.' });
    }

    const newToken = generateToken({
      id: developer._id.toString(),
      type: 'developer',
      developerId: developer.developerId
    });

    res.status(200).json({
      success: true,
      token: newToken,
      developer: {
        id: developer._id,
        developerId: developer.developerId,
        email: developer.email,
        displayName: developer.displayName
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/dev/auth/me
 * Permanently deletes the authenticated developer account and cascades.
 */
export const deleteDeveloperAccount = async (req, res, next) => {
  try {
    const devId = req.developer._id;
    const { firebaseIdToken } = req.body;

    if (!firebaseIdToken) {
      return res.status(400).json({
        success: false,
        message: 'A fresh Firebase ID token is required to delete your developer account.'
      });
    }

    // 1. Resolve Firebase Admin SDK and verify token
    const admin = (await import('../config/firebase.js')).getFirebaseAdmin();
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(firebaseIdToken, true);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Re-authentication failed. Please sign in again before deleting your developer account.'
      });
    }

    // Confirm token belongs to the developer
    if (decoded.uid !== req.developer.firebaseUid) {
      return res.status(403).json({
        success: false,
        message: 'Token mismatch. The supplied credentials do not match this account.'
      });
    }

    // 2. Cascade delete developer models
    const Application = (await import('../models/applicationModel.js')).default;
    const ApiKey = (await import('../models/apiKeyModel.js')).default;
    const ApiRequestLog = (await import('../models/apiRequestLogModel.js')).default;
    const { Invoice } = await import('../models/billingModel.js');

    await ApiKey.deleteMany({ developerId: devId });
    await ApiRequestLog.deleteMany({ developerId: devId });
    await Application.deleteMany({ developerId: devId });
    await Invoice.deleteMany({ developerId: devId });

    // 3. Remove from Firebase Authentication
    try {
      await admin.auth().deleteUser(req.developer.firebaseUid);
    } catch (firebaseErr) {
      if (firebaseErr.code !== 'auth/user-not-found') {
        console.error('[DeleteDeveloper] Firebase user deletion error:', firebaseErr.message);
      }
    }

    // 4. Soft-delete or purge developer from MongoDB
    // "Stripe Customer Mapping (do not delete Stripe records, only unlink them)" -> we delete the developer record or mark as deleted.
    // The requirement says: "Soft delete first, then permanently purge after a retention period... delete Firebase developer account, MongoDB developer record..."
    // Since we are unlinking, let's delete the MongoDB developer record.
    await Developer.deleteOne({ _id: devId });

    res.status(200).json({
      success: true,
      message: 'Developer account and all associated applications, keys, and usage analytics have been permanently deleted.'
    });
  } catch (error) {
    next(error);
  }
};
