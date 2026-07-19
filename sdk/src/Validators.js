const { DDSError } = require('./Errors');
const { normalizePhone } = require('./Utils');

/**
 * Validation helpers for @dds/server
 * Enterprise-grade cryptographic key format validation.
 * Supports zero-config initialization via environment variables:
 *   DDS_APP_ID, DDS_PUBLIC_KEY, DDS_SECRET_KEY, DDS_BASE_URL
 */

/**
 * Validates SDK initialization configuration.
 * Falls back to environment variables when explicit config is not provided.
 * This enables: new DDS() with no arguments when env vars are set.
 * @param {object} [config={}]
 */
const validateConfig = (config = {}) => {
  if (config && typeof config !== 'object') {
    throw new DDSError('Configuration must be an object (or omitted to use env variables)', 'INVALID_CONFIG');
  }

  // Resolve each field: explicit config → env variable
  const appId     = (config.appId     || config.applicationId) || process.env.DDS_APP_ID;
  const publicKey = (config.publicKey || config.apiKey)        || process.env.DDS_PUBLIC_KEY;
  const secretKey = (config.secretKey || config.secret)        || process.env.DDS_SECRET_KEY;
  const baseUrl   = (config.baseUrl   || config.apiUrl)        || process.env.DDS_BASE_URL || 'http://localhost:5000';

  if (!appId || typeof appId !== 'string' || !appId.trim()) {
    throw new DDSError(
      'DDS App ID is required. Set DDS_APP_ID in your environment or pass appId to the constructor.\n' +
      '  Example: DDS_APP_ID=app_6G7mQaX92PkLd8RfTyV4NcZh',
      'MISSING_APP_ID'
    );
  }

  if (!publicKey || typeof publicKey !== 'string' || !publicKey.trim()) {
    throw new DDSError(
      'DDS Public Key is required. Set DDS_PUBLIC_KEY in your environment or pass publicKey to the constructor.\n' +
      '  Example: DDS_PUBLIC_KEY=dds_pk_h3WvK8QnLp2YxR7FmTc9VzJ4NsAe6UdBwX1GhKrP',
      'MISSING_PUBLIC_KEY'
    );
  }

  if (!secretKey || typeof secretKey !== 'string' || !secretKey.trim()) {
    throw new DDSError(
      'DDS Secret Key is required. Set DDS_SECRET_KEY in your environment or pass secretKey to the constructor.\n' +
      '  Example: DDS_SECRET_KEY=dds_sk_Y7vLp9Qn4KmXs2HdRt8FwNc6ZaPe3JuBxG5TyMvL1QrHs9WdUk2Xe',
      'MISSING_SECRET_KEY'
    );
  }

  const trimmedAppId     = appId.trim();
  const trimmedPublicKey = publicKey.trim();
  const trimmedSecretKey = secretKey.trim();

  // Application ID: prefix app_, URL-safe chars, 16–64 chars
  if (!/^app_[A-Za-z0-9_]{16,64}$/.test(trimmedAppId)) {
    throw new DDSError(
      `Invalid DDS App ID format: "${trimmedAppId}". Must start with "app_" followed by 16–64 URL-safe characters.`,
      'INVALID_APP_ID'
    );
  }

  // Public Key: prefix dds_pk_, URL-safe chars, 16–128 chars
  if (!/^dds_pk_[A-Za-z0-9_]{16,128}$/.test(trimmedPublicKey)) {
    throw new DDSError(
      `Invalid DDS Public Key format: "${trimmedPublicKey}". Must start with "dds_pk_" followed by 16–128 URL-safe characters.`,
      'INVALID_PUBLIC_KEY'
    );
  }

  // Secret Key: prefix dds_sk_, URL-safe chars, 16–128 chars
  if (!/^dds_sk_[A-Za-z0-9_]{16,128}$/.test(trimmedSecretKey)) {
    throw new DDSError(
      `Invalid DDS Secret Key format: "${trimmedSecretKey}". Must start with "dds_sk_" followed by 16–128 URL-safe characters.`,
      'INVALID_SECRET_KEY'
    );
  }

  return {
    appId:     trimmedAppId,
    publicKey: trimmedPublicKey,
    secretKey: trimmedSecretKey,
    baseUrl:   baseUrl.replace(/\/$/, '')
  };
};


/**
 * Validates target mobile number
 * @param {string} mobileNumber
 * @returns {string} E.164 phone string
 */
const validateMobileNumber = (mobileNumber) => {
  if (!mobileNumber || typeof mobileNumber !== 'string') {
    throw new DDSError('mobileNumber is required (e.g. "+919876543210")', 'MISSING_MOBILE_NUMBER');
  }

  const phone = normalizePhone(mobileNumber);
  if (!phone || !/^\+\d{7,15}$/.test(phone)) {
    throw new DDSError(`Invalid mobile number format: "${mobileNumber}". Provide E.164 format (e.g. "+919876543210")`, 'INVALID_MOBILE_NUMBER');
  }

  return phone;
};

/**
 * Validates 6-digit verification code
 * @param {string} code
 * @returns {string} Clean numeric code string
 */
const validateVerificationCode = (code) => {
  if (!code || typeof code !== 'string') {
    throw new DDSError('verificationCode is required', 'MISSING_VERIFICATION_CODE');
  }

  const clean = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) {
    throw new DDSError('Verification code must be exactly 6 digits', 'INVALID_VERIFICATION_CODE');
  }

  return clean;
};

module.exports = {
  validateConfig,
  validateMobileNumber,
  validateVerificationCode
};
