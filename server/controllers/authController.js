import { getFirebaseAdmin } from '../config/firebase.js';
import User from '../models/userModel.js';
import { generateToken } from '../services/tokenService.js';

/**
 * Handle Google authentication via Firebase ID Token
 * POST /api/auth/google-login
 */
export const googleLogin = async (req, res, next) => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ success: false, message: 'Google authentication token is required.' });
    }

    // 1. Resolve Firebase Admin SDK
    let admin;
    try {
      admin = getFirebaseAdmin();
    } catch (err) {
      console.error('[Auth Controller] Firebase Admin initialization check failed:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Firebase Admin SDK is not configured on the server. Please check environment variables or service account credentials.'
      });
    }

    // 2. Validate Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    } catch (err) {
      console.error('[Auth Controller] Google Token Verification failed:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google Identity token. Please sign in again.'
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
      } else {
        // Create a new Google-authenticated user
        user = await User.create({
          firebaseUid: uid,
          email,
          displayName: name || 'DDS User',
          photoURL: picture || '',
          authProvider: 'google'
        });
      }
    }

    // 4. Validate Account Status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Your account access is restricted (${user.status}). Contact support.`
      });
    }

    // 5. Update activity timestamps
    user.lastLogin = new Date();
    user.lastActiveAt = new Date();
    await user.save();

    // 6. Generate signed JWT session
    const jwtToken = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    // 7. Respond with User and JWT
    res.status(200).json({
      success: true,
      token: jwtToken,
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
