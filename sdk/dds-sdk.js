/**
 * ==========================================================================
 * DDS PLATFORM OFFICIAL CLIENT SDK (JavaScript & Node.js)  —  v3.0
 * ==========================================================================
 *
 * Supports both instance-based and static singleton usage:
 *
 *   // Instance (recommended for multiple apps)
 *   const dds = new DDS({ apiKey: process.env.DDS_SECRET_KEY });
 *   const req = await dds.authenticate({ phoneNumber: '+918637628773' });
 *
 *   // Static singleton (Clerk / Firebase Admin style)
 *   DDS.init({ secretKey: process.env.DDS_SECRET_KEY });
 *   const req = await DDS.requestVerification({ userId: '+918637628773' });
 *
 * The developer does NOT specify the verification code length or expiry.
 * DDS reads those from the application's settings in the Developer Dashboard.
 * ==========================================================================
 */

const axios = require('axios');

// ─── Constants ────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 2000;
const DEFAULT_BASE_URL = 'http://localhost:5000';

// ─── DDSError ─────────────────────────────────────────────────────────────────
class DDSError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name   = 'DDSError';
    this.code   = code;
    this.status = status;
  }
}

// ─── Auth Request handle ─────────────────────────────────────────────────────
class AuthRequest {
  constructor(data, httpClient) {
    this.requestId              = data.requestId;
    this.verificationCode       = data.verificationCode;
    this.verificationCodeLength = data.verificationCodeLength || data.verificationCode?.length || 6;
    this.expiresIn              = data.expiresIn;
    this.expiresAt              = data.expiresAt;
    this.userOnline             = data.userOnline ?? false;
    this.status                 = 'PENDING';
    this._http                  = httpClient;
  }

  /**
   * Wait/poll for the user to approve or reject the request on their device.
   *
   * @param {object}   [options]
   * @param {number}   [options.intervalMs]  Polling interval in ms (default: 2000)
   * @param {Function} [options.onPoll]      Called with status on each poll
   * @returns {Promise<{ success: boolean, status: 'APPROVED'|'REJECTED'|'EXPIRED', ddsId?: string }>}
   */
  async waitForApproval(options = {}) {
    const intervalMs = options.intervalMs || POLL_INTERVAL_MS;
    const onPoll     = options.onPoll || null;
    const timeoutMs  = (this.expiresIn || 300) * 1000;
    const start      = Date.now();

    while (Date.now() - start < timeoutMs) {
      try {
        const statusRes = await this._http.get(`/api/v1/auth/status/${this.requestId}`);
        const { status, ddsId } = statusRes.data;

        if (typeof onPoll === 'function') onPoll({ status, ddsId });

        if (status !== 'PENDING') {
          return { success: status === 'APPROVED', status, ddsId: ddsId || null };
        }
      } catch (e) {
        console.error('[DDS SDK Poll Error]', e.message);
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    return { success: false, status: 'EXPIRED', ddsId: null };
  }

  /** Submit developer-generated verification code to DDS (Step 5) */
  async submitCode(verificationCode) {
    const res = await this._http.post('/api/v1/auth/code', {
      requestId: this.requestId,
      verificationCode
    });
    this.verificationCode = verificationCode;
    return res.data;
  }

  /** Single status check (no polling) */
  async checkStatus() {
    const res = await this._http.get(`/api/v1/auth/status/${this.requestId}`);
    return res.data;
  }
}

// ─── Main DDS class ───────────────────────────────────────────────────────────
class DDS {
  /**
   * Instantiate the DDS Client SDK.
   *
   * @param {Object|string} config
   * @param {string} config.apiKey    - The Developer Secret Key (dds_sk_xxxx)
   *                                    Alias: config.secretKey
   * @param {string} [config.baseUrl] - Custom gateway base URL
   * @param {string} [config.apiUrl]  - Alias for baseUrl
   * @param {number} [config.timeout] - Request timeout in ms
   */
  constructor(config) {
    let apiKey, baseUrl, timeout;

    if (typeof config === 'string') {
      apiKey  = config;
      baseUrl = process.env.DDS_API_URL || DEFAULT_BASE_URL;
      timeout = 10000;
    } else {
      apiKey  = config.apiKey || config.secretKey;
      baseUrl = config.baseUrl || config.apiUrl || process.env.DDS_API_URL || DEFAULT_BASE_URL;
      timeout = config.timeout || 10000;
    }

    if (!apiKey) {
      throw new DDSError(
        'DDS SDK Error: API key (secretKey / apiKey) is required. Set DDS_SECRET_KEY in your .env file.',
        'missing_api_key'
      );
    }

    this._apiKey = apiKey;
    this._http = axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      timeout,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent':    `@dds/auth-sdk/3.0.0 node/${process.version}`
      }
    });
  }

  /**
   * Request user authentication by phone number / user ID.
   *
   * DDS automatically reads the code length, expiry, and all other settings
   * from the application's configuration in the Developer Dashboard.
   * You do NOT need to pass codeLength here.
   *
   * @param {Object} params
   * @param {string} params.userId        - E.164 mobile number ("+918637628773")
   *                                        Alias: params.phoneNumber, params.ddsUserId
   * @param {string} [params.country]     - ISO country hint ("IN", "US") for 10-digit numbers
   * @param {string} [params.callbackUrl] - Webhook URL for real-time status updates
   * @returns {Promise<AuthRequest>}
   */
  async authenticate(params = {}) {
    const targetPhone = params.userId || params.phoneNumber || params.ddsUserId;
    if (!targetPhone) {
      throw new DDSError(
        'DDS SDK Error: User identity is required. Pass { userId: "+918637628773" }.',
        'missing_user_id'
      );
    }

    const country = params.country || 'IN';

    // Forward all developer-configured authentication flow settings in the payload
    const payload = {
      phoneNumber: targetPhone,
      country,
      ...(params.codeLength !== undefined && { codeLength: params.codeLength }),
      ...(params.expiresIn !== undefined && { expiresIn: params.expiresIn }),
      ...(params.expiry !== undefined && { expiry: params.expiry }),
      ...(params.maxAttempts !== undefined && { maxAttempts: params.maxAttempts }),
      ...(params.duplicateProtection !== undefined && { duplicateProtection: params.duplicateProtection }),
      ...(params.duplicateRequestDelay !== undefined && { duplicateRequestDelay: params.duplicateRequestDelay }),
      ...(params.webhookUrl !== undefined && { webhookUrl: params.webhookUrl }),
      ...(params.callbackUrl !== undefined && { callbackUrl: params.callbackUrl })
    };

    try {
      const response = await this._http.post('/api/v1/auth/request', payload);

      return new AuthRequest(response.data, this._http);
    } catch (error) {
      const data    = error.response?.data;
      const message = data?.message || error.message;
      const code    = data?.error   || 'request_failed';
      throw new DDSError(`DDS Authentication Request Failed: ${message}`, code, error.response?.status);
    }
  }

  /**
   * Alias for authenticate() — matches OpenAI/Clerk naming convention.
   */
  async requestVerification(params = {}) {
    return this.authenticate(params);
  }

  /**
   * Submit developer-generated verification code (Step 5).
   * @param {string} requestId
   * @param {string} verificationCode
   */
  async sendVerificationCode(requestId, verificationCode) {
    if (!requestId || !verificationCode) {
      throw new DDSError('requestId and verificationCode are required', 'missing_parameters');
    }
    const response = await this._http.post('/api/v1/auth/code', { requestId, verificationCode });
    return response.data;
  }

  /**
   * Manually check verification request status.
   * @param {string} requestId
   * @returns {Promise<Object>} Status payload
   */
  async getAuthStatus(requestId) {
    if (!requestId) throw new DDSError('requestId is required', 'missing_request_id');
    const response = await this._http.get(`/api/v1/auth/status/${requestId}`);
    return response.data;
  }
}

