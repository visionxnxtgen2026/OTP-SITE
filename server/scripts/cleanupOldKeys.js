import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const cleanup = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dds');
  const db = mongoose.connection.db;

  // Delete old Cartify key with old format
  const result = await db.collection('apikeys').deleteMany({
    publicKey: 'DDS_PUBLIC_CARTIFY_KEY_123'
  });
  console.log(`[Cleanup] Removed ${result.deletedCount} old Cartify API key(s)`);

  await mongoose.disconnect();
  console.log('[Cleanup] Done.');
};

cleanup().catch((e) => { console.error(e.message); process.exit(1); });
