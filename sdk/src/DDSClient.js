const { validateConfig, validateMobileNumber, validateVerificationCode } = require('./Validators');
const { generateCode } = require('./CodeGenerator');
const { API } = require('./API');
const { AuthManager } = require('./AuthManager');
const { DDSError } = require('./Errors');
const { sleep, generateUUID } = require('./Utils');
const {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_POLL_INTERVAL_MS,
  REQUEST_STATUS,
  FAILURE_REASONS
} = require('./Types');

/**
 * DDS Authentication Client SDK
 * Production-ready Node.js SDK for DDS Push-Based Authentication Approval Platform
 */
class DDSClient {
  /**
   * Initialize DDS Client
   * @param {object} config
   * @param {string} config.appId - Application ID (app_xxxxxxxxxxxxxxxxx)
   * @param {string} config.publicKey - Public API Key (dds_pk_live_...)
   * @param {string} config.secretKey - Secret API Key (dds_sk_live_...)
   * @param {string} [config.baseUrl] - DDS Server Base URL
   */
  constructor(config = {}) {
    const validConfig = validateConfig(config);
    this.appId = validConfig.appId;
    this.publicKey = validConfig.publicKey;
    this.secretKey = validConfig.secretKey;
    this.baseUrl = validConfig.baseUrl;

    this.api = new API({
      baseUrl: this.baseUrl,
      appId: this.appId,
      publicKey: this.publicKey,
      secretKey: this.secretKey
    });

    this.authManager = new AuthManager();
  }

  /**
   * One-Step Authentication Handler.
   * Performs validation, code generation, DDS request dispatch, status polling,
   * and automatic verification comparison internally.
   *
   * @param {object} params
   * @param {string} params.mobileNumber - Target user mobile number (e.g. "+919876543210")
   * @param {number} [params.timeoutMs=120000] - Expiration timeout in ms (default: 2 minutes)
   * @param {number} [params.pollIntervalMs=2000] - Polling interval in ms (default: 2 seconds)
   * @param {function} [params.onCodeGenerated] - Optional callback triggered when code is generated
   * @returns {Promise<{ success: boolean, userVerified?: boolean, reason?: string, requestId?: string, verificationCode?: string }>}
   */
  async authenticate({
    mobileNumber,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
    onCodeGenerated
  }) {
    try {
      // 1. Call requestAuth internally
      const reqRes = await this.requestAuth({ mobileNumber });
      const { requestId, verificationCode } = reqRes;

      if (typeof onCodeGenerated === 'function') {
        try {
          onCodeGenerated({ verificationCode, requestId });
        } catch (_) {}
      }

      // 2. Poll for approval & verify
      const startTime = Date.now();

      while (Date.now() - startTime < timeoutMs) {
        await sleep(pollIntervalMs);

        const statusRes = await this.api.getStatus(requestId);
        const status = statusRes.status;

        if (status === REQUEST_STATUS.APPROVED) {
          const verifyResult = this.authManager.verifySession(
            requestId,
            REQUEST_STATUS.APPROVED,
            statusRes.enteredCode
          );

          if (verifyResult.success) {
            return {
              success: true,
              userVerified: true,
              requestId,
              verificationCode
            };
          } else {
            return {
              success: false,
              userVerified: false,
              reason: verifyResult.reason || FAILURE_REASONS.INVALID_CODE
            };
          }
        }

        if (status === REQUEST_STATUS.REJECTED) {
          this.authManager.removeSession(requestId);
          return {
            success: false,
            userVerified: false,
            reason: FAILURE_REASONS.USER_REJECTED
          };
        }

        if (status === REQUEST_STATUS.EXPIRED) {
          this.authManager.removeSession(requestId);
          return {
            success: false,
            userVerified: false,
            reason: FAILURE_REASONS.EXPIRED
          };
        }
      }

      // Timed out locally
      this.authManager.removeSession(requestId);
      return {
        success: false,
        userVerified: false,
        reason: FAILURE_REASONS.EXPIRED
      };

    } catch (err) {
      if (err instanceof DDSError && err.code === 'user_not_found') {
        return {
          success: false,
          userVerified: false,
          reason: FAILURE_REASONS.USER_NOT_FOUND
        };
      }
      return {
        success: false,
        userVerified: false,
        reason: err.message || FAILURE_REASONS.NETWORK_ERROR
      };
    }
  }

  /**
   * Initiate request and return generated code immediately (for custom frontend rendering before polling)
   * @param {object} params
   * @param {string} params.mobileNumber
   * @returns {Promise<{ success: boolean, requestId: string, verificationCode: string }>}
   */
  async requestAuth({ mobileNumber }) {
    const validMobile = validateMobileNumber(mobileNumber);

    const reqRes = await this.api.requestAuth({ mobileNumber: validMobile });
    const { requestId, verificationCode } = reqRes;

    this.authManager.createSession({
      sessionId: `sess_${generateUUID()}`,
      requestId,
      mobileNumber: validMobile,
      generatedCode: verificationCode,
      ttlMs: DEFAULT_TIMEOUT_MS
    });

    return {
      success: true,
      requestId,
      verificationCode
    };
  }

  /**
   * Get the current status of an authentication request
   * @param {string} requestId
   * @returns {Promise<object>}
   */
  async getStatus(requestId) {
    if (!requestId || typeof requestId !== 'string' || !requestId.trim()) {
      throw new DDSError('requestId is required', 'missing_request_id');
    }
    return await this.api.getStatus(requestId.trim());
  }

  /**
   * Verify code manually against an active request ID
   * @param {object} params
   * @param {string} params.requestId
   * @param {string} params.enteredCode
   * @returns {Promise<{ success: boolean, userVerified: boolean, reason?: string }>}
   */
  async verifyCode({ requestId, enteredCode }) {
    const validCode = validateVerificationCode(enteredCode);
    const statusRes = await this.api.getStatus(requestId);

    return this.authManager.verifySession(
      requestId,
      statusRes.status,
      validCode
    );
  }

  /**
   * Test DDS server connectivity — useful for health checks and CLI diagnostics.
   * Does not require valid credentials to succeed (connectivity only).
   * @returns {Promise<{ success: boolean, connected: boolean, serverName?: string, version?: string }>}
   */
  async ping() {
    const result = await this.api.ping();
    return {
      success: result.connected,
      connected: result.connected,
      serverName: result.serverName || 'DDS Server',
      version: result.version || null,
      baseUrl: this.baseUrl
    };
  }
}

module.exports = DDSClient;

