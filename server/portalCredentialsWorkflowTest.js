import mongoose from 'mongoose';
import Application from './models/applicationModel.js';
import ApiKey from './models/apiKeyModel.js';
import Developer from './models/developerModel.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DDS } from '../sdk/src/index.js';

const MONGO_URI = 'mongodb://127.0.0.1:27017/dds';
const BASE_URL = 'http://localhost:5000';
const DEMO_ENV_PATH = path.join(process.cwd(), '../demo-website/backend/.env');

async function runPortalCredentialsWorkflowTest() {
  console.log('===========================================================');
  console.log('🧪 DEVELOPER PORTAL CREDENTIAL WORKFLOW VERIFICATION TEST');
  console.log('===========================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // Step A: Find or create developer
  let dev = await Developer.findOne({});
  if (!dev) {
    dev = await Developer.create({
      firebaseUid: `firebase_portal_uid_${Date.now()}`,
      email: `portal_dev_${Date.now()}@example.com`,
      displayName: 'Portal Developer',
      developerId: `DEV_${Date.now()}`,
      mobileVerified: true,
      phoneNumber: `+91988${Date.now().toString().slice(-7)}`,
      freeCreditsRemaining: 1000
    });
  }

  // Step B: Create a brand-new Application in Developer Portal
  const newAppId = `dds_app_portal_${Date.now()}`;
  const rawSecretKey = `dds_sk_PortalSecret_${crypto.randomBytes(8).toString('hex')}`;
  const rawPublicKey = `dds_pk_PortalPublic_${crypto.randomBytes(8).toString('hex')}`;
  const secretSha256 = crypto.createHash('sha256').update(rawSecretKey).digest('hex');

  const newApp = await Application.create({
    developerId: dev._id,
    applicationId: newAppId,
    applicationName: 'Brand New Portal App',
    description: 'Generated from Developer Portal UI',
    environment: 'development',
    status: 'active'
  });

  const newKey = await ApiKey.create({
    applicationId: newApp._id,
    developerId: dev._id,
    keyLabel: 'Primary Portal Key',
    publicKey: rawPublicKey,
    secretSha256: secretSha256,
    secretPreview: `${rawSecretKey.slice(0, 10)}...${rawSecretKey.slice(-4)}`,
    status: 'active',
    scopes: ['auth', 'verify']
  });

  console.log('✓ 1. Created Brand-New Application in Developer Portal (MongoDB):');
  console.log(`     New Application ID: ${newApp.applicationId}`);
  console.log(`     New API Key:        ${newKey.publicKey}`);
  console.log(`     New Secret Key:     ${rawSecretKey}\n`);

  // Step C: Copy credentials into demo-website/backend/.env
  const newEnvContent = `PORT=3000
DDS_BASE_URL=http://localhost:5000
DDS_APP_ID=${newApp.applicationId}
DDS_API_KEY=${newKey.publicKey}
DDS_SECRET_KEY=${rawSecretKey}
`;

  fs.writeFileSync(DEMO_ENV_PATH, newEnvContent, 'utf8');
  console.log(`✓ 2. Updated demo-website/backend/.env with NEW credentials.`);

  // Step D: Initialize SDK strictly from updated .env via dotenv
  console.log('\n--- 3. Testing Demo Website Backend & SDK with NEW .env Credentials ---');
  
  // Clear require cache for ddsService
  const ddsServicePath = path.join(process.cwd(), '../demo-website/backend/services/ddsService.js');
  
  // Re-read .env to verify loaded values
  const envRaw = fs.readFileSync(DEMO_ENV_PATH, 'utf8');
  const loadedAppId = envRaw.match(/DDS_APP_ID=(.+)/)?.[1]?.trim();
  const loadedApiKey = envRaw.match(/DDS_API_KEY=(.+)/)?.[1]?.trim();
  const loadedSecretKey = envRaw.match(/DDS_SECRET_KEY=(.+)/)?.[1]?.trim();

  console.log(`[Loaded from .env] App ID: ${loadedAppId}`);
  console.log(`[Loaded from .env] API Key: ${loadedApiKey}`);

  if (loadedAppId !== newApp.applicationId) {
    throw new Error(`Loaded App ID (${loadedAppId}) does not match new App ID (${newApp.applicationId})`);
  }

  // Step E: Trigger SDK authenticate call with NEW credentials
  const dds = new DDS({
    appId: loadedAppId,
    apiKey: loadedApiKey,
    secretKey: loadedSecretKey,
    baseUrl: BASE_URL
  });

  console.log('\n--- 4. Sending Request from SDK to DDS Backend ---');
  const authRes = await dds.authenticate({ mobileNumber: '+918637628773' });

  console.log(`\n✅ 5. AUTHENTICATION SUCCESSFUL WITH NEW PORTAL CREDENTIALS!`);
  console.log(`     Authentication ID: ${authRes.authenticationId}`);
  console.log(`     Status: ${authRes.status}`);

  console.log('\n===========================================================');
  console.log('🎉 DEVELOPER PORTAL CREDENTIAL WORKFLOW VERIFIED SUCCESSFULLY!');
  console.log('===========================================================');

  await mongoose.disconnect();
}

runPortalCredentialsWorkflowTest().catch(console.error);
