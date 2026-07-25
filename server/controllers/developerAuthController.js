import { getFirebaseAdmin } from '../config/firebase.js';
import Developer from '../models/developerModel.js';
import { generateToken, verifyToken } from '../services/tokenService.js';

/**
 * POST /api/dev/auth/google-login
 * Exchange a Firebase ID token for a developer portal JWT.
 * Creates a new Developer account on first login.
 */
export const developerGoogleLogin = async (req, res, next) => {
  try {
    const idToken = req.body.idToken || req.body.firebaseToken;

    console.log('==========================================');
    console.log('Google Login Request');
    console.log('');
    console.log('\u2713 Request Received');

    if (!idToken) {
      console.error('\u2717 Firebase ID token missing in request body');
      console.log('==========================================\n');
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required in request body.'
      });
    }

    console.log('\u2713 Firebase Token Present');

    // 1. Resolve Firebase Admin SDK instance
    const admin = getFirebaseAdmin();

    // 2. Verify token with Firebase Admin
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
      console.log('\u2713 Token Verified');
    } catch (tokenErr) {
      console.error('==========================================');
      console.error('Google Login Failed');
      console.error('');
      console.error(`Reason: ${tokenErr.message}`);
      console.error(`Stack Trace: ${tokenErr.stack}`);
      console.error('File: server/controllers/developerAuthController.js');
      console.error('Function: developerGoogleLogin');
      console.error('Recommended Fix: Re-authenticate client-side to obtain a fresh Firebase ID Token.');
      console.error('==========================================\n');

      return res.status(401).json({
        success: false,
        message: 'Firebase token verification failed. Please sign in again.',
        error: tokenErr.message
      });
    }

    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'A verified email address is required from Google Authentication.'
      });
    }

    // 3. Upsert developer record in 'developers' collection
    let developer = await Developer.findOne({ firebaseUid: uid });

    if (!developer) {
      // Check if developer exists under same email address to merge
      developer = await Developer.findOne({ email: email.toLowerCase() });
      if (developer) {
        developer.firebaseUid = uid;
        if (name && !developer.displayName) developer.displayName = name;
        if (picture && !developer.photoURL) developer.photoURL = picture;
        developer.lastLogin = new Date();
        await developer.save();
        console.log(`\u2713 Developer Found & Merged: ${email}`);
      } else {
        developer = await Developer.create({
          firebaseUid: uid,
          email: email.toLowerCase(),
          displayName: name || email.split('@')[0],
          photoURL: picture || null,
          lastLogin: new Date()
        });
        console.log(`\u2713 Developer Created: ${email}`);
      }
    } else {
      developer.lastLogin = new Date();
      if (name && !developer.displayName) developer.displayName = name;
      if (picture && !developer.photoURL) developer.photoURL = picture;
      await developer.save();
      console.log(`\u2713 Developer Found: ${email}`);
    }

    // 4. Issue developer-scoped JWT
    const token = generateToken({
      id: developer._id.toString(),
      type: 'developer',
      developerId: developer.developerId
    });

    console.log('\u2713 JWT Generated');
    console.log('');
    console.log('Login Successful');
    console.log('==========================================\n');

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
    console.error('==========================================');
    console.error('Google Login Failed');
    console.error('');
    console.error(`Reason: ${error.message}`);
    console.error(`Stack Trace: ${error.stack}`);
    console.error('File: server/controllers/developerAuthController.js');
    console.error('Function: developerGoogleLogin');
    console.error('Recommended Fix: Check server logs and MongoDB database connection.');
    console.error('==========================================\n');

    res.status(500).json({
      success: false,
      message: 'Internal Server Error during Google Login.',
      error: error.message
    });
  }
};

/**
 * POST /api/dev/auth/verify-phone
 * Link a verified mobile number to the developer account.
 */
export const developerVerifyPhone = async (req, res, next) => {
  try {
    const { phoneNumber, countryCode, countryISO, countryName } = req.body;
    const developerId = req.developer._id;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

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
 */
export const developerLogout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

/**
 * POST /api/dev/auth/refresh
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

    const admin = getFirebaseAdmin();
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(firebaseIdToken, true);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Re-authentication failed. Please sign in again before deleting your developer account.'
      });
    }

    if (decoded.uid !== req.developer.firebaseUid) {
      return res.status(403).json({
        success: false,
        message: 'Token mismatch. The supplied credentials do not match this account.'
      });
    }

    const Application = (await import('../models/applicationModel.js')).default;
    const ApiKey = (await import('../models/apiKeyModel.js')).default;
    const ApiRequestLog = (await import('../models/apiRequestLogModel.js')).default;
    const { Invoice } = await import('../models/billingModel.js');

    await ApiKey.deleteMany({ developerId: devId });
    await ApiRequestLog.deleteMany({ developerId: devId });
    await Application.deleteMany({ developerId: devId });
    await Invoice.deleteMany({ developerId: devId });

    try {
      await admin.auth().deleteUser(req.developer.firebaseUid);
    } catch (firebaseErr) {
      if (firebaseErr.code !== 'auth/user-not-found') {
        console.error('[DeleteDeveloper] Firebase user deletion error:', firebaseErr.message);
      }
    }

    await Developer.deleteOne({ _id: devId });

    res.status(200).json({
      success: true,
      message: 'Developer account and all associated applications, keys, and usage analytics have been permanently deleted.'
    });
  } catch (error) {
    next(error);
  }
};
