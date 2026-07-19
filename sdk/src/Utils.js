const crypto = require('crypto');

/**
 * Utility functions for @dds/auth-sdk
 */

/**
 * Pause execution for specified milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate a random UUID string
 * @returns {string}
 */
const generateUUID = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Normalize phone number to E.164 format (+919876543210)
 * @param {string} rawPhone
 * @param {string} [defaultCountryCode='91']
 * @returns {string}
 */
const normalizePhone = (rawPhone, defaultCountryCode = '91') => {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[\s\-().]/g, '').trim();
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);
  if (/^\d{10}$/.test(cleaned)) return '+' + defaultCountryCode + cleaned;
  if (/^91\d{10}$/.test(cleaned)) return '+' + cleaned;
  return cleaned;
};

module.exports = {
  sleep,
  generateUUID,
  normalizePhone
};
