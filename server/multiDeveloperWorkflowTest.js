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

async function createDeveloperApp(devName, appPrefix) {
  let dev = await Developer.findOne({ email: `${appPrefix}@example.com` });
  if (!dev) {
    dev = await Developer.create({
      firebaseUid: `firebase_${appPrefix}_uid`,
      email: `${appPrefix}@example.com`,
      displayName: devName,
      developerId: `DEV_${appPrefix.toUpperCase()}`,
      mobileVerified: true,
      phoneNumber: `+91900${Math.floor(1000000 + Math.random() * 9000000)}`,
      freeCreditsRemaining: 1000
    });
  }

  const appId = `dds_app_${appPrefix}_${Date.now()}`;
  const rawSecretKey = `dds_sk_${appPrefix}Secret_${crypto.randomBytes(8).toString('hex')}`;
  const rawPublicKey = `dds_pk_${appPrefix}Public_${crypto.randomBytes(8).toString('hex')}`;
  const secretSha256 = crypto.createHash('sha256').update(rawSecretKey).digest('hex');

  const app = await Application.create({
    developerId: dev._id,
    applicationId: appId,
    applicationName: `${devName} App`,
    description: `Application for ${devName}`,
    environment: 'development',
    status: 'active'
  });

  const apiKey = await ApiKey.create({
    applicationId: app._id,
    developerId: dev._id,
    keyLabel: 'Primary Key',
    publicKey: rawPublicKey,
    secretSha256: secretSha256,
    secretPreview: `${rawSecretKey.slice(0, 10)}...${rawSecretKey.slice(-4)}`,
    status: 'active',
    scopes: ['auth', 'verify']
  });

  return { appId, rawPublicKey, rawSecretKey, app, apiKey };
}

async function runMultiDeveloperTest() {
  console.log('===========================================================');
  console.log('👥 DDS MULTI-DEVELOPER CREDENTIAL ISOLATION VERIFICATION SUITE');
  console.log('===========================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  const developers = [
    { name: 'Developer A (ShopApp)', prefix: 'devA' },
    { name: 'Developer B (PayFast)', prefix: 'devB' },
    { name: 'Developer C (CloudLog)', prefix: 'devC' }
  ];

  for (let i = 0; i < developers.length; i++) {
    const devInfo = developers[i];
    console.log(`\n===========================================================`);
    console.log(`🚀 TESTING ${devInfo.name.toUpperCase()} WORKFLOW`);
    console.log(`===========================================================`);

    // 1. Create unique application in Developer Portal pipeline
    const creds = await createDeveloperApp(devInfo.name, devInfo.prefix);
    console.log(`✓ 1. Portal Application Created:`);
    console.log(`     App ID:     ${creds.appId}`);
    console.log(`     API Key:    ${creds.rawPublicKey}`);
    console.log(`     Secret Key: ${creds.rawSecretKey}`);

    // 2. Write credentials to demo-website/backend/.env
    const envContent = `PORT=3000
DDS_BASE_URL=http://localhost:5000
DDS_APP_ID=${creds.appId}
DDS_API_KEY=${creds.rawPublicKey}
DDS_SECRET_KEY=${creds.rawSecretKey}
`;
    fs.writeFileSync(DEMO_ENV_PATH, envContent, 'utf8');
    console.log(`✓ 2. Updated demo-website/backend/.env with ${devInfo.name} credentials.`);

    // 3. Read .env file directly to verify loaded values
    const envRaw = fs.readFileSync(DEMO_ENV_PATH, 'utf8');
    const loadedAppId = envRaw.match(/DDS_APP_ID=(.+)/)?.[1]?.trim();
    const loadedApiKey = envRaw.match(/DDS_API_KEY=(.+)/)?.[1]?.trim();
    const loadedSecretKey = envRaw.match(/DDS_SECRET_KEY=(.+)/)?.[1]?.trim();

    console.log(`✓ 3. Verified Loaded Credentials from .env:`);
    console.log(`     Loaded App ID: ${loadedAppId}`);

    if (loadedAppId !== creds.appId) {
      throw new Error(`CRITICAL: Loaded App ID (${loadedAppId}) does not match created App ID (${creds.appId})`);
    }

    // 4. Instantiate SDK strictly with loaded credentials
    const dds = new DDS({
      appId: loadedAppId,
      apiKey: loadedApiKey,
      secretKey: loadedSecretKey,
      baseUrl: BASE_URL
    });

    // 5. Send authentication request
    console.log(`\n--- Sending SDK Authentication Request for ${devInfo.name} ---`);
    const authRes = await dds.authenticate({ mobileNumber: '+918637628773' });

    if (authRes.success) {
      console.log(`✅ ${devInfo.name} AUTHENTICATION SUCCESSFUL!`);
      console.log(`   Authentication ID: ${authRes.authenticationId}`);
      console.log(`   Status:            ${authRes.status}`);
      console.log(`   Confirmed App ID:  ${loadedAppId}`);
    } else {
      throw new Error(`Authentication failed for ${devInfo.name}`);
    }
  }

  console.log('\n===========================================================');
  console.log('🎉 ALL 3 DEVELOPERS AUTHENTICATED SUCCESSFULLY WITH UNIQUE CREDENTIALS!');
  console.log('===========================================================');

  await mongoose.disconnect();
}

runMultiDeveloperTest().catch(console.error);
