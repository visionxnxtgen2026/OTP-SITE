const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valParts] = trimmed.split('=');
        const val = valParts.join('=').trim();
        if (key) {
          process.env[key.trim()] = val;
        }
      }
    });
  }
}

loadEnv();

let DDS;
try {
  DDS = require('@dds/node-sdk').DDS;
} catch (_) {
  DDS = require('../../../sdk/src').DDS;
}

const maskKey = (key) => key ? `${key.slice(0, 10)}...${key.slice(-4)}` : '(missing)';

// Helper to get active DDS SDK instance cleanly from process.env on every request
const getDDSInstance = () => {
  loadEnv();
  return new DDS({
    appId: process.env.DDS_APP_ID,
    apiKey: process.env.DDS_API_KEY,
    secretKey: process.env.DDS_SECRET_KEY,
    baseUrl: process.env.DDS_BASE_URL || 'http://localhost:5000'
  });
};

/**
 * Trigger DDS authentication request
 */
const initiateAuthentication = async ({ mobileNumber, codeLength = 6, expiresIn = 120 }) => {
  const dds = getDDSInstance();

  console.log(`\n==========================================================`);
  console.log(`[Demo SDK Outgoing Request Audit]`);
  console.log(`  SDK Base URL: ${dds.baseUrl}`);
  console.log(`  SDK App ID:   ${dds.appId}`);
  console.log(`  SDK API Key:  ${maskKey(dds.apiKey)}`);
  console.log(`==========================================================\n`);

  return await dds.authenticate({
    mobileNumber,
    codeLength,
    expiresIn
  });
};

/**
 * Poll DDS authentication status
 */
const getAuthenticationStatus = async (authenticationId) => {
  const dds = getDDSInstance();
  return await dds.getStatus(authenticationId);
};

module.exports = {
  getDDSInstance,
  initiateAuthentication,
  getAuthenticationStatus
};
