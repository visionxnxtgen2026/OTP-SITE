import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let firebaseAdminApp = null;

try {
  let credential = null;

  // ─────────────────────────────────────────────────────────────────────────────
  //  Firebase Admin SDK — Secure Credential Loading
  // ─────────────────────────────────────────────────────────────────────────────

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    // Option A: Individual environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    credential = admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    });
    console.log('[Firebase] Initialized with individual environment variables');

  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const keyVal = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if (keyVal.endsWith('.json')) {
      // Option B.1: File path to service account key
      const absolutePath = path.isAbsolute(keyVal) 
        ? keyVal 
        : path.resolve(process.cwd(), keyVal);
      const fileContent = fs.readFileSync(absolutePath, 'utf8');
      credential = admin.credential.cert(JSON.parse(fileContent));
      console.log('[Firebase] Loaded service account from JSON file');
    } else {
      // Option B.2: Full JSON string in environment variable
      credential = admin.credential.cert(JSON.parse(keyVal));
      console.log('[Firebase] Initialized with FIREBASE_SERVICE_ACCOUNT_KEY JSON string');
    }

  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    // Option C: Base64-encoded JSON (recommended for production & CI/CD)
    const decoded = Buffer.from(
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.trim(), 'base64'
    ).toString('utf8');
    credential = admin.credential.cert(JSON.parse(decoded));
    console.log('[Firebase] Initialized with Base64-encoded service account');
  }

  if (credential) {
    firebaseAdminApp = admin.initializeApp({ credential });
    console.log('[Firebase] Admin SDK initialized successfully');
  } else {
    console.warn(
      '[Firebase] No credentials found. Set one of:\n' +
      '  FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID\n' +
      '  FIREBASE_SERVICE_ACCOUNT_KEY (JSON string or file path)\n' +
      '  FIREBASE_SERVICE_ACCOUNT_BASE64 (base64-encoded JSON)\n' +
      'Never commit firebase-service-account.json to version control.'
    );
  }

} catch (error) {
  console.error('[Firebase] Initialization Error:', error.message);
}

export const getFirebaseAdmin = () => {
  if (!firebaseAdminApp) {
    throw new Error(
      'Firebase Admin SDK is not initialized. Check your Firebase environment variables.'
    );
  }
  return admin;
};

export default firebaseAdminApp;
