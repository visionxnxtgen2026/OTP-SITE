import crypto from 'crypto';

const BASE62_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a cryptographically secure random Base62 string using Node.js crypto.randomBytes / CSPRNG.
 * Eliminates modulo bias by rejecting byte values >= 248.
 *
 * @param {number} length - Target string length
 * @returns {string} - URL-safe Base62 string (no spaces, punctuation, or special chars)
 */
export const generateSecureRandomBase62 = (length = 32) => {
  if (length <= 0) return '';
  const result = new Array(length);
  const randomBytes = crypto.randomBytes(length * 2);
  let count = 0;
  let byteIndex = 0;

  while (count < length) {
    if (byteIndex >= randomBytes.length) {
      const freshBytes = crypto.randomBytes(length * 2);
      for (let i = 0; i < freshBytes.length; i++) {
        randomBytes[i] = freshBytes[i];
      }
      byteIndex = 0;
    }
    const b = randomBytes[byteIndex++];
    // 62 * 4 = 248. Reject bytes >= 248 for unbiased CSPRNG distribution
    if (b < 248) {
      result[count++] = BASE62_CHARSET[b % 62];
    }
  }

  return result.join('');
};

/**
 * Generate cryptographically secure Application ID
 * Prefix: app_
 * Random length: 28 URL-safe characters (range 24–32)
 * Example: app_6G7mQaX92PkLd8RfTyV4NcZh
 */
export const generateApplicationId = (randomLength = 28) => {
  const len = Math.max(24, Math.min(32, randomLength));
  return `app_${generateSecureRandomBase62(len)}`;
};

/**
 * Generate cryptographically secure Public API Key
 * Prefix: dds_pk_
 * Random length: 56 URL-safe characters (range 48–64)
 * Example: dds_pk_h3WvK8QnLp2YxR7FmTc9VzJ4NsAe6UdBwX1GhKrP
 */
export const generatePublicKey = (randomLength = 56) => {
  const len = Math.max(48, Math.min(64, randomLength));
  return `dds_pk_${generateSecureRandomBase62(len)}`;
};

/**
 * Generate cryptographically secure Secret API Key
 * Prefix: dds_sk_
 * Random length: 80 URL-safe characters (range 64–96)
 * Example: dds_sk_Y7vLp9Qn4KmXs2HdRt8FwNc6ZaPe3JuBxG5TyMvL1QrHs9WdUk2Xe
 */
export const generateSecretKey = (randomLength = 80) => {
  const len = Math.max(64, Math.min(96, randomLength));
  return `dds_sk_${generateSecureRandomBase62(len)}`;
};

/**
 * Generate full API Credential Key Pair
 */
export const generateCredentialKeyPair = (pubLen = 56, secLen = 80) => {
  return {
    publicKey: generatePublicKey(pubLen),
    rawSecret: generateSecretKey(secLen)
  };
};

/**
 * SHA-256 hash of raw secret key for indexed lookup.
 */
export const hashSecretKey = (rawSecret) => {
  return crypto.createHash('sha256').update(rawSecret).digest('hex');
};

/**
 * Build safe preview of Secret Key for UI display
 * e.g. "dds_sk_Y7vLp9Qn4K...Uk2Xe"
 */
export const buildSecretPreview = (rawSecret) => {
  if (!rawSecret || typeof rawSecret !== 'string') return 'dds_sk_...';
  if (rawSecret.length <= 24) return `${rawSecret.slice(0, 10)}...${rawSecret.slice(-4)}`;
  return `${rawSecret.slice(0, 14)}...${rawSecret.slice(-5)}`;
};

/**
 * Collision-safe unique Application ID generator with DB verification.
 */
export const generateUniqueApplicationId = async (ApplicationModel, randomLength = 28) => {
  let attempts = 0;
  while (attempts < 10) {
    const appId = generateApplicationId(randomLength);
    const existing = await ApplicationModel.findOne({ applicationId: appId }).lean();
    if (!existing) return appId;
    attempts++;
  }
  throw new Error('Failed to generate unique Application ID after multiple collision attempts');
};

/**
 * Collision-safe unique API Key pair generator with DB verification.
 */
export const generateUniqueKeyPair = async (ApiKeyModel, pubLen = 56, secLen = 80) => {
  let attempts = 0;
  while (attempts < 10) {
    const keyPair = generateCredentialKeyPair(pubLen, secLen);
    const secretHash = hashSecretKey(keyPair.rawSecret);

    const [existingPub, existingSec] = await Promise.all([
      ApiKeyModel.findOne({ publicKey: keyPair.publicKey }).lean(),
      ApiKeyModel.findOne({ secretSha256: secretHash }).lean()
    ]);

    if (!existingPub && !existingSec) {
      return {
        ...keyPair,
        secretHash,
        secretPreview: buildSecretPreview(keyPair.rawSecret)
      };
    }
    attempts++;
  }
  throw new Error('Failed to generate unique API Key pair after multiple collision attempts');
};
