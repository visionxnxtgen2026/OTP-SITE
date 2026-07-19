/**
 * Custom Error class for @dds/auth-sdk
 */
class DDSError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code identifier
   * @param {number} [statusCode=400] - HTTP status code if applicable
   * @param {object} [details={}] - Additional debug details
   */
  constructor(message, code = 'dds_error', statusCode = 400, details = {}) {
    super(message);
    this.name = 'DDSError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DDSError);
    }
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

module.exports = { DDSError };
