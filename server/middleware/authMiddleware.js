import { verifyToken } from '../services/tokenService.js';
import User from '../models/userModel.js';

/**
 * Protect HTTP routes with JWT authentication verification
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
      }

      // Check if user still exists
      const user = await User.findById(decoded.id).select('-__v');
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      // Check user status
      if (user.status !== 'active') {
        return res.status(403).json({ success: false, message: `Account access is restricted (${user.status})` });
      }

      // Attach user to request
      req.user = user;
      next();
    } catch (error) {
      console.error('[Auth Middleware] Error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token verification failed' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

/**
 * Restrict routes to Admin users only
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied, admin permissions required' });
  }
};

/**
 * Restrict routes to mobile-verified users only
 */
export const verifiedOnly = (req, res, next) => {
  if (req.user && req.user.mobileVerified) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied, mobile verification required' });
  }
};
