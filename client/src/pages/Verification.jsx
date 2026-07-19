import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Services & Hooks
import { auth } from '../services/firebase';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

// Subcomponents
import Header from '../components/Header';
import Footer from '../components/Footer';
import OTPCodeField from '../components/OTPCodeField';

export const Verification = () => {
  const navigate = useNavigate();
  const {
    phoneForVerification,
    confirmationResult,
    setConfirmationResult,
    isLoading,
    setLoading,
    setError,
    loginSuccess,
    isAuthenticated
  } = useAuthStore();

  const [timer, setTimer] = useState(30);
  const [isResending, setIsResending] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');

  // Auto-redirect if user is logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
      return;
    }
    
    // Safety redirect: If no phone number is in the store, redirect to login
    if (!phoneForVerification || !confirmationResult) {
      toast.error('Session expired. Please re-enter your phone number.');
      navigate('/login');
    }
  }, [phoneForVerification, confirmationResult, isAuthenticated, navigate]);

  // Countdown timer for resending OTP
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Resend OTP Action
  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    
    setIsResending(true);
    toast.loading('Requesting code resend...', { id: 'resend-toast' });
    
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
      }
      
      const newConfirmation = await signInWithPhoneNumber(
        auth, 
        phoneForVerification, 
        window.recaptchaVerifier
      );
      
      setConfirmationResult(newConfirmation);
      setTimer(30);
      toast.success('A new OTP has been sent!', { id: 'resend-toast' });
    } catch (err) {
      console.error('[Resend OTP Error]', err);
      toast.error(err.message || 'Failed to resend code.', { id: 'resend-toast' });
    } finally {
      setIsResending(false);
    }
  };

  // Perform backend verification with Firebase ID Token
  const handleVerifyOtp = async (otpCode) => {
    if (!otpCode || otpCode.length !== 6 || isLoading) return;
    
    setLoading(true);
    setError(null);
    const toastId = toast.loading('Verifying code...');

    try {
      // 1. Confirm code with Firebase Web SDK
      const credential = await confirmationResult.confirm(otpCode);
      const firebaseUser = credential.user;
      
      // 2. Fetch the ID Token
      const firebaseToken = await firebaseUser.getIdToken();
      console.log('[Verification] Got Firebase token, submitting to MERN backend...');

      // 3. Post Token to Backend
      const response = await api.post('/api/auth/firebase-login', { firebaseToken });
      const { token, user } = response.data;

      // 4. Trigger local success states
      toast.success('Successfully Verified!', { id: toastId });
      setVerificationSuccess(true);
      
      // Hold success animation briefly before routing
      setTimeout(() => {
        loginSuccess(user, token);
        navigate('/dashboard');
      }, 1800);

    } catch (err) {
      console.error('[Verification Failure]', err);
      setError(err);
      toast.error(
        err.response?.data?.message || 
        err.message || 
        'Invalid verification code. Please check and retry.', 
        { id: toastId }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  // Mask middle digits of phone: e.g. +91 98765 43210 -> +91 ••••• 43210
  const getMaskedPhone = () => {
    if (!phoneForVerification) return '';
    const phone = phoneForVerification;
    // Format displays last 5 digits and country code
    const lastDigits = phone.slice(-5);
    const cc = phone.slice(0, phone.length - 10);
    return `${cc} ••••• ${lastDigits}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[420px] bg-white rounded-dds border border-gray-200/80 shadow-premium p-8 relative overflow-hidden"
    >
      <div id="recaptcha-container"></div>
      
      {/* Back navigation button */}
      {!verificationSuccess && (
        <button
          onClick={handleBackToLogin}
          className="absolute left-6 top-7 text-gray-400 hover:text-text-primary transition-colors flex items-center gap-1.5 focus:outline-none"
        >
          <ArrowLeft size={16} />
        </button>
      )}

      <AnimatePresence mode="wait">
        {verificationSuccess ? (
          // Success view
          <motion.div
            key="success-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
              className="text-green-500 mb-5"
            >
              <CheckCircle2 size={68} className="stroke-[2.5]" />
            </motion.div>
            <h2 className="text-xl font-bold text-[#111827]">Verification Successful</h2>
            <p className="text-xs font-medium text-gray-400 mt-1.5">Welcome! Redirecting you to your workspace...</p>
          </motion.div>
        ) : (
          // Form input view
          <motion.div key="otp-form" className="pt-2">
            <Header 
              title="Verify OTP" 
              subtitle={`Enter the 6-digit verification code sent to ${getMaskedPhone()}`} 
            />

            {/* OTP 6-Digit input field component */}
            <OTPCodeField 
              disabled={isLoading} 
              onComplete={(code) => {
                setEnteredOtp(code);
                handleVerifyOtp(code);
              }} 
            />

            {/* Resend actions */}
            <div className="flex flex-col items-center gap-6 mt-4 select-none">
              <p className="text-xs text-text-secondary font-medium">
                Didn't receive the code?{' '}
                {timer > 0 ? (
                  <span className="text-primary font-bold ml-1">Resend in {timer}s</span>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-primary hover:text-primary-hover font-bold underline transition-colors cursor-pointer disabled:text-gray-400"
                  >
                    Resend OTP
                  </button>
                )}
              </p>

              {/* Verify Trigger (Fallback button if auto-submit doesn't fire) */}
              <button
                onClick={() => handleVerifyOtp(enteredOtp)}
                disabled={isLoading || enteredOtp.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold text-sm py-4 px-6 rounded-dds transition-all duration-200 shadow-soft focus:outline-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying OTP...</span>
                  </>
                ) : (
                  <span>Verify OTP</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </motion.div>
  );
};

export default Verification;
