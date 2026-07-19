import jwt from 'jsonwebtoken';

/**
 * Generate a JSON Web Token for the authenticated user
 * @param {Object} userPayload - Data to encode in the token
 * @returns {String} Signed JWT
 */
export const generateToken = (userPayload) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(userPayload, secret, { expiresIn });
};

/**
 * Verify a JSON Web Token
 * @param {String} token - JWT to verify
 * @returns {Object|null} Decoded payload or null if invalid
 */
export const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};
