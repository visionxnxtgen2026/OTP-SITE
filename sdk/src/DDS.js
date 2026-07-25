const crypto = require('crypto');
const {
  DDSError,
  DDSConfigurationError,
  DDSApplicationNotFoundError,
  DDSInvalidApiKeyError,
  DDSInvalidSecretKeyError,
  DDSInvalidSignatureError,
  DDSUnauthorizedError,
  DDSRateLimitError,
  DDSServerError,
  DDSTimeoutError,
  DDSNetworkError,
  DDSAuthenticationError
} = require('./Errors');

/**
 * Official DDS Node.js SDK
 */
class DDS {
  /**
   * @param {object} config
   * @param {string} config.appId - Application ID (dds_app_...)
   * @param {string} config.apiKey - API Public Key (dds_pk_...)
   * @param {string} config.secretKey - Secret API Key (dds_sk_...)
   * @param {string} [config.baseUrl] - DDS Server Base URL (default: http://localhost:5000)
   * @param {number} [config.timeout] - Timeout in ms (default: 10000)
   * @param {number} [config.maxRetries] - Max retries on network error (default: 3)
   */
  constructor(config = {}) {
    const appId = config.appId || process.env.DDS_APP_ID;
    const apiKey = config.apiKey || process.env.DDS_API_KEY;
    const secretKey = config.secretKey || process.env.DDS_SECRET_KEY;
    const baseUrl = config.baseUrl || process.env.DDS_BASE_URL || 'http://localhost:5000';
    const timeout = config.timeout || 10000;
    const maxRetries = config.maxRetries || 3;

    // Strict configuration validation
    if (!appId || typeof appId !== 'string' || !appId.trim()) {
      throw new DDSConfigurationError('DDSConfigurationError: Missing required "appId" parameter (DDS_APP_ID).');
    }
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new DDSConfigurationError('DDSConfigurationError: Missing required "apiKey" parameter (DDS_API_KEY).');
    }
    if (!secretKey || typeof secretKey !== 'string' || !secretKey.trim()) {
      throw new DDSConfigurationError('DDSConfigurationError: Missing required "secretKey" parameter (DDS_SECRET_KEY).');
    }

    try {
      new URL(baseUrl);
    } catch (_) {
      throw new DDSConfigurationError(`DDSConfigurationError: Invalid baseUrl "${baseUrl}". Must be a valid URL.`);
    }

    if (!appId.startsWith('dds_app_') && !appId.startsWith('app_')) {
      throw new DDSConfigurationError('DDSConfigurationError: Invalid Application ID format. Expected prefix "dds_app_".');
    }
    if (!apiKey.startsWith('dds_pk_')) {
      throw new DDSConfigurationError('DDSConfigurationError: Invalid API Key format. Expected prefix "dds_pk_".');
    }
    if (!secretKey.startsWith('dds_sk_')) {
      throw new DDSConfigurationError('DDSConfigurationError: Invalid Secret Key format. Expected prefix "dds_sk_".');
    }

