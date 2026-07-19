import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { Loader2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

// Local Services & State
import { auth } from '../services/firebase';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

// Subcomponents
import Header from '../components/Header';
import Footer from '../components/Footer';

// Minimal Custom SVG Google Icon
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 0, 0)">
      <path d="M21.35,11.1H12v2.7h5.38C16.88,15.75,14.77,17,12,17c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.66,0,3.14,0.69,4.24,1.8l2.1-2.1C16.5,2.94,14.4,2,12,2C7.03,2,3,6.03,3,11s4.03,9,9,9c4.75,0,8.75-3.44,9-8C21.04,11.7,21.2,11.4,21.35,11.1z" fill="#4285F4" />
      <path d="M12,20c2.4,0,4.5-0.94,6.34-2.7l-2.1-2.1C14.77,16.2,13.4,17,12,17c-3.31,0-6-2.69-6-6l-2.1,2.1C5.5,17.31,8.6,20,12,20z" fill="#34A853" />
      <path d="M6,11c0-0.72,0.13-1.41,0.36-2.06L4.26,6.84C3.47,8.09,3,9.5,3,11s0.47,2.91,1.26,4.16l2.1-2.1C6.13,12.41,6,11.72,6,11z" fill="#FBBC05" />
      <path d="M12,7c1.4,0,2.77,0.8,3.76,1.8l2.1-2.1C16.5,5.1,14.4,4,12,4C8.6,4,5.5,6.69,4.26,8.94l2.1,2.1C6.66,8.72,9.31,7,12,7z" fill="#EA4335" />
    </g>
  </svg>
);

export const Login = () => {
  const navigate = useNavigate();
  const { isLoading, setLoading, setError, loginSuccess, isAuthenticated, mobileVerified } = useAuthStore();

  // Redirect if session is already active
  useEffect(() => {
    if (isAuthenticated) {
      if (mobileVerified) {
        navigate('/dashboard');
      } else {
        navigate('/verify-mobile');
      }
    }
  }, [isAuthenticated, mobileVerified, navigate]);

  // Google Login Handler
  const handleGoogleLogin = async () => {
    if (!auth) {
      toast.error(
        'Firebase Web SDK is not configured in client/.env. ' +
        'Please verify your client settings to log in.',
        { duration: 6000 }
      );
      return;
    }

    setLoading(true);
    setError(null);
    const toastId = toast.loading('Connecting with Google...');

    try {
      // 1. Initialize Google Auth Provider
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      // 2. Trigger Google Popup Authentication
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // 3. Obtain Firebase ID Token
      const firebaseToken = await firebaseUser.getIdToken();
      console.log('[Login] Received Firebase Google ID Token, validating with backend...');

      // 4. Send token to MERN Backend
      const response = await api.post('/api/auth/google-login', { firebaseToken });
      const { token, user } = response.data;

      // 5. Success callback
      toast.success(`Welcome back, ${user.displayName}!`, { id: toastId });
      loginSuccess(user, token);
      if (user.mobileVerified) {
        navigate('/dashboard');
      } else {
        navigate('/verify-mobile');
      }

    } catch (err) {
      console.error('[Google Login Error]', err);
      setError(err);
      toast.error(
        err.response?.data?.message || 
        err.message || 
        'Google Authentication was cancelled or failed.',
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-full bg-white p-8 relative flex flex-col justify-between"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)'
      }}
    >
      <div>
        <Header title="Welcome to DDS" subtitle="Sign in to continue" />

        {/* Info Box - Explains google-only auth */}
        <div className="mt-8 mb-6 flex items-start gap-3 p-4 bg-gray-50/50 rounded-dds border border-gray-100 select-none">
          <div className="p-1 text-primary mt-0.5">
            <Shield size={16} />
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
            DDS utilizes secure Google Authentication to protect your account. No password setup required.
          </p>
        </div>

        {/* Continue with Google button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-250 hover:bg-gray-50/80 disabled:bg-gray-50 disabled:border-gray-100 disabled:text-gray-400 text-text-primary font-bold text-sm py-4 px-6 rounded-dds transition-all duration-200 shadow-soft focus:outline-none focus:ring-4 focus:ring-primary/10 select-none mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <GoogleIcon />
              <span>Continue with Google</span>
            </>
          )}
        </motion.button>
      </div>

      <div>
        {/* Caption */}
        <p className="text-center text-[10px] text-gray-400 font-semibold tracking-wide uppercase select-none mt-4">
          Secure authentication powered by Firebase
        </p>
        <Footer />
      </div>
    </motion.div>
  );
};

export default Login;
