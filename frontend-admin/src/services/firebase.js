import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

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
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_firebase_web_api_key' && firebaseConfig.apiKey !== 'undefined') {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    console.log('[Admin Portal Firebase] SDK initialized successfully.');
  } else {
    console.warn('[Admin Portal] Firebase credentials not configured.');
  }
} catch (e) {
  console.error('[Admin Portal] Firebase Init error:', e.message);
}

export { auth, googleProvider };
export default app;
