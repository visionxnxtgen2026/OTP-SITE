const DDS = require('./DDS');
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

module.exports = DDS;
module.exports.default = DDS;
module.exports.DDS = DDS;

module.exports.DDSError = DDSError;
module.exports.DDSConfigurationError = DDSConfigurationError;
module.exports.DDSApplicationNotFoundError = DDSApplicationNotFoundError;
module.exports.DDSInvalidApiKeyError = DDSInvalidApiKeyError;
module.exports.DDSInvalidSecretKeyError = DDSInvalidSecretKeyError;
module.exports.DDSInvalidSignatureError = DDSInvalidSignatureError;
module.exports.DDSUnauthorizedError = DDSUnauthorizedError;
module.exports.DDSRateLimitError = DDSRateLimitError;
module.exports.DDSServerError = DDSServerError;
module.exports.DDSTimeoutError = DDSTimeoutError;
module.exports.DDSNetworkError = DDSNetworkError;
module.exports.DDSAuthenticationError = DDSAuthenticationError;
