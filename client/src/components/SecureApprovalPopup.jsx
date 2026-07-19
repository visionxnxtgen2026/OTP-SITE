import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldCheck, Clock, Globe, Monitor, Laptop, Smartphone,
  MapPin, CheckCircle2, XCircle, Lock, AlertTriangle, Check, ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

/* ─────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────── */

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const getInitials = (name = '') =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

const nameToHue = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
};

/**
 * Parses user agent / device string from server into separate properties
 */
const parseDeviceStr = (deviceStr = '') => {
  let browser = 'Web Browser';
  let os = 'Operating System';
  let deviceType = 'Desktop';

  if (deviceStr) {
    const parts = deviceStr.split(' on ');
    if (parts.length === 2) {
      browser = parts[0];
      os = parts[1];
    } else {
      // Fallback regex parsing
      if (deviceStr.includes('Chrome')) browser = 'Chrome';
      else if (deviceStr.includes('Safari')) browser = 'Safari';
      else if (deviceStr.includes('Firefox')) browser = 'Firefox';
      else if (deviceStr.includes('Edge')) browser = 'Edge';

      if (deviceStr.includes('Windows')) os = 'Windows';
      else if (deviceStr.includes('Mac') || deviceStr.includes('macOS')) os = 'macOS';
      else if (deviceStr.includes('Android')) os = 'Android';
      else if (deviceStr.includes('iPhone') || deviceStr.includes('iPad')) os = 'iOS';
      else if (deviceStr.includes('Linux')) os = 'Linux';
    }

    const lowerOS = os.toLowerCase();
    if (lowerOS.includes('android') || lowerOS.includes('ios') || lowerOS.includes('iphone') || lowerOS.includes('ipad')) {
      deviceType = 'Mobile';
    } else if (lowerOS.includes('windows') || lowerOS.includes('mac') || lowerOS.includes('linux')) {
      deviceType = 'Desktop';
    }
  }

  return { browser, os, deviceType };
};

/* ─────────────────────────────────────────────
   APP AVATAR
   ───────────────────────────────────────────── */
const AppAvatar = ({ name, logo, size = 56 }) => {
  const [imgError, setImgError] = useState(false);
  const hue = nameToHue(name);
  const initials = getInitials(name);

  if (logo && !imgError) {
    return (
      <img
        src={logo}
        alt={name}
        onError={() => setImgError(true)}
        style={{ width: size, height: size }}
        className="rounded-[18px] object-contain bg-white shadow-sm border border-gray-100 p-1.5"
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue},70%,60%), hsl(${hue + 45},70%,45%))`,
        fontSize: size * 0.36,
      }}
      className="rounded-[18px] flex items-center justify-center text-white font-extrabold shadow-sm select-none"
    >
      {initials || '?'}
    </div>
  );
};

/* ─────────────────────────────────────────────
   DETAIL ROW
   ───────────────────────────────────────────── */
const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 last:pb-0">
    <div className="flex items-center gap-2 text-gray-400">
      <Icon size={13} className="stroke-[2.2]" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xs font-semibold text-gray-800 truncate max-w-[60%] text-right">
      {value || '—'}
    </span>
  </div>
);

/* ─────────────────────────────────────────────
   RESULT SCREEN (Approved / Rejected)
   ───────────────────────────────────────────── */
const ResultScreen = ({ type, appName }) => {
  const approved = type === 'approved';
  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 22, stiffness: 220 }}
      className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-5"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.15 }}
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md ${
          approved ? 'bg-green-50 text-green-500 border border-green-100' : 'bg-red-50 text-red-500 border border-red-100'
        }`}
      >
        {approved ? (
          <CheckCircle2 size={40} strokeWidth={2} />
        ) : (
          <XCircle size={40} strokeWidth={2} />
        )}
      </motion.div>

      <div className="space-y-1.5">
        <h2 className={`text-lg font-black ${approved ? 'text-green-600' : 'text-red-600'}`}>
          {approved ? 'Authentication Approved' : 'Request Rejected'}
        </h2>
        <p className="text-xs text-gray-500 font-semibold leading-relaxed max-w-[280px]">
          {approved
            ? `${appName} has been securely authorized to access your DDS Identity.`
            : `You blocked this authentication request.`}
        </p>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
