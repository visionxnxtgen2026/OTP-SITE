/**
 * One-time migration: secretHash → secretSha256
 * 
 * Copies the SHA-256 hash from the legacy `secretHash` field to the canonical
 * `secretSha256` field for all ApiKey records that are missing `secretSha256`.
 * This fixes authentication failures caused by the field rename in v2.
 */

import mongoose from 'mongoose';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI;


async function migrate() {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // Find all records that have secretHash but no secretSha256
  const legacyKeys = await db.collection('apikeys').find({
    secretHash: { $exists: true, $ne: null, $ne: '' },
    $or: [
      { secretSha256: { $exists: false } },
      { secretSha256: null },
      { secretSha256: '' }
    ]
  }).toArray();

  console.log(`[Migration] Legacy records found (secretHash present, secretSha256 missing): ${legacyKeys.length}`);

  if (legacyKeys.length === 0) {
    console.log('[Migration] No migration needed. All records are up to date.');
    await mongoose.disconnect();
    return;
  }

  let migrated = 0;
  for (const key of legacyKeys) {
    await db.collection('apikeys').updateOne(
      { _id: key._id },
      {
        $set: { secretSha256: key.secretHash },
        $unset: { secretHash: '' }
      }
    );
    const preview = key.publicKey ? key.publicKey.slice(0, 20) + '...' : '(no publicKey)';
    console.log(`  [Migrated] key._id=${key._id}  label="${key.keyLabel}"  publicKey=${preview}`);
    migrated++;
  }

  console.log('');
  console.log(`[Migration] Complete. ${migrated} record(s) migrated successfully.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('[Migration] FAILED:', err.message);
  process.exit(1);
});
