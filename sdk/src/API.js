const axios = require('axios');
const { DDSError } = require('./Errors');

/**
 * DDS HTTP API Client Wrapper
 */
class API {
  /**
   * @param {object} config
   * @param {string} config.baseUrl
   * @param {string} config.publicKey
   * @param {string} config.secretKey
   * @param {string} config.appId
   */
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.publicKey = config.publicKey;
    this.secretKey = config.secretKey;
    this.appId = config.appId;

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.secretKey}`,
        'x-dds-public-key': this.publicKey,
        'x-app-id': this.appId
      }
    });
  }

  /**
   * POST /api/v1/auth/request — Initiate authentication request
   * @param {object} params
   * @param {string} params.mobileNumber
   * @returns {Promise<{ success: boolean, requestId: string, popupDelivered: boolean }>}
   */
  async requestAuth({ mobileNumber }) {
    try {
      const response = await this.http.post('/api/v1/auth/request', {
        phone: mobileNumber,
        mobileNumber,
        applicationId: this.appId
      });
      return response.data;
    } catch (err) {
      throw this._handleError(err, 'failed_to_request_auth');
    }
  }

  /**
   * POST /api/v1/auth/code — Submit developer-generated code to DDS
   * @param {object} params
   * @param {string} params.requestId
   * @param {string} params.verificationCode
   * @returns {Promise<{ success: boolean, codeStored: boolean }>}
   */
  async submitCode({ requestId, verificationCode }) {
    try {
      const response = await this.http.post('/api/v1/auth/code', {
        requestId,
        verificationCode
      });
      return response.data;
    } catch (err) {
      throw this._handleError(err, 'failed_to_submit_code');
    }
  }

  /**
   * GET /api/v1/auth/status/:requestId — Poll status of authentication request
   * @param {string} requestId
   * @returns {Promise<{ status: string, approved: boolean, enteredCode: string, ddsId: string }>}
   */
  async getStatus(requestId) {
    try {
      const response = await this.http.get(`/api/v1/auth/status/${requestId}`);
      return response.data;
    } catch (err) {
      throw this._handleError(err, 'failed_to_get_status');
    }
  }

  /**
   * GET /api/config/public — Verify DDS server connectivity (no auth required)
   * Used by `npx dds init` CLI to confirm the server is reachable.
   * @returns {Promise<{ connected: boolean, serverName?: string }>}
   */
  async ping() {
    try {
      const response = await this.http.get('/api/config/public');
      return {
        connected: true,
        serverName: response.data?.appName || 'DDS Server',
        version: response.data?.version || null
      };
    } catch (err) {
      if (err.response) {
        // Server responded — it's reachable even if the endpoint differs
        return { connected: true, serverName: 'DDS Server', version: null };
      }
      return { connected: false, error: err.message || 'Could not reach DDS Server' };
    }
  }

  /**
   * Normalize axios HTTP errors into DDSError instances
   */
  _handleError(err, defaultCode) {
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data || {};
      const code = data.error || (status === 401 ? 'unauthorized' : status === 404 ? 'not_found' : defaultCode);
      const msg = data.message || err.message;
      return new DDSError(msg, code, status, data);
    }
    return new DDSError(err.message || 'Network error connecting to DDS server', 'network_error', 500);
  }
}

module.exports = { API };
