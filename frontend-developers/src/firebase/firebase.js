import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

/**
 * Developer Portal Firebase Initialization Module
 * Reads VITE_ prefixed environment variables with automatic fallback to active Firebase project credentials.
 * Ensures `initializeApp()` is called synchronously before any Firebase service is accessed.
 */

let app;
let auth;
let db;
let storage;
let analytics = null;
let googleProvider;

try {
  // 1. Load Firebase Configuration with Environment Variables and Direct Fallbacks
  const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyDzBC4GLKXN3_lyh91B0NY4FcHH6x_hIEw',
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'otp-site-80c03.firebaseapp.com',
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'otp-site-80c03',
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'otp-site-80c03.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '419034737047',
    appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:419034737047:web:136ccc97ec4d1275c8bcd2',
    measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || 'G-Y944D6CF9C'
  };

  // 2. Unconditional Synchronous Singleton App Initialization
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

  // 3. Initialize Firebase Services with App Instance
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // 4. Configure Google Auth Provider
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  // 5. Analytics (Async check for supported browser environment)
  if (typeof window !== 'undefined') {
    isSupported()
      .then((supported) => {
        if (supported && firebaseConfig.measurementId) {
          analytics = getAnalytics(app);
        }
      })
      .catch(() => {});
  }

  // 6. Startup Validation Diagnostics Logging
  console.log('\u2713 Firebase Config Loaded');
  console.log('\u2713 Firebase App Initialized');
  console.log('\u2713 Firebase Auth Ready');
  console.log('\u2713 Firestore Ready');
  console.log('\u2713 Storage Ready');

} catch (error) {
  console.error('====================================');
  console.error(' Firebase Initialization Failed');
  console.error('====================================');
  console.error(`File: src/firebase/firebase.js`);
  console.error(`Reason: ${error.message}`);
  console.error('Recommended Fix: Check VITE_FIREBASE_* keys in frontend-developers/.env');
  console.error('====================================');
  throw error;
}

export { app, auth, db, storage, analytics, googleProvider };
export default app;
