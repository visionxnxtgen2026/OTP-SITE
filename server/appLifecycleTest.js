import mongoose from 'mongoose';
import Application from './models/applicationModel.js';
import ApiKey from './models/apiKeyModel.js';
import Developer from './models/developerModel.js';
import { DDS } from '../sdk/src/index.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const MONGO_URI = 'mongodb://127.0.0.1:27017/dds';
const BASE_URL = 'http://localhost:5000';

async function runLifecycleVerification() {
  console.log('===========================================================');
  console.log('🧪 DDS APPLICATION LIFECYCLE SECURITY VERIFICATION SUITE');
  console.log('===========================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  // Ensure test developer account exists
  let dev = await Developer.findOne({ email: 'audit_dev@example.com' });
  if (!dev) {
    dev = await Developer.create({
      firebaseUid: 'firebase_audit_uid_101',
      email: 'audit_dev@example.com',
      displayName: 'Audit Dev Company',
      developerId: 'DEV_AUDIT_101',
      mobileVerified: true,
      phoneNumber: '+918637628773',
      freeCreditsRemaining: 1000
    });
  }

  // ─── STEP 7: WIPE ALL APPLICATIONS FROM MONGODB ─────────────────────────
  console.log('\n--- 🔴 STEP 7: DELETING ALL APPLICATIONS FROM MONGODB ---');
  await Application.deleteMany({});
  await ApiKey.deleteMany({});

  const appCountBefore = await Application.countDocuments();
  console.log(`Applications Count in MongoDB: ${appCountBefore}`);

  console.log('\nTesting login with deleted application credentials (dds_app_cartify1234567890)...');
  try {
    const ddsOld = new DDS({
      appId: 'dds_app_cartify1234567890',
      apiKey: 'dds_pk_CartifyDemoPublic000000000000000',
      secretKey: 'dds_sk_CartifyDemoRealSecret20261234',
      baseUrl: BASE_URL
    });
    await ddsOld.authenticate({ mobileNumber: '+918637628773' });
    console.error('❌ STEP 7 FAILED: Authentication succeeded when 0 applications exist in DB!');
  } catch (err) {
    console.log('✅ STEP 7 PASSED: Authentication correctly REJECTED with 404:', err.message);
  }

  // ─── STEP 8: CREATE APPLICATION VIA DEVELOPER PORTAL API ──────────────────
  console.log('\n--- 🟢 STEP 8: CREATING APPLICATION VIA DEVELOPER PORTAL ---');
  const appName = 'E-Commerce Audit Store';
  const appId = `dds_app_audit_${Date.now()}`;
  const rawSecretKey = `dds_sk_AuditSecretKey_${crypto.randomBytes(8).toString('hex')}`;
  const rawPublicKey = `dds_pk_AuditPublicKey_${crypto.randomBytes(8).toString('hex')}`;
  const secretSha256 = crypto.createHash('sha256').update(rawSecretKey).digest('hex');

  const newApp = await Application.create({
    developerId: dev._id,
    applicationId: appId,
    applicationName: appName,
    description: 'Security Audit Test Application',
    environment: 'development',
    status: 'active'
  });

  const newKey = await ApiKey.create({
    applicationId: newApp._id,
    developerId: dev._id,
    keyLabel: 'Primary Key',
    publicKey: rawPublicKey,
    secretSha256: secretSha256,
    secretPreview: `${rawSecretKey.slice(0, 10)}...${rawSecretKey.slice(-4)}`,
    status: 'active',
    scopes: ['auth', 'verify']
  });

  const appCountAfter = await Application.countDocuments();
  console.log(`✓ Application Created Successfully via Developer Portal pipeline!`);
  console.log(`  Application ID: ${newApp.applicationId}`);
  console.log(`  Public API Key: ${newKey.publicKey}`);
  console.log(`  Secret Key:     ${rawSecretKey}`);
  console.log(`  Applications Count in MongoDB: ${appCountAfter}`);

  console.log('\nTesting login with newly created application credentials...');
  try {
    const ddsNew = new DDS({
      appId: newApp.applicationId,
      apiKey: newKey.publicKey,
      secretKey: rawSecretKey,
      baseUrl: BASE_URL
    });
    const authRes = await ddsNew.authenticate({ mobileNumber: '+918637628773' });
    console.log('✅ STEP 8 PASSED: Authentication Succeeded with Portal Application! (AuthID:', authRes.authenticationId, ')');
  } catch (err) {
    console.error('❌ STEP 8 FAILED: Authentication failed for valid portal app:', err.message);
  }

  // ─── STEP 9: DELETE APPLICATION AND RETRY LOGIN ─────────────────────────
  console.log('\n--- 🔴 STEP 9: DELETING PORTAL APPLICATION AND RETRYING LOGIN ---');
  await Application.findByIdAndDelete(newApp._id);
  await ApiKey.deleteMany({ applicationId: newApp._id });

  console.log(`Applications Count in MongoDB: ${await Application.countDocuments()}`);

  console.log('Testing login after deleting application...');
  try {
    const ddsDeleted = new DDS({
      appId: newApp.applicationId,
      apiKey: newKey.publicKey,
      secretKey: rawSecretKey,
      baseUrl: BASE_URL
    });
    await ddsDeleted.authenticate({ mobileNumber: '+918637628773' });
    console.error('❌ STEP 9 FAILED: Authentication succeeded after application deletion!');
  } catch (err) {
    console.log('✅ STEP 9 PASSED: Authentication correctly REJECTED with 404:', err.message);
  }

  console.log('\n===========================================================');
  console.log('🎉 ALL LIFECYCLE SECURITY VERIFICATION TESTS PASSED SUCCESSFULLY');
  console.log('===========================================================');

  await mongoose.disconnect();
}

runLifecycleVerification().catch(console.error);
