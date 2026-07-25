/**
 * In-Memory Sliding Nonce Store for Replay Attack Protection (Step 7 validation)
 * Stores used nonces with a expiration TTL matching the timestamp validation window (60s).
 */
class NonceCache {
  constructor(ttlMs = 60000) {
    this.ttlMs = ttlMs;
    this.seenNonces = new Map(); // key: `appId:nonce` -> timestamp
    
    // Periodically clean up expired nonces every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Check if a nonce has been used. If not, record it.
   * @param {string} appId
   * @param {string} nonce
   * @returns {boolean} true if nonce is unique (not seen), false if replay detected
   */
  useNonce(appId, nonce) {
    if (!nonce || typeof nonce !== 'string') return false;
    const key = `${appId}:${nonce}`;
    const now = Date.now();

    if (this.seenNonces.has(key)) {
      const storedTime = this.seenNonces.get(key);
      if (now - storedTime < this.ttlMs) {
        return false; // Replay attack detected!
      }
    }

    this.seenNonces.set(key, now);
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.seenNonces.entries()) {
      if (now - timestamp > this.ttlMs) {
        this.seenNonces.delete(key);
      }
    }
  }
}

export const nonceCache = new NonceCache(60000);
export default nonceCache;
