import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Smartphone, 
  Lock, 
  Timer, 
  CheckCircle2, 
  ShieldAlert, 
  X,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { signInWithPhoneNumber, RecaptchaVerifier, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';

// Local services & stores
import { useDevStore } from '../store/devStore';
import { auth } from '../services/firebase';
import api from '../services/api';

export const DeleteAccount = () => {
  const navigate = useNavigate();
  const { developer, logout } = useDevStore();

  const [step, setStep] = useState('WARNING');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [firebaseVerifier, setFirebaseVerifier] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState(0);

  // OTP Countdown (5 minutes)
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300);

  // Sync remaining seconds for OTP expiry countdown
  useEffect(() => {
    if (step !== 'OTP' || otpExpirySeconds <= 0) return;
    const timer = setInterval(() => {
      setOtpExpirySeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpExpirySeconds]);

  const setupInvisibleRecaptcha = () => {
    if (window.deleteRecaptchaVerifier) return window.deleteRecaptchaVerifier;
    try {
      const verifier = new RecaptchaVerifier(auth, 'delete-recaptcha-container', {
        size: 'invisible'
      });
      window.deleteRecaptchaVerifier = verifier;
      setFirebaseVerifier(verifier);
      return verifier;
    } catch (err) {
      console.error('[Recaptcha Init Error]', err);
      toast.error('reCAPTCHA initialization failed. Please reload.');
      return null;
    }
  };

  const handleSendCode = async () => {
    if (!auth) {
      toast.error('Firebase Auth is not initialized. Please try again.');
      return;
    }
    if (!developer?.phoneNumber) {
      toast.error('No linked mobile number found for this developer profile.');
      return;
    }

    setIsSendingOtp(true);
    const toastId = toast.loading('Sending verification SMS...');

    try {
      const verifier = setupInvisibleRecaptcha();
      if (!verifier) {
        setIsSendingOtp(false);
        toast.dismiss(toastId);
        return;
      }

      // Firebase send SMS
      const confirmation = await signInWithPhoneNumber(auth, developer.phoneNumber, verifier);
      setConfirmationResult(confirmation);

      toast.success('Secure OTP sent to your phone!', { id: toastId });
      setOtpExpirySeconds(300);
      setOtp(['', '', '', '', '', '']);
      setStep('OTP');
    } catch (err) {
      console.error('[Start Deletion Verification Error]', err);
      toast.error(err.message || 'Failed to send OTP.', { id: toastId });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const enteredCode = otp.join('');
    if (enteredCode.length !== 6 || isVerifyingOtp || !confirmationResult) return;

    setIsVerifyingOtp(true);
    const toastId = toast.loading('Validating security code...');

    try {
      await confirmationResult.confirm(enteredCode);
      toast.success('OTP verified successfully!', { id: toastId });
      setStep('CONFIRM');
    } catch (err) {
      console.error('[Verify OTP Deletion Error]', err);
      toast.error('Verification failed. Incorrect code.', { id: toastId });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleDeletePermanently = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    const toastId = toast.loading('Purging developer profile & related entities...');

    try {
      const provider = new GoogleAuthProvider();
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('No active authentication session. Please sign in again.');
      }
      
      let freshIdToken;
      try {
        const result = await reauthenticateWithPopup(currentUser, provider);
        freshIdToken = await result.user.getIdToken();
      } catch (authErr) {
        console.error('[Final Reauth Error]', authErr);
        throw new Error('Identity confirmation failed. Re-sign in with Google required.');
      }

      await api.delete('/api/dev/auth/me', {
        data: { firebaseIdToken: freshIdToken }
      });

      toast.success('Developer account deleted successfully.', { id: toastId });
      logout();
      navigate('/login');
    } catch (err) {
      console.error('[Final Deletion Purge Error]', err);
      toast.error(err.message || err.response?.data?.message || 'Failed to complete deletion.', { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full min-h-screen bg-gray-50/50 pb-20 flex flex-col relative p-8 max-w-2xl mx-auto space-y-6">
      <div id="delete-recaptcha-container"></div>

      <div className="flex items-center gap-3 select-none">
        <button
          onClick={() => navigate('/settings')}
          className="p-1 hover:bg-gray-150 rounded-lg text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-black text-gray-900">Delete Developer Account</h1>
      </div>

      {step === 'WARNING' && (
        <div className="space-y-6">
          <div className="bg-red-50/70 border border-red-100 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={16} />
              <span className="text-xs font-black uppercase tracking-wider">Before you continue</span>
            </div>
            
            <p className="text-xs text-red-800 font-bold">
              Deleting your Developer account will permanently remove:
            </p>

            <ul className="space-y-2">
              {[
                'Developer Profile & Settings',
                'E-commerce & Client Applications',
                'All generated Secret & Public API Keys',
                'Billing & Invoice History',
                'Analytics & Request Statistics',
                'Stripe Customer linkages (unlinked automatically)'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-xs text-red-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm">
            <h4 className="text-xs font-black text-gray-700">Confirm Mobile Number</h4>
            <p className="text-sm font-black text-blue-600 mt-1 font-mono">{developer?.phoneNumber}</p>
          </div>

          <button
            onClick={handleSendCode}
            disabled={isSendingOtp}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs py-3.5 rounded-xl transition-all"
          >
            {isSendingOtp ? 'Requesting secure session...' : 'Send Verification OTP'}
          </button>
        </div>
      )}

      {step === 'OTP' && (
        <div className="space-y-6">
          <div className="space-y-2 select-none">
            <h2 className="text-base font-black text-gray-900 font-sans">Enter 6-digit OTP code</h2>
            <p className="text-xs text-gray-400">Sent code to {developer?.phoneNumber}</p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="flex justify-between items-center gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => inputRefs.current[idx] = el}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  className="w-12 h-14 text-center text-lg font-black text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-mono shadow-sm"
                />
              ))}
            </div>

            <div className="bg-slate-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 select-none text-xs text-gray-500">
              <span className="font-bold">Code expires in: <span className="font-extrabold text-gray-800 font-mono">{formatTime(otpExpirySeconds)}</span></span>
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp || otp.join('').length !== 6 || otpExpirySeconds <= 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-3.5 rounded-xl"
            >
              Verify OTP
            </button>
          </form>
        </div>
      )}

      {step === 'CONFIRM' && (
        <div className="space-y-6 text-center">
          <div className="w-12 h-12 bg-green-50 border border-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-base font-black text-gray-900">Identity Confirmed</h2>
          <p className="text-xs text-gray-400">Google and SMS validation checks passed.</p>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm text-left space-y-4">
            <h3 className="text-sm font-black text-gray-800">Final Confirmation</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-semibold">
              Are you absolutely sure you want to permanently delete your DDS Developer profile? This action will permanently remove all API keys, client application bindings, and billing records immediately.
            </p>
          </div>

          <button
            onClick={handleDeletePermanently}
            disabled={isDeleting}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-black py-3.5 rounded-xl transition-all"
          >
            {isDeleting ? 'Deleting Permanently...' : 'Confirm Account Deletion'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DeleteAccount;
