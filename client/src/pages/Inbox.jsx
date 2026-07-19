import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, ShieldAlert, Key, MessageSquare, AlertCircle } from 'lucide-react';

// Local Stores & Hooks
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';

export const Inbox = () => {
  const { activeVerificationRequest, resetUnreadCount } = useAuthStore();
  const { notifications } = useSocket();

  // Reset unread notifications badge count on page mount
  useEffect(() => {
    resetUnreadCount();
  }, [resetUnreadCount]);

  // Map pre-loaded mock system alerts for a premium feel
  const systemAlerts = [
    {
      id: 'alert_1',
      title: 'DDS Identity Core Initialized',
      body: 'Your permanent DDS identity is active and linked. Ready for secure API connections.',
      type: 'info',
      time: 'Today, 9:00 AM'
    },
    {
      id: 'alert_2',
      title: 'New API Connection Pre-seeded',
      body: 'Integrated TravelLoop (clientId: client_123) is pre-authorized for integration validations.',
      type: 'warning',
      time: 'Yesterday, 4:30 PM'
    }
  ];

  return (
    <div className="space-y-6 pb-6 bg-[#F8FAFC] min-h-full">
      {/* Top App Bar (64px Height, perfect centering, subtle bottom divider) */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30 select-none">
        <div className="w-9 h-9" />
        <h2 className="text-xs font-black text-text-primary tracking-widest uppercase">Inbox Notifications</h2>
        <div className="w-9 h-9" />
      </div>

      {/* Main Inbox Body */}
      <div className="px-5 space-y-6">
        
        {/* Active Pending verification request row */}
        {activeVerificationRequest && (
          <div className="space-y-3">
            <h3 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">Action Required</h3>
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-blue-50/50 border border-blue-200/80 rounded-[22px] p-5 shadow-soft space-y-4 text-xs select-none"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-soft shrink-0">
                    <Key size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-[#111827]">{activeVerificationRequest.clientName}</h4>
                    <p className="text-[10px] text-primary font-bold mt-0.5">Verification Request Pending</p>
                  </div>
                </div>
                <span className="text-[8px] font-black text-primary bg-blue-100/60 border border-blue-150 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  PENDING
                </span>
              </div>

              <div className="text-[10px] text-text-secondary leading-relaxed font-semibold">
                An application is requesting your mobile identity verification. Open this request inside the DDS app to type the 6-digit challenge code shown.
              </div>

              {/* Click to trigger popup */}
              <button
                type="button"
                onClick={() => useAuthStore.getState().setActiveVerificationRequest({ ...activeVerificationRequest })}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2.5 rounded-xl transition-all shadow-soft focus:outline-none"
              >
                Authenticate Now
              </button>
            </motion.div>
          </div>
        )}

        {/* Real-time incoming Alerts list */}
        <div className="space-y-3">
          <h3 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">Alerts & System Logs</h3>
          
          <div className="space-y-3.5">
            {/* Live Socket Notifications */}
            {notifications.map((notif, idx) => (
              <motion.div
                key={`live-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-150 rounded-[18px] p-4 shadow-soft flex gap-3"
              >
                <div className="w-8 h-8 bg-blue-50 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <Bell size={15} />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-extrabold text-text-primary">System Notification</h4>
                  <p className="text-[10px] font-semibold text-text-secondary leading-relaxed">
                    {notif.message || notif}
                  </p>
                  <p className="text-[8px] text-gray-450 font-bold uppercase tracking-wider mt-1">Live alert</p>
                </div>
              </motion.div>
            ))}

            {/* Static System Alerts */}
            {systemAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white border border-gray-150 rounded-[18px] p-4 shadow-soft flex gap-3"
              >
                <div className="w-8 h-8 bg-slate-50 text-gray-500 rounded-xl flex items-center justify-center shrink-0">
                  {alert.type === 'warning' ? <ShieldAlert size={15} className="text-amber-500" /> : <AlertCircle size={15} />}
                </div>
                <div className="space-y-1 text-xs select-none">
                  <h4 className="font-extrabold text-[#111827]">{alert.title}</h4>
                  <p className="text-[10px] font-semibold text-text-secondary leading-relaxed">
                    {alert.body}
                  </p>
                  <p className="text-[8px] text-gray-450 font-bold uppercase tracking-wider mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Inbox;