    this.appId = appId.trim();
    this.apiKey = apiKey.trim();
    this.secretKey = secretKey.trim();
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  /**
   * Internal Request Engine with HMAC Signing and Exponential Backoff Retries
   */
  async _request(method, endpoint, data = null, attempt = 1) {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const bodyStr = data ? JSON.stringify(data) : '';

    const canonicalString = `${this.appId}:${this.apiKey}:${timestamp}:${nonce}:${bodyStr}`;
    const signature = crypto.createHmac('sha256', this.secretKey).update(canonicalString).digest('hex');

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-dds-sdk-version': '1.0.0',
      'x-dds-app-id': this.appId,
      'x-dds-api-key': this.apiKey,
      'Authorization': `Bearer ${this.secretKey}`,
      'x-dds-timestamp': timestamp,
      'x-dds-nonce': nonce,
      'x-dds-signature': signature
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DDS SDK Outgoing Header Audit]`);
      console.log(`  Target URL:       ${url}`);
      console.log(`  x-dds-app-id:     ${headers['x-dds-app-id']}`);
      console.log(`  x-dds-api-key:    ${headers['x-dds-api-key'] ? `${headers['x-dds-api-key'].slice(0, 12)}...` : '(none)'}`);
      console.log(`  x-dds-timestamp:  ${headers['x-dds-timestamp']}`);
      console.log(`  x-dds-nonce:      ${headers['x-dds-nonce']}`);
      console.log(`  x-dds-signature:  ${headers['x-dds-signature'] ? `${headers['x-dds-signature'].slice(0, 16)}...` : '(none)'}`);
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: data ? bodyStr : undefined,
        signal: controller.signal
      }).finally(() => clearTimeout(timer));

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = responseData?.message || responseData?.error || `DDS API Request Failed (${response.status})`;
        const status = response.status;
        const errCode = responseData?.error || '';

        if (status === 404 && (errCode === 'APPLICATION_NOT_FOUND' || msg.includes('Step 1 Failed') || msg.includes('Application'))) {
          throw new DDSApplicationNotFoundError(msg, responseData);
        } else if (status === 401 && (errCode === 'INVALID_API_KEY' || msg.includes('Step 3 Failed'))) {
          throw new DDSInvalidApiKeyError(msg, responseData);
        } else if (status === 401 && (errCode === 'INVALID_SECRET_KEY' || msg.includes('Step 4 Failed'))) {
          throw new DDSInvalidSecretKeyError(msg, responseData);
        } else if (status === 401 && (errCode === 'INVALID_HMAC_SIGNATURE' || msg.includes('Step 5 Failed'))) {
          throw new DDSInvalidSignatureError(msg, responseData);
        } else if (status === 401) {
          throw new DDSUnauthorizedError(msg, responseData);
        } else if (status === 429) {
          throw new DDSRateLimitError(msg, responseData);
        } else if (status >= 500) {
          throw new DDSServerError(msg, responseData);
        } else if (status === 400 || status === 403 || status === 404) {
          throw new DDSError(msg, responseData?.error || 'API_ERROR', status, responseData);
        }
        throw new DDSError(msg, 'HTTP_ERROR', status, responseData);
      }

      return responseData;

    } catch (error) {
      if (error instanceof DDSError) {
        throw error;
      }

      if (error.name === 'AbortError') {
        throw new DDSTimeoutError(`Request timed out after ${this.timeout}ms reaching DDS server (${this.baseUrl}).`);
      }

      // Network error or timeout -> retry logic
      if (attempt < this.maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 200;
        await new Promise(r => setTimeout(r, backoffMs));
        return this._request(method, endpoint, data, attempt + 1);
      }

      throw new DDSNetworkError(`Network failure while reaching DDS server (${this.baseUrl}): ${error.message}`);
    }
  }

  /**
   * Initiate push authentication request
   * @param {object} params
   * @param {string} [params.userId] - DDS User ID (dds_usr_...)
   * @param {string} [params.mobileNumber] - User Mobile Number (+91...)
   * @param {number} [params.codeLength=6] - Code length (4 to 20 digits)
   * @param {number} [params.expiresIn=120] - Expiry in seconds (30, 60, 120)
   * @param {object} [params.metadata] - Optional request metadata
   * @returns {Promise<{ success: boolean, authenticationId: string, status: string }>}
   */
  async authenticate({ userId, mobileNumber, phone, codeLength = 6, expiresIn = 120, metadata = {} }) {
    const targetPhone = mobileNumber || phone;
    if (!userId && !targetPhone) {
      throw new DDSConfigurationError('Either "userId" or "mobileNumber" is required for authentication.');
    }

    return await this._request('POST', '/api/v1/auth/request', {
      userId,
      mobileNumber: targetPhone,
      codeLength,
      expiresIn,
      metadata
    });
  }

  /**
   * Verify authentication code manually
   * @param {object} params
   * @param {string} params.authenticationId - Authentication ID (auth_...)
   * @param {string} params.verificationCode - Verification code
   * @returns {Promise<{ success: boolean, status: string, userVerified: boolean }>}
   */
  async verify({ authenticationId, requestId, verificationCode }) {
    const authId = authenticationId || requestId;
    if (!authId || !verificationCode) {
      throw new DDSError('Both "authenticationId" and "verificationCode" are required.', 'MISSING_PARAMS');
    }

    return await this._request('POST', '/api/v1/auth/verify', {
      authenticationId: authId,
      verificationCode
    });
  }

  /**
   * Alias for verify
   */
  async verifyCode(params) {
    return this.verify(params);
  }

  /**
   * Poll / Check authentication request status
   * @param {string} authenticationId
   * @returns {Promise<{ success: boolean, authenticationId: string, status: string, approved: boolean }>}
   */
  async getStatus(authenticationId) {
    if (!authenticationId || typeof authenticationId !== 'string') {
      throw new DDSError('"authenticationId" is required.', 'MISSING_PARAMS');
    }
    return await this._request('GET', `/api/v1/auth/status/${encodeURIComponent(authenticationId)}`);
  }

  /**
   * Auto Polling helper: Polls getStatus until approved/rejected or timeout reached
   * @param {string} authenticationId
   * @param {object} [options]
   * @param {number} [options.intervalMs=2000] - Polling interval in ms
   * @param {number} [options.timeoutMs=120000] - Max duration in ms
   * @returns {Promise<{ success: boolean, authenticationId: string, status: string, approved: boolean }>}
   */
  async waitForApproval(authenticationId, options = {}) {
    const intervalMs = options.intervalMs || 2000;
    const timeoutMs = options.timeoutMs || 120000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const res = await this.getStatus(authenticationId);
      const statusLower = (res.status || '').toLowerCase();

      if (statusLower === 'approved' || res.approved === true) {
        return { ...res, status: 'approved', approved: true };
      }
      if (statusLower === 'rejected') {
        return { ...res, status: 'rejected', approved: false };
      }
      if (statusLower === 'expired' || statusLower === 'cancelled') {
        return { ...res, status: statusLower, approved: false };
      }

      await new Promise(r => setTimeout(r, intervalMs));
    }

    throw new DDSTimeoutError(`waitForApproval timed out waiting for approval of ${authenticationId}.`);
  }

  /**
   * Cancel pending authentication request
   * @param {string} authenticationId
   * @returns {Promise<{ success: boolean, status: string }>}
   */
  async cancel(authenticationId) {
    if (!authenticationId || typeof authenticationId !== 'string') {
      throw new DDSError('"authenticationId" is required.', 'MISSING_PARAMS');
    }
    return await this._request('POST', '/api/v1/auth/cancel', { authenticationId });
  }

  /**
   * Get current application usage and limits
   * @returns {Promise<{ success: boolean, dailyUsage: number, dailyLimit: number, monthlyUsage: number, monthlyLimit: number }>}
   */
  async getUsage() {
    return await this._request('GET', '/api/v1/auth/usage');
  }

  /**
   * Validate Developer Credentials against DDS Server
   * @returns {Promise<{ success: boolean, valid: boolean }>}
   */
  async validateCredentials() {
    try {
      const res = await this.getUsage();
      return { success: true, valid: !!res.success, details: res };
    } catch (err) {
      return { success: false, valid: false, error: err.message };
    }
  }

  /**
   * Logout helper (invalidates session/status)
   */
  async logout(authenticationId) {
    if (authenticationId) {
      return this.cancel(authenticationId);
    }
    return { success: true, message: 'Logged out.' };
  }

  /**
   * Refresh API Keys notification
   */
  async refreshKeys() {
    return await this._request('GET', '/api/v1/auth/usage');
  }

  /**
   * Check DDS API Health
   * @returns {Promise<{ success: boolean, status: string, timestamp: string }>}
   */
  async health() {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/auth/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        return await response.json();
      }
      throw new DDSServerError(`Health check returned HTTP ${response.status}`);
    } catch (err) {
      if (err instanceof DDSError) throw err;
      throw new DDSNetworkError(`Health check failed: ${err.message}`);
    }
  }
}

module.exports = DDS;
