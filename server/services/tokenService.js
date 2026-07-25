import jwt from 'jsonwebtoken';

const DEFAULT_JWT_SECRET = 'dds_jwt_secret_key_development_2026_super_secure_key';

/**
 * Generate a JSON Web Token for the authenticated user/developer
 * @param {Object} userPayload - Data to encode in the token
 * @returns {String} Signed JWT
 */
export const generateToken = (userPayload) => {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(userPayload, secret, { expiresIn });
};

/**
 * Verify a JSON Web Token
 * @param {String} token - JWT to verify
 * @returns {Object|null} Decoded payload or null if invalid
 */
export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};
