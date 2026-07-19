import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';

// Local Services, Stores & Helpers
import { auth } from '../services/firebase';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import OTPCodeField from '../components/OTPCodeField';

export const VerifyMobileOTP = () => {
  const navigate = useNavigate();
  const { 
    tempPhoneForVerification, 
    tempConfirmationResult, 
    tempVerificationCountry, 
    setTempVerificationData,
    updateUserProfile 
  } = useAuthStore();

  const [timer, setTimer] = useState(30);
  const [isResending, setIsResending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');

  // Protect route
  useEffect(() => {
    if (!tempPhoneForVerification || !tempConfirmationResult) {
      toast.error('Session expired. Please enter your mobile number again.');
      navigate('/verify-mobile');
    }
  }, [tempPhoneForVerification, tempConfirmationResult, navigate]);

  // Countdown timer
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Submit OTP code to firebase & MERN
  const handleVerifyOtp = async (otpCode) => {
    const codeToVerify = otpCode || enteredOtp;
    if (!codeToVerify || codeToVerify.length !== 6 || isLoading) return;

    setIsLoading(true);
    const toastId = toast.loading('Confirming verification code...');

    try {
      const credential = await tempConfirmationResult.confirm(codeToVerify);
      const firebaseUser = credential.user;

      const phoneToken = await firebaseUser.getIdToken();
      console.log('[PhoneLink] Received Phone Token, linking to MERN account...');

      const response = await api.post('/api/user/verify-phone', {
        phoneNumber: tempPhoneForVerification,
        countryCode: tempVerificationCountry.code,
        countryISO: tempVerificationCountry.iso,
        countryName: tempVerificationCountry.name,
        phoneToken
      });
      const { user: updatedUser } = response.data;

      updateUserProfile(updatedUser);

      toast.success('Mobile Number Verified Successfully', { id: toastId });
      navigate('/verify-mobile/success');
    } catch (err) {
      console.error('[Verify OTP Error]', err);
      toast.error(
        err.response?.data?.message || 
        err.message || 
        'Incorrect OTP. Please check and try again.', 
        { id: toastId }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const setupInvisibleRecaptcha = () => {
    if (window.recaptchaVerifier) return;
    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'otp-page-recaptcha-container', {
        size: 'invisible'
      });
    } catch (err) {
      console.error('[Recaptcha Init Error]', err);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;

    setIsResending(true);
    const toastId = toast.loading('Requesting new code...');

    try {
      setupInvisibleRecaptcha();
      const verifier = window.recaptchaVerifier;

      const newConfirmation = await signInWithPhoneNumber(
        auth,
        tempPhoneForVerification,
        verifier
      );

      setTempVerificationData({ confirmationResult: newConfirmation });
      setTimer(30);
      setEnteredOtp('');
      toast.success('A new OTP has been sent!', { id: toastId });
    } catch (err) {
      console.error('[Resend OTP Error]', err);
      toast.error(err.message || 'Failed to resend code.', { id: toastId });
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col min-h-screen bg-[#F8FAFC] relative overflow-hidden"
    >
      {/* Invisible Recaptcha container */}
      <div id="otp-page-recaptcha-container" />

      {/* Main Container Chassis */}
      <div className="flex-grow w-full max-w-[430px] mx-auto px-6 py-6 flex flex-col justify-between select-none">
        
        {/* Header Back Button */}
        <div className="flex justify-start">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white border border-gray-150 rounded-full flex items-center justify-center text-text-primary shadow-soft hover:bg-slate-50 transition-colors focus:outline-none"
            aria-label="Go Back"
          >
            <ArrowLeft size={16} className="stroke-[2.5]" />
          </motion.button>
        </div>

        {/* Hero Details Header */}
        <div className="space-y-3.5 pt-6 text-left">
          <h1 className="text-3xl font-black text-[#111827] tracking-tight leading-[1.15] whitespace-pre-line">
            Verify Code
          </h1>
          <p className="text-xs font-semibold text-text-secondary leading-relaxed max-w-[310px]">
            Enter the 6-digit code sent to
            <span className="block text-primary font-black text-sm mt-1">{tempPhoneForVerification}</span>
          </p>
        </div>

        {/* OTP Input Card */}
        <div className="space-y-6 pt-8 flex-grow">
          <div className="bg-white border border-gray-200 rounded-[22px] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.02)] space-y-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Verification Code</span>
            <OTPCodeField
              disabled={isLoading}
              onComplete={(code) => {
                setEnteredOtp(code);
                handleVerifyOtp(code);
              }}
            />

            {/* Countdown / Resend Option */}
            <div className="text-center pt-2">
              {timer > 0 ? (
                <div className="flex items-center justify-center gap-1.5 text-text-secondary text-[10px] font-bold">
                  <span>Resend OTP in</span>
                  <span className="text-primary font-black">00:{String(timer).padStart(2, '0')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-primary hover:text-primary-hover text-[10px] font-black flex items-center justify-center gap-1.5 mx-auto focus:outline-none"
                >
                  <RefreshCw size={12} className={isResending ? 'animate-spin' : ''} />
                  <span>Resend OTP</span>
                </button>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            <motion.button
              type="button"
              onClick={() => handleVerifyOtp(enteredOtp)}
              disabled={isLoading || enteredOtp.length !== 6}
              whileTap={{ scale: enteredOtp.length === 6 && !isLoading ? 0.98 : 1 }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-150 disabled:to-gray-150 disabled:text-gray-400 disabled:shadow-none text-white font-extrabold text-xs h-14 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_-8px_rgba(37,99,235,0.45)] focus:outline-none"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Confirming OTP...</span>
                </>
              ) : (
                <span>Verify</span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Sticky bottom spacer */}
        <div className="pt-6" />

      </div>
    </motion.div>
  );
};

export default VerifyMobileOTP;