// ─── Static singleton (Firebase Admin / Clerk style) ─────────────────────────

let _instance = null;

/**
 * Initialize the DDS SDK once (module-level singleton).
 *
 * @param {object} config
 * @param {string} config.secretKey   Your DDS secret key
 * @param {string} [config.apiKey]    Alias for secretKey
 * @param {string} [config.baseUrl]   Gateway URL override
 *
 * @example
 *   DDS.init({ secretKey: process.env.DDS_SECRET_KEY });
 *   const req = await DDS.requestVerification({ userId: '+918637628773' });
 */
DDS.init = function (config = {}) {
  const key = config.secretKey || config.apiKey;
  _instance = new DDS({ apiKey: key, baseUrl: config.baseUrl || config.apiUrl, timeout: config.timeout });
  return _instance;
};

const _get = (method) => {
  if (!_instance) throw new DDSError(
    `Call DDS.init({ secretKey: 'dds_sk_...' }) before using DDS.${method}()`,
    'not_initialized'
  );
  return _instance;
};

DDS.authenticate         = (params) => _get('authenticate').authenticate(params);
DDS.requestVerification  = (params) => _get('requestVerification').requestVerification(params);
DDS.sendVerificationCode = (id, code) => _get('sendVerificationCode').sendVerificationCode(id, code);
DDS.getAuthStatus        = (id)     => _get('getAuthStatus').getAuthStatus(id);
DDS.requestVerification = (params) => _get('requestVerification').requestVerification(params);
DDS.getAuthStatus       = (id)     => _get('getAuthStatus').getAuthStatus(id);

// ─── Exports ──────────────────────────────────────────────────────────────────

DDS.DDSError    = DDSError;
DDS.AuthRequest = AuthRequest;

module.exports = DDS;
