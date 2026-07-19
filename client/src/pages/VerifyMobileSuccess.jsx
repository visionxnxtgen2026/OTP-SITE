import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Check } from 'lucide-react';
import { motion } from 'framer-motion';

// Local State & Stores
import { useAuthStore } from '../store/authStore';

export const VerifyMobileSuccess = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && !user.mobileVerified) {
      navigate('/verify-mobile');
    }
  }, [user, navigate]);

  const handleFinish = () => {
    navigate('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col min-h-screen bg-[#F8FAFC] select-none text-center relative overflow-hidden"
    >
      {/* Ambient background glows */}
      <div className="absolute top-10 left-[-20%] w-72 h-72 rounded-full bg-green-500/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-20 right-[-20%] w-80 h-80 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      {/* Main Container Chassis */}
      <div className="flex-grow w-full max-w-[430px] mx-auto px-6 py-8 flex flex-col justify-between overflow-y-auto pb-10 relative z-10">
        
        <div className="space-y-8 pt-10">
          
          {/* Animated success checkmark circle */}
          <div className="flex justify-center">
            <div className="relative w-36 h-36 bg-green-50 border border-green-100/50 rounded-full flex items-center justify-center shadow-soft">
              {/* Outer pulsing layer */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.15, opacity: 0.15 }}
                transition={{ repeat: Infinity, duration: 1.6, repeatType: 'reverse', ease: 'easeInOut' }}
                className="absolute inset-0 bg-green-500 rounded-full"
              />
              {/* Core Checkmark */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.15 }}
                className="relative z-10 w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white shadow-soft"
              >
                <Check size={36} className="stroke-[3.5]" />
              </motion.div>
            </div>
          </div>

          {/* Typography headers */}
          <div className="space-y-3 px-2">
            <h1 className="text-2xl font-black text-green-600 tracking-tight leading-tight">Mobile Number Verified</h1>
            <p className="text-xs font-semibold text-text-secondary leading-relaxed max-w-[280px] mx-auto">
              Your phone number has been successfully verified. Your DDS Identity is now active.
            </p>
          </div>

          {/* Identity Details Card */}
          {user && (
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-gray-150 rounded-[22px] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.02)] text-left text-xs"
            >
              {/* Verified number */}
              <div className="flex justify-between items-center select-none py-2">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Verified Number</p>
                  <p className="text-xs font-extrabold text-text-primary mt-1">{user.phoneNumber}</p>
                </div>
                <span className="text-[9px] font-black text-green-700 bg-green-50/50 border border-green-150 px-2.5 py-1 rounded-lg">
                  Verified ✅
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Finish button */}
        <div className="pt-2">
          <motion.button
            type="button"
            onClick={handleFinish}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-xs h-14 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-[0_8px_25px_-8px_rgba(37,99,235,0.45)] focus:outline-none"
          >
            <span>Continue to DDS</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default VerifyMobileSuccess;
