const { DEFAULT_TIMEOUT_MS, FAILURE_REASONS } = require('./Types');

/**
 * In-Memory Session Manager for active authentication requests
 */
class AuthManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.sessions = new Map();

    // Auto-clean stale sessions every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanStaleSessions(), 30000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Store a newly created authentication session
   * @param {object} session
   * @param {string} session.sessionId
   * @param {string} session.requestId
   * @param {string} session.mobileNumber
   * @param {string} session.generatedCode
   * @param {number} [session.ttlMs=120000] 2-minute default TTL
   */
  createSession({ sessionId, requestId, mobileNumber, generatedCode, ttlMs = DEFAULT_TIMEOUT_MS }) {
    const now = Date.now();
    const sessionData = {
      sessionId,
      requestId,
      mobileNumber,
      generatedCode,
      createdAt: now,
      expiresAt: now + ttlMs,
      verified: false
    };

    this.sessions.set(sessionId, sessionData);
    this.sessions.set(requestId, sessionData);
    return sessionData;
  }

  /**
   * Get an active session by sessionId or requestId
   * @param {string} key
   * @returns {object|null}
   */
  getSession(key) {
    const session = this.sessions.get(key);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.removeSession(key);
      return null;
    }
    return session;
  }

  /**
   * Remove a session
   * @param {string} key
   */
  removeSession(key) {
    const session = this.sessions.get(key);
    if (session) {
      this.sessions.delete(session.sessionId);
      this.sessions.delete(session.requestId);
    }
  }

  /**
   * Compare generated code vs user-entered code
   * @param {string} key - sessionId or requestId
   * @param {string} status - DDS request status (APPROVED | REJECTED | EXPIRED)
   * @param {string} enteredCode - Code entered by user in DDS App
   * @returns {{ success: boolean, userVerified: boolean, reason?: string }}
   */
  verifySession(key, status, enteredCode = '') {
    const session = this.getSession(key);

    if (status === 'REJECTED') {
      this.removeSession(key);
      return { success: false, userVerified: false, reason: FAILURE_REASONS.USER_REJECTED };
    }

    if (status === 'EXPIRED') {
      this.removeSession(key);
      return { success: false, userVerified: false, reason: FAILURE_REASONS.EXPIRED };
    }

    if (status === 'APPROVED') {
      if (!session) {
        // If session expired locally but was approved remotely
        return { success: false, userVerified: false, reason: FAILURE_REASONS.EXPIRED };
      }

      const cleanGenerated = String(session.generatedCode).trim();
      const cleanEntered = String(enteredCode).trim();

      if (cleanGenerated === cleanEntered && cleanGenerated.length > 0) {
        this.removeSession(key);
        return { success: true, userVerified: true };
      } else {
        this.removeSession(key);
        return { success: false, userVerified: false, reason: FAILURE_REASONS.INVALID_CODE };
      }
    }

    return { success: false, userVerified: false, reason: 'Pending' };
  }

  /**
   * Purge expired sessions
   */
  cleanStaleSessions() {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(key);
      }
    }
  }
}

module.exports = { AuthManager };