export const SecureApprovalPopup = () => {
  const { activeVerificationRequest, setActiveVerificationRequest } = useAuthStore();

  // phase: 'code' | 'approved' | 'rejected' | 'expired'
  const [phase, setPhase] = useState('code');
  const [code, setCode] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [shake, setShake] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  
  const inputRef = useRef(null);

  // ── Timer ────────────────────────────────────
  useEffect(() => {
    if (!activeVerificationRequest) return;
    const expiry = new Date(activeVerificationRequest.expiresAt).getTime();
    
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(diff);
      
      if (diff <= 0) {
        setPhase('expired');
        // Notify backend of expiry by rejecting it
        api.post('/api/auth/reject-verification', { 
          verificationRequestId: activeVerificationRequest.verificationId || activeVerificationRequest.verificationRequestId
        }).catch(() => {});
      }
    };
    
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeVerificationRequest]);

  // ── Focus Input on Mount ─────────────────────
  useEffect(() => {
    if (activeVerificationRequest && phase === 'code') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [activeVerificationRequest, phase]);

  // ── Reset when request changes ────────────────
  useEffect(() => {
    setPhase('code');
    setCode('');
    setIsResolving(false);
    setShake(false);
  }, [activeVerificationRequest?.verificationRequestId]);

  if (!activeVerificationRequest) return null;

  const {
    verificationId,
    verificationRequestId,
    clientName,
    applicationName,
    applicationLogo,
    developerName,
    device,
    location,
    browser,
    platform,
    requestedAt
  } = activeVerificationRequest;

  const targetId = verificationRequestId || verificationId;
  const appName = applicationName || clientName || 'Unknown App';
  const devName = developerName || 'Verified DDS Developer';
  const locationStr = location || 'Unknown Location';
  const displayPhone = activeVerificationRequest?.userPhoneNumber || activeVerificationRequest?.phoneNumber || '';
  
  // Parse device/browser/OS
  const { browser: parsedBrowser, os: parsedOS, deviceType: parsedDeviceType } = parseDeviceStr(device || platform);
  
  // Format requested time
  let requestedTime = '2:15 PM';
  if (requestedAt) {
    if (isNaN(Date.parse(requestedAt))) {
      requestedTime = requestedAt;
    } else {
      requestedTime = new Date(requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  const codeLength = activeVerificationRequest?.verificationCodeLength || 6;
  const targetCode = activeVerificationRequest?.verificationCode || '';
  const hasCode = !!targetCode || activeVerificationRequest?.codeSubmitted === true;

  // ── Real-time Comparison Check ───────────────
  const isMatch = hasCode ? code === targetCode : true;
  const isIncorrect = hasCode && (
    (code.length > 0 && !targetCode.startsWith(code)) || 
    (code.length === codeLength && code !== targetCode)
  );

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, codeLength);
    setCode(val);

    if (hasCode && val.length > 0 && !targetCode.startsWith(val)) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  // ── Approve ──────────────────────────────────
  const handleApprove = async () => {
    if (isResolving) return;
    if (hasCode && !isMatch) return;
    setIsResolving(true);
    try {
      await api.post('/api/auth/approve-verification', { 
        verificationRequestId: targetId,
        code: code || targetCode,
        enteredCode: code || targetCode
      });
      setPhase('approved');
      setTimeout(() => setActiveVerificationRequest(null), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed. Please try again.');
      setIsResolving(false);
    }
  };

  // ── Reject ───────────────────────────────────
  const handleReject = async () => {
    if (isResolving) return;
    setIsResolving(true);
    try {
      await api.post('/api/auth/reject-verification', { 
        verificationRequestId: targetId 
      });
      setPhase('rejected');
      setTimeout(() => setActiveVerificationRequest(null), 1800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed. Please try again.');
      setIsResolving(false);
    }
  };

  const handleClose = () => {
    setActiveVerificationRequest(null);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60"
        style={{ touchAction: 'none' }}
      >
        <motion.div
          key="popup-card"
          initial={{ scale: 0.93, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="w-full max-w-[395px] bg-white rounded-[24px] shadow-[0_24px_50px_rgba(0,0,0,0.18)] border border-gray-150 flex flex-col p-6 space-y-5 overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {/* ───── PHASE: CODE ENTRY / APPROVAL ───── */}
            {phase === 'code' && (
              <motion.div
                key="code-entry"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="space-y-5 flex flex-col"
              >
                {/* Header redone with DDS Branding */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-primary shadow-sm">
                      <Shield size={16} className="stroke-[2.5]" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black text-gray-900 uppercase tracking-widest block">DDS Identity</span>
                      <span className="text-[10px] text-gray-400 font-bold block mt-0.5">Secure Gateway</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50/70 border border-blue-100/50 px-2.5 py-1 rounded-full text-[9px] font-black">
                    <Clock size={11} className="stroke-[2.5] animate-pulse" />
                    <span className="font-mono">{formatTime(timeLeft)}</span>
                  </div>
                </div>

                {/* Application Card Block */}
                <div className="bg-slate-50/50 border border-gray-100 rounded-[20px] p-4 flex items-center gap-3.5 relative overflow-hidden">
                  <AppAvatar name={appName} logo={applicationLogo} size={48} />
                  <div className="flex-grow min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-gray-900 truncate">{appName}</h4>
                      <div className="flex items-center gap-0.5 bg-blue-50 text-blue-600 border border-blue-100/50 px-1.5 py-0.5 rounded-full text-[8px] font-black whitespace-nowrap">
                        <Check size={8} className="stroke-[3.5]" />
                        <span>Verified</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 truncate mt-0.5">{devName}</p>
                    <p className="text-[9px] font-extrabold text-blue-600 tracking-wider uppercase mt-1">Verified DDS Application</p>
                  </div>
                </div>

                {/* Login Request Purpose Statement */}
                <div className="text-left space-y-1 px-1">
                  <p className="text-sm font-black text-gray-900 leading-tight">
                    {appName} wants to sign in
                  </p>
                  {displayPhone && (
                    <p className="text-xs font-bold text-gray-600">
                      Mobile: <span className="font-mono text-gray-900">{displayPhone}</span>
                    </p>
                  )}
                  <p className="text-[10px] font-semibold text-gray-400 leading-relaxed">
                    {hasCode
                      ? "Enter the verification code displayed on the developer's website below:"
                      : "Waiting for developer website to issue verification code..."}
                  </p>
                </div>

                {/* Verification Code Box (Step 7 vs Step 3) */}
                {hasCode ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label htmlFor="confirmCode" className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Enter Verification Code
                      </label>
                      <span className="text-[9px] font-extrabold text-gray-400">
                        {code.length} / {codeLength} digits
                      </span>
                    </div>
                    
                    <motion.div
                      animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className={[
                        "relative flex items-center bg-gray-50 border rounded-[16px] px-4 py-3.5 transition-all duration-200",
                        isMatch 
                          ? "border-green-500 bg-green-50/20 shadow-[0_0_0_4px_rgba(34,197,94,0.12)]" 
                          : isIncorrect 
                            ? "border-red-500 bg-red-50/20 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]" 
                            : "border-gray-200 focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
                      ].join(" ")}
                    >
                      <input
                        id="confirmCode"
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={codeLength}
                        value={code}
                        onChange={handleInputChange}
                        placeholder="Enter verification code"
                        autoComplete="off"
                        className="text-sm font-bold font-mono tracking-[4px] text-gray-900 placeholder:text-gray-300 w-full outline-none bg-transparent"
                        disabled={isResolving || isMatch}
                      />
                      
                      <div className="absolute right-4 flex items-center">
                        {isMatch && (
                          <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white"
                          >
                            <Check size={12} className="stroke-[3.5]" />
                          </motion.div>
                        )}
                        {isIncorrect && (
                          <div className="w-5 h-5 bg-red-100 border border-red-200 rounded-full flex items-center justify-center text-red-500 font-bold text-[10px]">
                            !
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Status Messages */}
                    <AnimatePresence mode="wait">
                      {isIncorrect && (
                        <motion.div
                          key="error-msg"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="bg-red-50 border border-red-100 rounded-xl p-2.5 flex items-center gap-2 text-left"
                        >
                          <AlertTriangle size={13} className="text-red-500 shrink-0" />
                          <span className="text-[10px] font-bold text-red-700">Invalid verification code. Try again.</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-blue-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                      <span className="text-xs font-extrabold">Waiting for Website Code...</span>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-500">
                      Once the developer website generates your verification code, this popup will update automatically.
                    </p>
                  </div>
                )}
 
                {/* Request Information Grid */}
                <div className="bg-slate-50/50 border border-gray-100 rounded-[20px] p-4 space-y-2 text-left">
                  <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest pb-1 border-b border-gray-100/50">
                    Request Information
                  </div>
                  <DetailRow icon={parsedDeviceType === 'Mobile' ? Smartphone : Laptop} label="Device Type" value={parsedDeviceType} />
                  <DetailRow icon={parsedOS.includes('iOS') || parsedOS.includes('Android') ? Smartphone : Monitor} label="Operating System" value={parsedOS} />
                  <DetailRow icon={Globe} label="Browser" value={parsedBrowser} />
                  <DetailRow icon={MapPin} label="Approximate Location" value={locationStr} />
                  <DetailRow icon={Clock} label="Current Time" value={requestedTime} />
                </div>
 
                {/* Action Buttons sticky area */}
                <div className="flex gap-3 pt-2 relative">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isResolving}
                    className="w-1/3 py-3.5 rounded-2xl text-[11px] font-black tracking-wider text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all active:scale-[0.98] shadow-[0_6px_20px_rgba(220,38,38,0.25)] cursor-pointer"
                  >
                    Reject
                  </button>
 
                  <div className="flex-grow relative h-[48px]">
                    <AnimatePresence>
                      {(!hasCode || isMatch) ? (
                        <motion.button
                          key="approve-enabled"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          type="button"
                          onClick={handleApprove}
                          disabled={isResolving || (hasCode && !isMatch)}
                          className="absolute inset-0 w-full py-3.5 rounded-2xl text-[11px] font-black tracking-wider text-white bg-green-600 hover:bg-green-700 active:bg-green-800 transition-all shadow-[0_6px_20px_rgba(34,197,94,0.25)] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isResolving ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <ShieldCheck size={14} className="stroke-[2.5]" />
                              Approve Request
                            </>
                          )}
                        </motion.button>
                      ) : (
                        <button
                          key="approve-disabled"
                          type="button"
                          disabled
                          className="absolute inset-0 w-full py-3.5 rounded-2xl text-[11px] font-black tracking-wider text-gray-400 bg-gray-100 cursor-not-allowed border border-transparent flex items-center justify-center gap-1.5"
                        >
                          <Lock size={12} />
                          Approve Request
                        </button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ───── PHASE: APPROVED / REJECTED ───── */}
            {(phase === 'approved' || phase === 'rejected') && (
              <ResultScreen type={phase} appName={appName} />
            )}

            {/* ───── PHASE: EXPIRED ───── */}
            {phase === 'expired' && (
              <motion.div
                key="expired"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-8 text-center space-y-6"
              >
                <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center text-amber-500 shadow-sm">
                  <AlertTriangle size={32} className="stroke-[2]" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-base font-black text-gray-900">
                    Authentication request expired.
                  </h2>
                  <p className="text-xs font-semibold text-gray-400 leading-relaxed max-w-[280px]">
                    Ask {appName} to generate a new verification request.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-gray-700 font-extrabold text-xs rounded-2xl transition-all active:scale-[0.98] focus:outline-none"
                >
                  Close Window
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SecureApprovalPopup;

