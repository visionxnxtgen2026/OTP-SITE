/**
 * Custom Error Hierarchy for @dds/node-sdk
 */

class DDSError extends Error {
  constructor(message, code = 'DDS_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'DDSError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details
    };
  }
}

class DDSConfigurationError extends DDSError {
  constructor(message, details = {}) {
    super(message, 'DDS_CONFIGURATION_ERROR', 400, details);
    this.name = 'DDSConfigurationError';
  }
}

class DDSApplicationNotFoundError extends DDSError {
  constructor(message = 'Application not found on DDS platform.', details = {}) {
    super(message, 'DDS_APPLICATION_NOT_FOUND', 404, details);
    this.name = 'DDSApplicationNotFoundError';
  }
}

class DDSInvalidApiKeyError extends DDSError {
  constructor(message = 'Invalid API Key provided.', details = {}) {
    super(message, 'DDS_INVALID_API_KEY', 401, details);
    this.name = 'DDSInvalidApiKeyError';
  }
}

class DDSInvalidSecretKeyError extends DDSError {
  constructor(message = 'Invalid Secret Key provided.', details = {}) {
    super(message, 'DDS_INVALID_SECRET_KEY', 401, details);
    this.name = 'DDSInvalidSecretKeyError';
  }
}

class DDSInvalidSignatureError extends DDSError {
  constructor(message = 'Invalid HMAC Signature.', details = {}) {
    super(message, 'DDS_INVALID_HMAC_SIGNATURE', 401, details);
    this.name = 'DDSInvalidSignatureError';
  }
}

class DDSUnauthorizedError extends DDSError {
  constructor(message = 'Unauthorized request.', details = {}) {
    super(message, 'DDS_UNAUTHORIZED', 401, details);
    this.name = 'DDSUnauthorizedError';
  }
}

class DDSRateLimitError extends DDSError {
  constructor(message = 'Rate limit exceeded.', details = {}) {
    super(message, 'DDS_RATE_LIMIT_ERROR', 429, details);
    this.name = 'DDSRateLimitError';
  }
}

class DDSServerError extends DDSError {
  constructor(message = 'Internal DDS Server Error.', details = {}) {
    super(message, 'DDS_SERVER_ERROR', 500, details);
    this.name = 'DDSServerError';
  }
}

class DDSTimeoutError extends DDSError {
  constructor(message = 'Request timed out.', details = {}) {
    super(message, 'DDS_TIMEOUT_ERROR', 408, details);
    this.name = 'DDSTimeoutError';
  }
}

class DDSNetworkError extends DDSError {
  constructor(message = 'Network error or DDS backend unreachable.', details = {}) {
    super(message, 'DDS_NETWORK_ERROR', 503, details);
    this.name = 'DDSNetworkError';
  }
}

class DDSAuthenticationError extends DDSError {
  constructor(message, statusCode = 401, details = {}) {
    super(message, 'DDS_AUTHENTICATION_ERROR', statusCode, details);
    this.name = 'DDSAuthenticationError';
  }
}

module.exports = {
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
};
