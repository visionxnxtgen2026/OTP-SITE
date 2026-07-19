const DDSClient = require('./DDSClient');
const { DDSError } = require('./Errors');
const { generateCode } = require('./CodeGenerator');

/**
 * @dds/server — Official DDS Backend SDK
 *
 * Zero-config usage (reads from environment variables):
 *   const { DDS } = require("@dds/server");
 *   const dds = new DDS();
 *   const result = await dds.requestAuth({ mobileNumber: "+919876543210" });
 *
 * Explicit config usage:
 *   const { DDS } = require("@dds/server");
 *   const dds = new DDS({
 *     appId:     process.env.DDS_APP_ID,
 *     publicKey: process.env.DDS_PUBLIC_KEY,
 *     secretKey: process.env.DDS_SECRET_KEY
 *   });
 *
 * Environment variables (set via `npx dds init` or manually in .env):
 *   DDS_APP_ID       — Your DDS Application ID  (app_xxxxxxxxxxxxxxxx)
 *   DDS_PUBLIC_KEY   — Your DDS Public API Key   (dds_pk_xxxxxxxx...)
 *   DDS_SECRET_KEY   — Your DDS Secret API Key   (dds_sk_xxxxxxxx...)
 *   DDS_BASE_URL     — Optional: DDS Server URL  (default: http://localhost:5000)
 */
function DDS(config) {
  return new DDSClient(config);
}

// Attach static classes & utilities
DDS.DDSClient = DDSClient;
DDS.DDSError = DDSError;
DDS.generateCode = generateCode;

// Named exports for CommonJS destructuring: const { DDS } = require("@dds/server")
module.exports = DDS;
module.exports.default = DDS;
module.exports.DDS = DDS;
module.exports.DDSClient = DDSClient;
module.exports.DDSError = DDSError;
module.exports.generateCode = generateCode;

