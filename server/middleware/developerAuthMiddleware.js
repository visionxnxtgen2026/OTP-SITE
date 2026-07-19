import { verifyToken } from '../services/tokenService.js';
import Developer from '../models/developerModel.js';

/**
 * Protect developer portal routes with JWT authentication.
 * Attaches req.developer for downstream use.
 * Specifically checks token type === 'developer' to prevent
 * mobile app JWTs from being reused on the developer portal.
 */
export const protectDeveloper = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ success: false, message: 'Not authorized, invalid token.' });
      }

      // Enforce developer-scoped token type
      if (decoded.type !== 'developer') {
        return res.status(403).json({ success: false, message: 'Access denied: developer token required.' });
      }

      const developer = await Developer.findById(decoded.id).select('-__v');
      if (!developer) {
        return res.status(401).json({ success: false, message: 'Developer account not found.' });
      }

      if (developer.status !== 'active') {
        return res.status(403).json({ success: false, message: `Developer account is ${developer.status}.` });
      }

      req.developer = developer;
      next();
    } catch (error) {
      console.error('[Developer Auth Middleware] Error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token verification failed.' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided.' });
  }
};

/**
 * Ensure the developer has completed mobile verification
 * before accessing sensitive resources.
 */
export const requireMobileVerified = (req, res, next) => {
  if (!req.developer?.mobileVerified) {
    return res.status(403).json({
      success: false,
      message: 'Mobile number verification is required to access this resource.',
      code: 'MOBILE_VERIFICATION_REQUIRED'
    });
  }
  next();
};
