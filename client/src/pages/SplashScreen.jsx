import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import logo from '../assets/logo.svg';

export const SplashScreen = ({ onComplete }) => {
  useEffect(() => {
    // Show splash screen for 2 seconds
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-4"
      >
        {/* Pulsing Logo Image */}
        <motion.img
          src={logo}
          alt="DDS Logo"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 filter drop-shadow-sm"
        />
        
        {/* Brand details */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <span className="text-3xl font-extrabold tracking-widest text-[#111827]">DDS</span>
          <span className="text-[10px] text-gray-400 font-bold tracking-wider mt-1.5 uppercase">
            Enterprise Security Gateway
          </span>
        </motion.div>
      </motion.div>

      {/* Modern Loader Progress Indicator */}
      <div className="absolute bottom-16 w-36 h-1 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ left: '-100%', width: '60%' }}
          animate={{ left: '100%', width: '40%' }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute h-full bg-primary"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
