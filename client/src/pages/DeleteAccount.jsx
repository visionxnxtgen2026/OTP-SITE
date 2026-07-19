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
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { signInWithPhoneNumber, RecaptchaVerifier, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';

// Local services & stores
import { useAuthStore } from '../store/authStore';
import { auth } from '../services/firebase';
import api from '../services/api';

export const DeleteAccount = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Step transitions: 'WARNING' | 'OTP' | 'CONFIRM' | 'LOCKED'
  const [step, setStep] = useState('WARNING');
  
  // OTP input states
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  // Loaders
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verification & Lock details
  const [firebaseVerifier, setFirebaseVerifier] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [lockRemainingSeconds, setLockRemainingSeconds] = useState(0);
  const [isDailyLock, setIsDailyLock] = useState(false);

  // OTP Countdown (5 minutes)
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300);

  // Check delete status on load
  useEffect(() => {
    fetchSessionStatus();
  }, []);

  // Sync remaining seconds for OTP expiry countdown
  useEffect(() => {
    if (step !== 'OTP' || otpExpirySeconds <= 0) return;
    const timer = setInterval(() => {
      setOtpExpirySeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpExpirySeconds]);

  // Sync remaining seconds for Lock timer
  useEffect(() => {
    if (lockRemainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockRemainingSeconds(prev => {
        if (prev <= 1) {
          // Lock period expired! Re-fetch status to unlock
          fetchSessionStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockRemainingSeconds]);

  const fetchSessionStatus = async () => {
    try {
      const response = await api.get('/api/user/account/delete/status');
      const { session } = response.data;

      if (session) {
        setAttemptsRemaining(3 - session.attempts);

        const now = Date.now();
        const dailyUntil = session.dailyLockUntil ? new Date(session.dailyLockUntil).getTime() : 0;
        const tempUntil = session.lockedUntil ? new Date(session.lockedUntil).getTime() : 0;

        if (session.dailyLocked && dailyUntil > now) {
          setStep('LOCKED');
          setIsDailyLock(true);
          setLockExpiresAt(new Date(session.dailyLockUntil));
          setLockRemainingSeconds(Math.ceil((dailyUntil - now) / 1000));
        } else if (session.locked && tempUntil > now) {
          setStep('LOCKED');
          setIsDailyLock(false);
          setLockExpiresAt(new Date(session.lockedUntil));
          setLockRemainingSeconds(Math.ceil((tempUntil - now) / 1000));
        } else if (session.isVerified) {
          setStep('CONFIRM');
        } else {
          setStep('WARNING');
        }
      }
    } catch (err) {
      console.error('[Fetch Delete Status Error]', err);
    }
  };

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
    if (!user?.phoneNumber) {
      toast.error('No linked mobile number found for this profile.');
      return;
    }

    setIsSendingOtp(true);
    const toastId = toast.loading('Generating secure request session...');

    try {
      const verifier = setupInvisibleRecaptcha();
      if (!verifier) {
        setIsSendingOtp(false);
        toast.dismiss(toastId);
        return;
      }

      // 1. Firebase send SMS
      const confirmation = await signInWithPhoneNumber(auth, user.phoneNumber, verifier);
      setConfirmationResult(confirmation);

      // 2. Register verificationId on backend
      await api.post('/api/user/account/delete/start', {
        verificationId: confirmation.verificationId
      });

      toast.success('Secure OTP sent to your phone!', { id: toastId });
      setOtpExpirySeconds(300);
      setOtp(['', '', '', '', '', '']);
      setStep('OTP');
    } catch (err) {
      console.error('[Start Deletion Verification Error]', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to send OTP.';
      toast.error(errMsg, { id: toastId });

      if (window.deleteRecaptchaVerifier) {
        window.deleteRecaptchaVerifier.clear();
        window.deleteRecaptchaVerifier = null;
      }

      // Re-fetch status to see if backend locked the user due to abuse
      fetchSessionStatus();
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
    // Auto-focus previous input on Backspace
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const enteredCode = otp.join('');
    if (enteredCode.length !== 6 || isVerifyingOtp) return;

    setIsVerifyingOtp(true);
    const toastId = toast.loading('Validating security code server-side...');

    try {
      const response = await api.post('/api/user/account/delete/verify-otp', {
        code: enteredCode
      });

      toast.success('Mobile verification successful!', { id: toastId });
      setStep('CONFIRM');
    } catch (err) {
      console.error('[Verify OTP Deletion Error]', err);
      const data = err.response?.data;
      const errMsg = data?.message || 'Verification failed. Incorrect code.';
      toast.error(errMsg, { id: toastId });

      if (data?.remainingAttempts !== undefined) {
        setAttemptsRemaining(data.remainingAttempts);
      }

      // Clear fields for retry
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      // Check if user has been locked
      if (data?.locked || data?.dailyLocked) {
        fetchSessionStatus();
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleDeletePermanently = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    const toastId = toast.loading('Purging DDS identity and account...');

    try {
      // Re-authenticate with Google as a final physical security guard
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
        throw new Error('Identity confirmation failed. You must re-sign with Google to confirm ownership.');
      }

      // Call delete account endpoint
      await api.delete('/api/user/account', {
        data: { firebaseIdToken: freshIdToken }
      });

      toast.success('Account permanently deleted. Hope to see you back!', { id: toastId });
      
      // Complete sign-out & redirect
      logout();
      navigate('/login');
    } catch (err) {
      console.error('[Final Deletion Purge Error]', err);
      toast.error(err.message || err.response?.data?.message || 'Failed to complete account deletion.', { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper format time (seconds -> mm:ss)
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper format lock time
  const formatLockTime = (totalSeconds) => {
    if (totalSeconds > 3600) {
      const hrs = Math.ceil(totalSeconds / 3600);
      return `${hrs} hour${hrs === 1 ? '' : 's'}`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-gray-50/50 pb-20 flex flex-col relative">
      {/* Invisible Recaptcha Element */}
      <div id="delete-recaptcha-container"></div>

      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            disabled={isDeleting || isVerifyingOtp || isSendingOtp}
            className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-700 transition-colors focus:outline-none disabled:opacity-50"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-extrabold text-[#111827]">Delete DDS Account</h1>
        </div>
      </div>

      {/* Main Content Area - scrolls naturally under parent layout container */}
      <div className="px-5 py-6 flex flex-col space-y-6">
        
        {/* State: WARNING */}
        {step === 'WARNING' && (
          <div className="space-y-6 flex flex-col">
            <div className="space-y-6">
              {/* Header Info */}
              <div className="space-y-2 select-none">
                <h2 className="text-base font-black text-gray-900">Security Purge Procedure</h2>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  This action permanently removes your DDS account and cannot be undone.
                </p>
              </div>

              {/* Premium Red Warning Card */}
              <div className="bg-red-50/70 border border-red-100/60 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle size={15} className="stroke-[2.5]" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Before you continue</span>
                </div>
                
                <p className="text-xs text-red-800 font-bold">
                  Deleting your account will permanently remove:
                </p>

                <ul className="space-y-2">
                  {[
                    'DDS Identity',
                    'Mobile Verification',
                    'Authentication History',
                    'Connected Applications',
                    'API Permissions',
                    'Notification Tokens',
                    'Login Sessions'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-xs text-red-700 font-bold select-none pl-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mobile Verification Request Block */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-soft space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50/50 border border-blue-100/20 text-primary flex items-center justify-center shrink-0">
                    <Smartphone size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-text-primary">Verify your linked mobile number</h4>
                    <p className="text-sm font-black text-primary mt-1 font-mono tracking-wider">
                      {user?.phoneNumber || 'No verified number'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions button */}
            <div className="pt-4 select-none">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSendCode}
                disabled={isSendingOtp || !user?.phoneNumber}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-100 disabled:text-gray-400 text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-soft transition-all focus:outline-none flex items-center justify-center gap-2"
              >
                {isSendingOtp ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Requesting Secure Session...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </motion.button>
            </div>
          </div>
        )}

        {/* State: OTP */}
        {step === 'OTP' && (
          <div className="space-y-6 flex flex-col">
            <div className="space-y-6">
              {/* Header Info */}
              <div className="space-y-2 select-none">
                <h2 className="text-base font-black text-gray-900">Enter the 6-digit verification code</h2>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  We have dispatched a temporary verification code to your verified mobile number <span className="font-bold text-gray-700">{user?.phoneNumber}</span>.
                </p>
              </div>

              {/* Digital OTP inputs layout */}
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
                      className="w-12 h-14 text-center text-lg font-black text-text-primary bg-white border border-gray-200 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono shadow-soft"
                    />
                  ))}
                </div>

                {/* Countdown and attempts warning */}
                <div className="bg-slate-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 select-none">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <Timer size={14} className="text-gray-400" />
                    <span>Code expires in:</span>
                    <span className="font-extrabold text-[#111827] font-mono">{formatTime(otpExpirySeconds)}</span>
                  </div>
                  
                  <div className="text-[10px] font-extrabold text-amber-600 bg-amber-50/50 border border-amber-100/50 px-3 py-1 rounded-lg">
                    {attemptsRemaining} of 3 verification attempts remaining
                  </div>
                </div>
              </form>
            </div>

            {/* Actions button */}
            <div className="space-y-3 select-none">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || otp.join('').length !== 6 || otpExpirySeconds <= 0}
                className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-soft transition-all focus:outline-none flex items-center justify-center gap-2"
              >
                {isVerifyingOtp ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Verifying OTP...
                  </>
                ) : (
                  'Verify Code & Continue'
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => setStep('WARNING')}
                className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-700 py-2.5 transition-colors focus:outline-none"
              >
                Change Method or Go Back
              </button>
            </div>
          </div>
        )}

        {/* State: CONFIRM */}
        {step === 'CONFIRM' && (
          <div className="space-y-6 flex flex-col">
            <div className="space-y-6">
              {/* Header Info */}
              <div className="space-y-2 select-none text-center pt-4">
                <div className="w-12 h-12 bg-green-50 border border-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={24} className="stroke-[2.5]" />
                </div>
                <h2 className="text-base font-black text-gray-900">Identity Verified</h2>
                <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                  Mobile ownership confirmed successfully.
                </p>
              </div>

              {/* Explicit Confirmation Dialog Box */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-soft space-y-4">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-red-50 text-red-500 rounded-xl shrink-0 w-fit h-fit border border-red-100">
                    <ShieldAlert size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#111827]">Are you absolutely sure?</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-semibold mt-1">
                      Are you absolutely sure you want to permanently delete your DDS account? This action cannot be undone and will immediately purge all associated cloud data.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions button */}
            <div className="space-y-3 select-none">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleDeletePermanently}
                disabled={isDeleting}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-soft transition-all focus:outline-none flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Purging Account...
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => navigate('/settings')}
                disabled={isDeleting}
                className="w-full bg-gray-105 hover:bg-gray-150 disabled:opacity-50 text-gray-700 font-bold text-xs py-3.5 rounded-xl transition-all focus:outline-none text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* State: LOCKED */}
        {step === 'LOCKED' && (
          <div className="space-y-6 flex flex-col">
            <div className="space-y-6 text-center pt-8">
              {/* Premium Lock Visual */}
              <div className="w-16 h-16 bg-red-50 border border-red-100 text-red-500 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-soft">
                <Lock size={28} className="stroke-[2.5]" />
              </div>

              <h2 className="text-base font-black text-gray-900">
                {isDailyLock ? 'Verification Locked for 24 Hours' : 'Verification Suspended'}
              </h2>

              <p className="text-xs text-gray-500 font-semibold leading-relaxed max-w-[280px] mx-auto">
                {isDailyLock 
                  ? 'Maximum daily verification limit reached. Please try again after 24 hours.' 
                  : 'Maximum verification attempts reached. Please try again after 30 minutes.'
                }
              </p>

              {/* Lock Countdown */}
              <div className="bg-slate-50 border border-gray-100 rounded-2xl p-4 max-w-[250px] mx-auto mt-6">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Lock expires in</span>
                <span className="text-lg font-black text-[#111827] font-mono tracking-wider">{formatLockTime(lockRemainingSeconds)}</span>
              </div>
            </div>

            {/* Actions button */}
            <div className="pt-4 select-none">
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="w-full bg-gray-105 hover:bg-gray-150 text-gray-700 font-bold text-xs py-3.5 rounded-xl transition-all focus:outline-none text-center"
              >
                Return to Settings
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DeleteAccount;
