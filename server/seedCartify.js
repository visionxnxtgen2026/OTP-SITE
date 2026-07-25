import mongoose from 'mongoose';
import crypto from 'crypto';
import Developer from './models/developerModel.js';
import Application from './models/applicationModel.js';
import ApiKey from './models/apiKeyModel.js';

async function seedCartify() {
  await mongoose.connect('mongodb://127.0.0.1:27017/dds');
  console.log('Connected to MongoDB database: dds');

  let dev = await Developer.findOneAndUpdate(
    { email: 'developer@cartify.com' },
    {
      $setOnInsert: {
        firebaseUid: 'dev_firebase_cartify_uid_999',
        email: 'developer@cartify.com',
        displayName: 'Cartify Inc.',
        developerId: 'DEV_CARTIFY',
        mobileVerified: true,
        phoneNumber: '+919999999999',
        freeCreditsRemaining: 9999
      }
    },
    { upsert: true, new: true }
  );

  const CARTIFY_APP_ID = 'dds_app_cartify1234567890';
  const CARTIFY_SECRET = 'dds_sk_CartifyDemoRealSecret20261234';
  const CARTIFY_PUBLIC = 'dds_pk_CartifyDemoPublic000000000000000';
  const secretHash = crypto.createHash('sha256').update(CARTIFY_SECRET).digest('hex');

  const app = await Application.findOneAndUpdate(
    { applicationId: CARTIFY_APP_ID },
    {
      $set: {
        developerId: dev._id,
        applicationId: CARTIFY_APP_ID,
        applicationName: 'Cartify Demo',
        description: 'Cartify Demo E-commerce Application',
        environment: 'development',
        status: 'active'
      }
    },
    { upsert: true, new: true }
  );

  await ApiKey.findOneAndUpdate(
    { publicKey: CARTIFY_PUBLIC },
    {
      $set: {
        applicationId: app._id,
        developerId: dev._id,
        keyLabel: 'Demo Integration',
        publicKey: CARTIFY_PUBLIC,
        secretSha256: secretHash,
        secretPreview: 'dds_sk_Cart...1234',
        status: 'active',
        scopes: ['auth', 'verify']
      }
    },
    { upsert: true, new: true }
  );

  console.log('✅ Seeded Cartify Application ID:', app.applicationId);
  console.log('✅ Seeded Cartify Public API Key:', CARTIFY_PUBLIC);
  await mongoose.disconnect();
}

seedCartify().catch(console.error);
