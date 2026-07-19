import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Bell, Activity, Settings } from 'lucide-react';

// Local Store
import { useAuthStore } from '../store/authStore';

export const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const unreadCount = useAuthStore((state) => state.unreadNotificationsCount);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-t border-gray-100 flex items-center justify-around px-4 z-40 select-none pb-safe">
      
      {/* 1. Home Tab */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
          isActive('/dashboard') ? 'text-primary scale-105' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Home size={19} className={isActive('/dashboard') ? 'stroke-[2.5]' : 'stroke-[2]'} />
        <span className="text-[9px] font-bold mt-1">Home</span>
      </button>

      {/* 2. Inbox Tab (with Unread Badge indicator) */}
      <button
        type="button"
        onClick={() => navigate('/inbox')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all relative ${
          isActive('/inbox') ? 'text-primary scale-105' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Bell size={19} className={isActive('/inbox') ? 'stroke-[2.5]' : 'stroke-[2]'} />
        <span className="text-[9px] font-bold mt-1">Inbox</span>
        
        {unreadCount > 0 && (
          <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-extrabold flex items-center justify-center rounded-full border border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 3. Activity History Tab */}
      <button
        type="button"
        onClick={() => navigate('/activity')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
          isActive('/activity') ? 'text-primary scale-105' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Activity size={19} className={isActive('/activity') ? 'stroke-[2.5]' : 'stroke-[2]'} />
        <span className="text-[9px] font-bold mt-1">Activity</span>
      </button>

      {/* 4. Settings Tab */}
      <button
        type="button"
        onClick={() => navigate('/settings')}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
          isActive('/settings') ? 'text-primary scale-105' : 'text-gray-400 hover:text-gray-650'
        }`}
      >
        <Settings size={19} className={isActive('/settings') ? 'stroke-[2.5]' : 'stroke-[2]'} />
        <span className="text-[9px] font-bold mt-1">Settings</span>
      </button>
      
    </div>
  );
};

export default BottomNavigation;
