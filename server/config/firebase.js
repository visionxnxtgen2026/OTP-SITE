import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let firebaseAdminApp = null;

try {
  let credential = null;

  // 1. Try loading from individual environment variables
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    });
    console.log('[Firebase] Initialized with individual environment variables');
  } 
  // 2. Try loading from FIREBASE_SERVICE_ACCOUNT_KEY env
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const keySource = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    if (keySource.startsWith('{')) {
      // It's a raw JSON string
      credential = admin.credential.cert(JSON.parse(keySource));
      console.log('[Firebase] Initialized with service account key JSON string');
    } else {
      // It's a file path
      const resolvedPath = path.resolve(keySource);
      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        credential = admin.credential.cert(JSON.parse(fileContent));
        console.log(`[Firebase] Initialized with service account file path: ${resolvedPath}`);
      } else {
        console.error(`[Firebase] Service account file not found at path: ${resolvedPath}`);
      }
    }
  }

  // 3. Fallback: Check local folder for key file if not initialized yet
  if (!credential) {
    const defaultPath = path.resolve('./config/firebase-service-account.json');
    if (fs.existsSync(defaultPath)) {
      const fileContent = fs.readFileSync(defaultPath, 'utf8');
      credential = admin.credential.cert(JSON.parse(fileContent));
      console.log(`[Firebase] Initialized using default credentials file: ${defaultPath}`);
    }
  }

  if (credential) {
    firebaseAdminApp = admin.initializeApp({
      credential,
    });
    console.log('[Firebase] Admin SDK Initialized Successfully.');
  } else {
    console.warn(
      '[Firebase] Warning: No Firebase credentials found. ' +
      'Please place your service account key file in server/config/firebase-service-account.json ' +
      'or set environment variables.'
    );
  }
} catch (error) {
  console.error('[Firebase] Initialization Error:', error.message);
}

export const getFirebaseAdmin = () => {
  if (!firebaseAdminApp) {
    throw new Error('Firebase Admin SDK is not initialized. Please verify your credentials configuration.');
  }
  return admin;
};

export default firebaseAdminApp;
