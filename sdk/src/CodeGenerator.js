const crypto = require('crypto');

/**
 * Cryptographically Secure Verification Code Generator for @dds/auth-sdk
 */

/**
 * Generate a cryptographically secure random 6-digit numeric verification code.
 * Generated on the developer's server — NOT on the DDS server.
 *
 * @param {number} [length=6] Number of digits (default: 6)
 * @returns {string} Zero-padded numeric code (e.g. "583921")
 */
const generateCode = (length = 6) => {
  if (crypto.randomInt) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length);
    const num = crypto.randomInt(min, max);
    return String(num);
  }

  // Fallback using randomBytes with rejection sampling
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  const range = max - min;
  const byteLen = Math.ceil(Math.log2(max) / 8) + 1;

  let num;
  do {
    const buf = crypto.randomBytes(byteLen);
    num = parseInt(buf.toString('hex'), 16);
  } while (num >= Math.floor(Math.pow(256, byteLen) / range) * range);

  return String(min + (num % range));
};

module.exports = {
  generateCode
};
