import admin from 'firebase-admin';

let firebaseAdminApp = null;

try {
  let credential = null;

  // ─────────────────────────────────────────────────────────────────────────────
  //  Firebase Admin SDK — Secure Credential Loading
  //
  //  Credentials are NEVER loaded from committed files.
  //  Configure ONE of the following environment variables:
  //
  //  Option A  Individual fields (simplest for local dev):
  //    FIREBASE_PROJECT_ID      = your-project-id
  //    FIREBASE_CLIENT_EMAIL    = firebase-adminsdk-xxxx@your-project.iam.gserviceaccount.com
  //    FIREBASE_PRIVATE_KEY     = -----BEGIN RSA PRIVATE KEY-----\n...
  //
  //  Option B  Full JSON string (useful for some PaaS platforms):
  //    FIREBASE_SERVICE_ACCOUNT_KEY = {"type":"service_account","project_id":...}
  //
  //  Option C  Base64-encoded JSON (recommended for production / CI-CD):
  //    Generate: node -e "console.log(Buffer.from(JSON.stringify(require('./firebase-service-account.json'))).toString('base64'))"
  //    FIREBASE_SERVICE_ACCOUNT_BASE64 = <base64 string>
  //
  //  Keep the raw service-account JSON file outside the repository entirely.
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
    // Option B: Full JSON string in environment variable
    credential = admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim())
    );
    console.log('[Firebase] Initialized with FIREBASE_SERVICE_ACCOUNT_KEY JSON string');

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
    console.log('[Firebase] Admin SDK initialized successfully.');
  } else {
    console.warn(
      '[Firebase] No credentials found. Set one of:\n' +
      '  FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + FIREBASE_PROJECT_ID\n' +
      '  FIREBASE_SERVICE_ACCOUNT_KEY (JSON string)\n' +
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
