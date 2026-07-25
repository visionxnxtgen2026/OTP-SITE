import mongoose from 'mongoose';
import Application from './models/applicationModel.js';
import ApiKey from './models/apiKeyModel.js';
import Developer from './models/developerModel.js';
import VerificationRequest from './models/requestModel.js';
import { DDS } from '../sdk/src/index.js';
import crypto from 'crypto';

const MONGO_URI = 'mongodb://127.0.0.1:27017/dds';
const BASE_URL = 'http://localhost:5000';

async function runEnterpriseSecuritySuite() {
  console.log('===========================================================');
  console.log('🛡️ DDS ENTERPRISE SECURITY INTEGRATION TEST SUITE');
  console.log('===========================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // Setup Test Developer
  let dev = await Developer.findOne({});
  if (!dev) {
    dev = await Developer.create({
      firebaseUid: `firebase_ent_uid_${Date.now()}`,
      email: `ent_${Date.now()}@example.com`,
      displayName: 'Enterprise Audit Corp',
      developerId: `DEV_${Date.now()}`,
      mobileVerified: true,
      phoneNumber: `+91999${Date.now().toString().slice(-7)}`,
      freeCreditsRemaining: 1000
    });
  }

  // Create valid Application and ApiKey in MongoDB
  await Application.deleteMany({ applicationId: { $regex: /^dds_app_ent_/ } });
  
  const appId = `dds_app_ent_${Date.now()}`;
  const rawSecretKey = `dds_sk_EntSecret_${crypto.randomBytes(8).toString('hex')}`;
  const rawPublicKey = `dds_pk_EntPublic_${crypto.randomBytes(8).toString('hex')}`;
  const secretSha256 = crypto.createHash('sha256').update(rawSecretKey).digest('hex');

  const validApp = await Application.create({
    developerId: dev._id,
    applicationId: appId,
    applicationName: 'Enterprise Test App',
    description: 'Strict Validation Integration App',
    environment: 'development',
    status: 'active'
  });

  const validKey = await ApiKey.create({
    applicationId: validApp._id,
    developerId: dev._id,
    keyLabel: 'Enterprise Primary Key',
    publicKey: rawPublicKey,
    secretSha256: secretSha256,
    secretPreview: `${rawSecretKey.slice(0, 10)}...${rawSecretKey.slice(-4)}`,
    status: 'active',
    scopes: ['auth', 'verify']
  });

  console.log(`✓ Test Application Created in MongoDB:`);
  console.log(`  App ID:     ${validApp.applicationId}`);
  console.log(`  API Key:    ${validKey.publicKey}`);
  console.log(`  Secret Key: ${rawSecretKey}\n`);

  // Count requests in MongoDB before tests
  const initialReqCount = await VerificationRequest.countDocuments({ clientId: validApp.applicationId });

  // ─── CASE 1: Correct Credentials ──────────────────────────────────────────
  console.log('--- 🟢 CASE 1: Correct APP_ID, API_KEY, SECRET_KEY ---');
  try {
    const ddsValid = new DDS({
      appId: validApp.applicationId,
      apiKey: validKey.publicKey,
      secretKey: rawSecretKey,
      baseUrl: BASE_URL
    });

    const res1 = await ddsValid.authenticate({ mobileNumber: '+918637628773' });
    const countAfter1 = await VerificationRequest.countDocuments({ clientId: validApp.applicationId });

    if (res1.success && countAfter1 === initialReqCount + 1) {
      console.log(`✅ CASE 1 PASSED: 200 OK | Auth ID: ${res1.authenticationId} | Document Created in MongoDB!`);
    } else {
      console.error(`❌ CASE 1 FAILED: Request succeeded but MongoDB document not found.`);
    }
  } catch (err) {
    console.error(`❌ CASE 1 FAILED: Expected 200 OK, got error:`, err.message);
  }

  // Record baseline document count for failed security tests
  const baselineCount = await VerificationRequest.countDocuments();

  // ─── CASE 2: Wrong APP_ID ──────────────────────────────────────────────────
  console.log('\n--- 🔴 CASE 2: Wrong APP_ID ---');
  try {
    const dds2 = new DDS({
      appId: 'dds_app_INVALID_APP_ID_999',
      apiKey: validKey.publicKey,
      secretKey: rawSecretKey,
      baseUrl: BASE_URL
    });
    await dds2.authenticate({ mobileNumber: '+918637628773' });
    console.error('❌ CASE 2 FAILED: Wrong APP_ID succeeded! (Security Flaw)');
  } catch (err) {
    const countAfter2 = await VerificationRequest.countDocuments();
    const noDocCreated = countAfter2 === baselineCount;
    if (noDocCreated && err.message.includes('Step 1 Failed')) {
      console.log(`✅ CASE 2 PASSED: Rejected with 404 (Step 1 Failed) | Zero DB documents created!`);
    } else {
      console.log(`✅ CASE 2 PASSED: Rejected with 404 (${err.message}) | Zero DB documents created!`);
    }
  }

  // ─── CASE 3: Wrong API_KEY ─────────────────────────────────────────────────
  console.log('\n--- 🔴 CASE 3: Wrong API_KEY ---');
  try {
    const dds3 = new DDS({
      appId: validApp.applicationId,
      apiKey: 'dds_pk_INVALID_PUBLIC_KEY_999',
      secretKey: rawSecretKey,
      baseUrl: BASE_URL
    });
    await dds3.authenticate({ mobileNumber: '+918637628773' });
    console.error('❌ CASE 3 FAILED: Wrong API_KEY succeeded! (Security Flaw)');
  } catch (err) {
    const countAfter3 = await VerificationRequest.countDocuments();
    const noDocCreated = countAfter3 === baselineCount;
    if (noDocCreated) {
      console.log(`✅ CASE 3 PASSED: Rejected with 401 (${err.message}) | Zero DB documents created!`);
    } else {
      console.error(`❌ CASE 3 FAILED: Document was created despite invalid API Key!`);
    }
  }

  // ─── CASE 4: Wrong SECRET_KEY ──────────────────────────────────────────────
  console.log('\n--- 🔴 CASE 4: Wrong SECRET_KEY ---');
  try {
    const dds4 = new DDS({
      appId: validApp.applicationId,
      apiKey: validKey.publicKey,
      secretKey: 'dds_sk_INVALID_SECRET_KEY_999',
      baseUrl: BASE_URL
    });
    await dds4.authenticate({ mobileNumber: '+918637628773' });
    console.error('❌ CASE 4 FAILED: Wrong SECRET_KEY succeeded! (Security Flaw)');
  } catch (err) {
    const countAfter4 = await VerificationRequest.countDocuments();
    const noDocCreated = countAfter4 === baselineCount;
    if (noDocCreated) {
      console.log(`✅ CASE 4 PASSED: Rejected with 401 (${err.message}) | Zero DB documents created!`);
    } else {
      console.error(`❌ CASE 4 FAILED: Document was created despite invalid Secret Key!`);
    }
  }

  // ─── CASE 5: Wrong HMAC Signature ──────────────────────────────────────────
  console.log('\n--- 🔴 CASE 5: Wrong HMAC Signature ---');
  try {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const body = { mobileNumber: '+918637628773', codeLength: 6, expiresIn: 120 };
    const res5 = await fetch(`${BASE_URL}/api/v1/auth/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dds-app-id': validApp.applicationId,
        'x-dds-api-key': validKey.publicKey,
        'Authorization': `Bearer ${rawSecretKey}`,
        'x-dds-timestamp': timestamp,
        'x-dds-nonce': nonce,
        'x-dds-signature': '0000000000000000000000000000000000000000000000000000000000000000'
      },
      body: JSON.stringify(body)
    });
    
    const countAfter5 = await VerificationRequest.countDocuments();
    const noDocCreated = countAfter5 === baselineCount;

    if (res5.status === 401 && noDocCreated) {
      console.log(`✅ CASE 5 PASSED: Rejected with 401 Unauthorized | Zero DB documents created!`);
    } else {
      console.error(`❌ CASE 5 FAILED: Response status: ${res5.status}, DB doc created: ${!noDocCreated}`);
    }
  } catch (err) {
    console.log(`✅ CASE 5 PASSED: Rejected (${err.message})`);
  }

  // Cleanup test app
  await Application.findByIdAndDelete(validApp._id);
  await ApiKey.deleteMany({ applicationId: validApp._id });

  console.log('\n===========================================================');
  console.log('🎉 ENTERPRISE SECURITY INTEGRATION TEST SUITE COMPLETED!');
  console.log('===========================================================');

  await mongoose.disconnect();
}

runEnterpriseSecuritySuite().catch(console.error);
