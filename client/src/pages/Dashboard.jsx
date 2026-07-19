import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ShieldAlert, 
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Local State & Stores
import { useAuthStore } from '../store/authStore';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, activeVerificationRequest, setActiveVerificationRequest } = useAuthStore();
  const [lastBackPress, setLastBackPress] = useState(0);

  // Intercept system Back POP events on Home Dashboard
  useEffect(() => {
    // Push dummy history frame to capture next back press
    window.history.pushState(null, null, window.location.pathname);

    const handlePopState = () => {
      window.history.pushState(null, null, window.location.pathname);
      const now = Date.now();

      if (now - lastBackPress < 2000) {
        toast.success('Exiting DDS Authenticator...', { icon: '📱' });
        // Attempt exit
        setTimeout(() => {
          window.close();
        }, 800);
      } else {
        setLastBackPress(now);
        toast('Press back again to exit DDS', {
          icon: '📱',
          duration: 2000
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [lastBackPress]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFirstName = () => {
    if (!user?.displayName) return 'User';
    return user.displayName.split(' ')[0];
  };

  return (
    <div className="space-y-6 pb-6 bg-[#F8FAFC] min-h-screen flex flex-col">
      
      {/* Top App Bar (64px Height, Mobile-style) */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-30 select-none shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-150 shadow-soft bg-blue-50/50 flex items-center justify-center text-primary font-bold text-sm uppercase shrink-0">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.displayName?.slice(0, 2) || 'US'
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide leading-none">{getGreeting()}</p>
            <h2 className="text-xs font-extrabold text-text-primary leading-tight mt-1">{getFirstName()}</h2>
          </div>
        </div>

        {/* Right Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100/50 rounded-full text-[9px] font-extrabold text-primary select-none">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
          </span>
          <span>SYSTEM ACTIVE</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-5 space-y-6 flex-grow flex flex-col">
        
        {/* Onboarding Welcome Header */}
        <div className="select-none shrink-0">
          <h1 className="text-xl font-extrabold text-[#111827] tracking-tight">👋 Hello, {getFirstName()}</h1>
          <p className="text-xs font-semibold text-gray-400 mt-1">Welcome back to DDS Authenticator</p>
        </div>

        {/* Verification Alert Banner (Rendered only if mobile number is not verified) */}
        {!user?.mobileVerified && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-[22px] p-5 text-white shadow-[0_12px_24px_-8px_rgba(37,99,235,0.4)] overflow-hidden select-none shrink-0"
          >
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />
            <div className="flex gap-3.5 relative z-10">
              <div className="p-3 bg-white/10 rounded-xl w-fit h-fit border border-white/10 text-white shadow-soft">
                <ShieldAlert size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-blue-150">DDS Authentication</h3>
                <h2 className="text-sm font-extrabold mt-1">Verify Your Mobile Number</h2>
                <p className="text-[10px] text-blue-100 font-semibold leading-relaxed mt-1.5 max-w-[230px]">
                  Complete verification to secure your profile and trust this device.
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-4 relative z-10">
              <button
                onClick={() => navigate('/verify-mobile')}
                className="bg-white hover:bg-slate-50 text-primary font-extrabold text-[10px] px-5 py-2.5 rounded-xl shadow-soft transition-all focus:outline-none flex items-center gap-1"
              >
                <span>Verify Now</span>
                <ArrowRight size={10} className="stroke-[2.5]" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Pending Authentication Requests Section */}
        <div className="flex-grow flex flex-col min-h-[300px]">
          <h3 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest pl-1 mb-3 shrink-0">
            Authentication Requests
          </h3>
          
          <div className="flex-grow flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {activeVerificationRequest ? (
                <motion.div
                  key={activeVerificationRequest.verificationRequestId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-blue-200 rounded-[22px] p-5 shadow-soft space-y-4 w-full"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                        <Key size={18} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#111827]">{activeVerificationRequest.clientName}</h4>
                        <p className="text-[9px] text-gray-450 font-bold mt-0.5">Verification Request</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-primary bg-blue-50 border border-blue-100 px-2 py-0.5 rounded animate-pulse">
                      PENDING
                    </span>
                  </div>

                  <p className="text-[10px] text-text-secondary leading-relaxed font-semibold">
                    A device is requesting login access. Press Approve to enter the code and authorize.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/inbox')}
                      className="bg-gray-50 border border-gray-200 hover:bg-gray-100 text-text-primary font-bold text-[10px] py-2.5 rounded-xl transition-all focus:outline-none"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVerificationRequest({ ...activeVerificationRequest })}
                      className="bg-primary hover:bg-primary-hover text-white font-bold text-[10px] py-2.5 rounded-xl transition-all shadow-soft focus:outline-none"
                    >
                      Approve
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="no-requests"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-gray-150 rounded-[22px] py-12 px-6 text-center shadow-soft select-none space-y-4 w-full flex flex-col items-center justify-center"
                >
                  {/* SVG Shield Illustration */}
                  <svg width="56" height="56" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-500 animate-pulse">
                    <circle cx="34" cy="34" r="34" fill="#E8F5E9" />
                    <path d="M34 50C34 50 48 43 48 32V19L34 13L20 19V32C20 43 34 50 34 50Z" fill="#10B981" stroke="#10B981" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M28 32L32 36L40 28" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-black text-[#111827]">No Pending Authentication Requests</h3>
                    <p className="text-[10px] text-gray-400 leading-relaxed max-w-[260px] mx-auto font-semibold">
                      You're all caught up. New authentication requests from connected applications will appear here instantly.
                    </p>
                  </div>
                  <span className="text-[9px] font-black text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">
                    Waiting for new requests...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
