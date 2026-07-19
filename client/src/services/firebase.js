import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app;
let auth = null;

// Perform safe initialization
try {
  const isKeysConfigured = 
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== 'your_firebase_web_api_key';

  if (isKeysConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    console.log('[Firebase Client] SDK initialized successfully.');
  } else {
    console.warn(
      '[Firebase Client] Warning: Firebase Web SDK is not configured yet. ' +
      'Please check your client/.env file keys.'
    );
  }
} catch (error) {
  console.error('[Firebase Client] Initialization error:', error.message);
}

export { auth };
export default app;
