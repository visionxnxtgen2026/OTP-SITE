import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Clock, Check, X, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Local State Stores & Services
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export const VerificationPopup = () => {
  const { activeVerificationRequest, setActiveVerificationRequest } = useAuthStore();
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isResolving, setIsResolving] = useState(false);

  // Compute countdown timer
  useEffect(() => {
    if (!activeVerificationRequest) return;

    const expiryTime = new Date(activeVerificationRequest.expiresAt).getTime();
    
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setTimeLeft(diff);
      
      if (diff <= 0) {
        // Automatically close on local expiry
        toast.error('Verification challenge has expired.', { id: 'expiry-toast' });
        setActiveVerificationRequest(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeVerificationRequest, setActiveVerificationRequest]);

  if (!activeVerificationRequest) return null;

  const { verificationId, clientName, verificationCode } = activeVerificationRequest;

  // Format MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Submit Approval
  const handleApprove = async () => {
    if (isResolving) return;
    setIsResolving(true);
    const toastId = toast.loading(`Approving ${clientName} verification...`);

    try {
      await api.post(`/api/user/verification-requests/${verificationId}/approve`);
      toast.success('Identity verification approved.', { id: toastId });
      setActiveVerificationRequest(null);
    } catch (err) {
      console.error('[Approve Error]', err);
      toast.error(err.response?.data?.message || 'Failed to approve request.', { id: toastId });
    } finally {
      setIsResolving(false);
    }
  };

  // Submit Rejection
  const handleReject = async () => {
    if (isResolving) return;
    setIsResolving(true);
    const toastId = toast.loading(`Rejecting request...`);

    try {
      await api.post(`/api/user/verification-requests/${verificationId}/reject`);
      toast.success('Identity request rejected.', { id: toastId });
      setActiveVerificationRequest(null);
    } catch (err) {
      console.error('[Reject Error]', err);
      toast.error(err.response?.data?.message || 'Failed to reject request.', { id: toastId });
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 overflow-hidden flex items-end">
        {/* Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={handleReject} // Backdrop click acts as reject/cancel
        />

        {/* Slide-Up Bottom Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 24, stiffness: 160 }}
          className="relative w-full bg-white rounded-t-[26px] p-6 pb-10 shadow-[0_-12px_45px_rgba(0,0,0,0.15)] border-t border-gray-100 z-50 select-none text-center space-y-5"
        >
          {/* Bezel drag handle */}
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto" />

          {/* Shield logo Header */}
          <div className="mx-auto w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-primary shadow-soft">
            <ShieldAlert size={22} className="stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-text-primary tracking-tight">Identity Verification</h2>
            <p className="text-xs font-semibold text-text-secondary">
              <span className="text-[#111827] font-bold">{clientName}</span> wants to verify your identity.
            </p>
          </div>

          {/* Large 6-Digit Challenge Code */}
          <div className="bg-slate-50 border border-gray-100 rounded-[20px] py-5 px-6 my-2 shadow-soft flex items-center justify-center">
            <span className="text-3xl font-extrabold tracking-[10px] text-[#111827] pl-[10px] font-mono leading-none">
              {verificationCode}
            </span>
          </div>

          {/* Expiration Timer display */}
          <div className="flex items-center justify-center gap-1.5 text-amber-600 bg-amber-50/50 border border-amber-100/50 px-3.5 py-1.5 rounded-full w-fit mx-auto text-[10px] font-extrabold select-none">
            <Clock size={12} className="stroke-[2.5]" />
            <span>EXPIRES IN {formatTime(timeLeft)}</span>
          </div>

          {/* Confirm Reject Buttons */}
          <div className="grid grid-cols-2 gap-3.5 pt-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={isResolving}
              className="bg-gray-50 border border-gray-200 hover:bg-gray-100 text-text-primary font-bold text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 focus:outline-none"
            >
              <X size={14} className="stroke-[2.5] text-gray-500" />
              <span>Reject</span>
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isResolving}
              className="bg-primary hover:bg-primary-hover text-white font-bold text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-soft focus:outline-none"
            >
              <Check size={14} className="stroke-[2.5]" />
              <span>Approve</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VerificationPopup;
