import { getFirebaseAdmin } from '../config/firebase.js';
import User from '../models/userModel.js';
import { generateToken } from '../services/tokenService.js';

/**
 * Handle Google authentication via Firebase ID Token
 * POST /api/auth/google-login
 */
export const googleLogin = async (req, res, next) => {
  try {
    const firebaseToken = req.body.firebaseToken || req.body.idToken;

    console.log('==========================================');
    console.log('Google Login Request (User App)');
    console.log('');
    console.log('\u2713 Request Received');

    if (!firebaseToken) {
      console.error('\u2717 Firebase token missing in request body');
      console.log('==========================================\n');
      return res.status(400).json({
        success: false,
        message: 'Google authentication token is required.'
      });
    }

    console.log('\u2713 Firebase Token Present');

    // 1. Resolve Firebase Admin SDK
    const admin = getFirebaseAdmin();

    // 2. Validate Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      console.log('\u2713 Token Verified');
    } catch (tokenErr) {
      console.error('==========================================');
      console.error('Google Login Failed');
      console.error('');
      console.error(`Reason: ${tokenErr.message}`);
      console.error(`Stack Trace: ${tokenErr.stack}`);
      console.error('File: server/controllers/authController.js');
      console.error('Function: googleLogin');
      console.error('Recommended Fix: Sign in again client-side to generate a fresh ID token.');
      console.error('==========================================\n');

      return res.status(401).json({
        success: false,
        message: 'Invalid Google Identity token. Please sign in again.',
        error: tokenErr.message
      });
    }

    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address scope is required to register a DDS account.'
      });
    }

    // 3. Find or create user in MongoDB
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // Check if user exists under same email address to merge
      user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        user.firebaseUid = uid;
        if (!user.displayName) user.displayName = name;
        if (!user.photoURL) user.photoURL = picture;
        await user.save();
        console.log(`\u2713 User Found & Merged: ${email}`);
      } else {
        user = await User.create({
          firebaseUid: uid,
          email: email.toLowerCase(),
          displayName: name || email.split('@')[0],
          photoURL: picture || null
        });
        console.log(`\u2713 User Created: ${email}`);
      }
    } else {
      console.log(`\u2713 User Found: ${email}`);
    }

    // 4. Generate JWT
    const token = generateToken({ id: user._id.toString() });
    console.log('\u2713 JWT Generated');
    console.log('');
    console.log('Login Successful');
    console.log('==========================================\n');

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        mobileVerified: user.mobileVerified,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('==========================================');
    console.error('Google Login Failed');
    console.error('');
    console.error(`Reason: ${error.message}`);
    console.error(`Stack Trace: ${error.stack}`);
    console.error('File: server/controllers/authController.js');
    console.error('Function: googleLogin');
    console.error('Recommended Fix: Check server logs and MongoDB database connection.');
    console.error('==========================================\n');

    res.status(500).json({
      success: false,
      message: 'Internal Server Error during Google Login.',
      error: error.message
    });
  }
};
