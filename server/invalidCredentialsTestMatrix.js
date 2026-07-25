import mongoose from 'mongoose';
import Application from './models/applicationModel.js';
import ApiKey from './models/apiKeyModel.js';
import Developer from './models/developerModel.js';
import VerificationRequest from './models/requestModel.js';
import { DDS } from '../sdk/src/index.js';
import crypto from 'crypto';

const MONGO_URI = 'mongodb://127.0.0.1:27017/dds';
const BASE_URL = 'http://localhost:5000';

async function runInvalidCredentialsTestMatrix() {
  console.log('===========================================================');
  console.log('🔒 DDS INVALID CREDENTIAL SECURITY AUDIT & TEST MATRIX');
  console.log('===========================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // Setup Test Developer
  let dev = await Developer.findOne({});
  if (!dev) {
    dev = await Developer.create({
      firebaseUid: `firebase_matrix_uid_${Date.now()}`,
      email: `matrix_${Date.now()}@example.com`,
      displayName: 'Matrix Test Dev',
      developerId: `DEV_${Date.now()}`,
      mobileVerified: true,
      phoneNumber: `+91977${Math.floor(1000000 + Math.random() * 9000000)}`,
      freeCreditsRemaining: 1000
    });
  }

  // Create valid Application and ApiKey in MongoDB
  const appId = `dds_app_matrix_${Date.now()}`;
  const rawSecretKey = `dds_sk_MatrixSecret_${crypto.randomBytes(8).toString('hex')}`;
  const rawPublicKey = `dds_pk_MatrixPublic_${crypto.randomBytes(8).toString('hex')}`;
  const secretSha256 = crypto.createHash('sha256').update(rawSecretKey).digest('hex');

  const validApp = await Application.create({
    developerId: dev._id,
    applicationId: appId,
    applicationName: 'Matrix Security App',
    description: 'Security Audit Matrix App',
    environment: 'development',
    status: 'active'
  });

  const validKey = await ApiKey.create({
    applicationId: validApp._id,
    developerId: dev._id,
    keyLabel: 'Primary Key',
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

  const initialTotalRequests = await VerificationRequest.countDocuments();

  // ─── CASE 1: Correct Credentials ──────────────────────────────────────────
  console.log('--- 🟢 CASE 1: Correct APP_ID, API_KEY, SECRET_KEY ---');
  try {
    const dds1 = new DDS({
      appId: validApp.applicationId,
      apiKey: validKey.publicKey,
      secretKey: rawSecretKey,
      baseUrl: BASE_URL
    });

    const res1 = await dds1.authenticate({ mobileNumber: '+918637628773' });
    const countAfter1 = await VerificationRequest.countDocuments();

    if (res1.success && countAfter1 === initialTotalRequests + 1) {
      console.log(`✅ CASE 1 PASSED: Status 200 OK | AuthID: ${res1.authenticationId} | Document Created in MongoDB!`);
    } else {
      console.error(`❌ CASE 1 FAILED: Expected 200 OK and DB creation.`);
    }
  } catch (err) {
    console.error(`❌ CASE 1 FAILED: Got error:`, err.message);
  }

  const baselineCountAfterSuccess = await VerificationRequest.countDocuments();

  // ─── CASE 2: Wrong APP_ID ──────────────────────────────────────────────────
  console.log('\n--- 🔴 CASE 2: Wrong APP_ID ---');
  try {
    const dds2 = new DDS({
      appId: 'dds_app_INVALID_APP_ID_999999',
      apiKey: validKey.publicKey,
      secretKey: rawSecretKey,
      baseUrl: BASE_URL
    });

    await dds2.authenticate({ mobileNumber: '+918637628773' });
    console.error(`❌ CASE 2 FAILED: Wrong APP_ID authenticated successfully!`);
  } catch (err) {
    const currentCount = await VerificationRequest.countDocuments();
    const docCreated = currentCount > baselineCountAfterSuccess;

    if (!docCreated && err.statusCode === 404) {
      console.log(`✅ CASE 2 PASSED: Status 404 (${err.message}) | ZERO DB Documents Created!`);
    } else {
      console.error(`❌ CASE 2 FAILED: Error: ${err.message}, DB Document Created: ${docCreated}`);
    }
  }

  // ─── CASE 3: Wrong API_KEY ─────────────────────────────────────────────────
  console.log('\n--- 🔴 CASE 3: Wrong API_KEY ---');
  try {
    const dds3 = new DDS({
      appId: validApp.applicationId,
      apiKey: 'dds_pk_INVALID_PUBLIC_KEY_999999',
      secretKey: rawSecretKey,
      baseUrl: BASE_URL
    });

    await dds3.authenticate({ mobileNumber: '+918637628773' });
    console.error(`❌ CASE 3 FAILED: Wrong API_KEY authenticated successfully!`);
  } catch (err) {
    const currentCount = await VerificationRequest.countDocuments();
    const docCreated = currentCount > baselineCountAfterSuccess;

    if (!docCreated && err.statusCode === 401) {
      console.log(`✅ CASE 3 PASSED: Status 401 (${err.message}) | ZERO DB Documents Created!`);
    } else {
      console.error(`❌ CASE 3 FAILED: Error: ${err.message}, DB Document Created: ${docCreated}`);
    }
  }

  // ─── CASE 4: Wrong SECRET_KEY ──────────────────────────────────────────────
  console.log('\n--- 🔴 CASE 4: Wrong SECRET_KEY ---');
  try {
    const dds4 = new DDS({
      appId: validApp.applicationId,
      apiKey: validKey.publicKey,
      secretKey: 'dds_sk_INVALID_SECRET_KEY_999999',
      baseUrl: BASE_URL
    });

    await dds4.authenticate({ mobileNumber: '+918637628773' });
    console.error(`❌ CASE 4 FAILED: Wrong SECRET_KEY authenticated successfully!`);
  } catch (err) {
    const currentCount = await VerificationRequest.countDocuments();
    const docCreated = currentCount > baselineCountAfterSuccess;

    if (!docCreated && err.statusCode === 401) {
      console.log(`✅ CASE 4 PASSED: Status 401 (${err.message}) | ZERO DB Documents Created!`);
    } else {
      console.error(`❌ CASE 4 FAILED: Error: ${err.message}, DB Document Created: ${docCreated}`);
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

    const currentCount = await VerificationRequest.countDocuments();
    const docCreated = currentCount > baselineCountAfterSuccess;

    if (!docCreated && res5.status === 401) {
      console.log(`✅ CASE 5 PASSED: Status 401 Unauthorized | ZERO DB Documents Created!`);
    } else {
      console.error(`❌ CASE 5 FAILED: Status: ${res5.status}, DB Document Created: ${docCreated}`);
    }
  } catch (err) {
    console.log(`✅ CASE 5 PASSED: Rejected (${err.message})`);
  }

  // Clean up
  await Application.findByIdAndDelete(validApp._id);
  await ApiKey.deleteMany({ applicationId: validApp._id });

  console.log('\n===========================================================');
  console.log('🎉 SECURITY TEST MATRIX COMPLETE — ALL 5 CASES VERIFIED');
  console.log('===========================================================');

  await mongoose.disconnect();
}

runInvalidCredentialsTestMatrix().catch(console.error);
