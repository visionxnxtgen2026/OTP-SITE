import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

/**
 * Enterprise Production-Grade Firebase Admin SDK Initialization Module
 * 
 * Ensures `admin.initializeApp()` is called exactly once.
 * Supports service account JSON, environment variables, base64 credentials,
 * and project ID public token verification fallback.
 */
let firebaseAdminApp = null;

const initFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    firebaseAdminApp = admin.app();
    return firebaseAdminApp;
  }

  try {
    let credential = null;
    const projectId = process.env.FIREBASE_PROJECT_ID || 'otp-site-80c03';

    // Option A: Individual environment variables
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      credential = admin.credential.cert({
        projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      });
      console.log('[Firebase Admin] Initialized with cert environment variables');
    }
    // Option B: Service Account JSON string or file path
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const keyVal = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (keyVal.endsWith('.json')) {
        const absolutePath = path.isAbsolute(keyVal)
          ? keyVal
          : path.resolve(process.cwd(), keyVal);
        if (fs.existsSync(absolutePath)) {
          const fileContent = fs.readFileSync(absolutePath, 'utf8');
          credential = admin.credential.cert(JSON.parse(fileContent));
          console.log('[Firebase Admin] Loaded service account from JSON file');
        }
      } else {
        credential = admin.credential.cert(JSON.parse(keyVal));
        console.log('[Firebase Admin] Initialized with JSON string');
      }
    }
    // Option C: Base64-encoded JSON string
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const decoded = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.trim(),
        'base64'
      ).toString('utf8');
      credential = admin.credential.cert(JSON.parse(decoded));
      console.log('[Firebase Admin] Initialized with Base64 service account');
    }

    if (credential) {
      firebaseAdminApp = admin.initializeApp({ credential, projectId });
    } else {
      // Public ID token verification initialization (works for verifyIdToken)
      firebaseAdminApp = admin.initializeApp({ projectId });
      console.log(`[Firebase Admin] Initialized with Project ID: ${projectId} (Public Verification Mode)`);
    }

    return firebaseAdminApp;

  } catch (error) {
    console.error('[Firebase Admin] Initialization Error:', error.message);
    // Fallback initialize to avoid throwing on subsequent app calls
    if (admin.apps.length === 0) {
      firebaseAdminApp = admin.initializeApp({ projectId: 'otp-site-80c03' });
    } else {
      firebaseAdminApp = admin.app();
    }
    return firebaseAdminApp;
  }
};

// Initialize immediately on module load
initFirebaseAdmin();

export const getFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    initFirebaseAdmin();
  }
  return admin;
};

export default firebaseAdminApp;
