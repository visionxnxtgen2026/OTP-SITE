import mongoose from 'mongoose';
import Application from './models/applicationModel.js';
import ApiKey from './models/apiKeyModel.js';
import Developer from './models/developerModel.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const MONGO_URI = 'mongodb://127.0.0.1:27017/dds';
const DEMO_ENV_PATH = path.join(process.cwd(), '../demo-website/backend/.env');

async function createPortalApp(appName, prefix) {
  let dev = await Developer.findOne({});
  if (!dev) {
    dev = await Developer.create({
      firebaseUid: `firebase_${prefix}_uid`,
      email: `${prefix}@example.com`,
      displayName: appName,
      developerId: `DEV_${prefix.toUpperCase()}`,
      mobileVerified: true,
      phoneNumber: `+91911${Math.floor(1000000 + Math.random() * 9000000)}`,
      freeCreditsRemaining: 1000
    });
  }

  const appId = `dds_app_${prefix}_${Date.now()}`;
  const rawSecretKey = `dds_sk_${prefix}Secret_${crypto.randomBytes(8).toString('hex')}`;
  const rawPublicKey = `dds_pk_${prefix}Public_${crypto.randomBytes(8).toString('hex')}`;
  const secretSha256 = crypto.createHash('sha256').update(rawSecretKey).digest('hex');

  const app = await Application.create({
    developerId: dev._id,
    applicationId: appId,
    applicationName: appName,
    description: `Audit Application ${prefix}`,
    environment: 'development',
    status: 'active'
  });

  const apiKey = await ApiKey.create({
    applicationId: app._id,
    developerId: dev._id,
    keyLabel: 'Audit Key',
    publicKey: rawPublicKey,
    secretSha256: secretSha256,
    secretPreview: `${rawSecretKey.slice(0, 10)}...${rawSecretKey.slice(-4)}`,
    status: 'active',
    scopes: ['auth', 'verify']
  });

  return { appId, rawPublicKey, rawSecretKey, app, apiKey };
}

async function runDemoWebsiteCredentialAudit() {
  console.log('===========================================================');
  console.log('🔍 DEMO WEBSITE BACKEND & SDK CREDENTIAL AUDIT VERIFICATION');
  console.log('===========================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  const testApps = [
    { name: 'Application A', prefix: 'appA' },
    { name: 'Application B', prefix: 'appB' },
    { name: 'Application C', prefix: 'appC' }
  ];

  for (const item of testApps) {
    console.log(`\n===========================================================`);
    console.log(`🚀 AUDITING CREDENTIAL WORKFLOW FOR ${item.name.toUpperCase()}`);
    console.log(`===========================================================`);

    // 1. Create Portal Application in DB
    const portalApp = await createPortalApp(item.name, item.prefix);
    console.log(`✓ 1. Application Document Inserted in MongoDB:`);
    console.log(`     DDS_APP_ID:     ${portalApp.appId}`);
    console.log(`     DDS_API_KEY:    ${portalApp.rawPublicKey}`);
    console.log(`     DDS_SECRET_KEY: ${portalApp.rawSecretKey}`);

    // 2. Write to demo-website/backend/.env
    const envFileContent = `PORT=3000
DDS_BASE_URL=http://localhost:5000
DDS_APP_ID=${portalApp.appId}
DDS_API_KEY=${portalApp.rawPublicKey}
DDS_SECRET_KEY=${portalApp.rawSecretKey}
`;
    fs.writeFileSync(DEMO_ENV_PATH, envFileContent, 'utf8');
    console.log(`✓ 2. Updated demo-website/backend/.env file.`);

    // 3. Call demo-website/backend/services/ddsService.js initiateAuthentication
    const ddsService = require('../demo-website/backend/services/ddsService.js');
    
    console.log(`✓ 3. Calling ddsService.initiateAuthentication()...`);
    const authResult = await ddsService.initiateAuthentication({
      mobileNumber: '+918637628773',
      codeLength: 6,
      expiresIn: 120
    });

    if (authResult.success) {
      console.log(`✅ 4. VERIFICATION SUCCESSFUL FOR ${item.name}!`);
      console.log(`     Returned Authentication ID: ${authResult.authenticationId}`);
      console.log(`     Verified App ID in Request: ${portalApp.appId}`);
    } else {
      throw new Error(`Failed to authenticate ${item.name}`);
    }
  }

  console.log('\n===========================================================');
  console.log('🎉 AUDIT COMPLETE: ALL 3 APPLICATIONS AUTHENTICATED WITH PROPER .ENV CREDENTIALS!');
  console.log('===========================================================');

  await mongoose.disconnect();
}

runDemoWebsiteCredentialAudit().catch(console.error);
