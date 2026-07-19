import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  ShieldCheck, 
  Bell, 
  LogOut, 
  Info, 
  Lock,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Local State & Stores
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export const Settings = () => {
  const navigate = useNavigate();
  const { user, logout, updateUserProfile } = useAuthStore();
  
  // Local edit states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Submit profile settings
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || isUpdating) return;

    setIsUpdating(true);
    const toastId = toast.loading('Saving profile changes...');

    try {
      const response = await api.patch('/api/user/settings', {
        displayName
      });
      const { user: updatedUser } = response.data;
      
      updateUserProfile(updatedUser);
      toast.success('Profile updated successfully!', { id: toastId });
    } catch (err) {
      console.error('[Update Profile Error]', err);
      toast.error(err.response?.data?.message || 'Failed to update profile.', { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  // Toggle Preferences
  const handlePreferenceToggle = async (key, val) => {
    const toastId = toast.loading('Updating settings...');
    try {
      const response = await api.patch('/api/user/settings', {
        preferences: {
          ...user?.preferences,
          [key]: val
        }
      });
      const { user: updatedUser } = response.data;
      updateUserProfile(updatedUser);
      toast.success('Setting updated successfully!', { id: toastId });
    } catch (err) {
      console.error('[Update Preference Error]', err);
      toast.error('Failed to update settings.', { id: toastId });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-full bg-gray-50/50 pb-[120px] flex flex-col">
      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-extrabold text-[#111827]">Settings</h1>
        </div>
      </div>

      {/* Content container - scrolls naturally under parent layout container */}
      <div className="px-5 py-6 space-y-6">

        {/* Profile Info Details Card */}
        <div className="bg-white border border-gray-150 rounded-[18px] p-5 shadow-soft">
          <h3 className="text-[10px] font-extrabold text-[#111827] uppercase tracking-wider mb-4 select-none">Profile Info</h3>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5 select-none pl-0.5">Full Name</label>
              <div className="relative flex items-center">
                <User size={13} className="absolute left-3 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs text-text-primary bg-white border border-gray-255 rounded-xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5 select-none pl-0.5">Email Address</label>
              <div className="w-full text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-semibold flex items-center gap-2 select-none">
                <Mail size={13} className="text-gray-400" />
                <span className="truncate flex-grow">{user?.email}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdating || !displayName.trim() || displayName === user?.displayName}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-soft transition-all focus:outline-none"
            >
              Save Profile Name
            </button>
          </form>
        </div>

        {/* Account Section */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pl-1 select-none">Account</h3>
          
          <div className="bg-white border border-gray-150 rounded-[18px] p-5 shadow-soft space-y-5">
            {/* Google Account */}
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-text-primary text-xs">Google Account</p>
                <p className="text-[9px] text-gray-405 mt-0.5">Connected identity partner</p>
              </div>
              <span className="text-[9px] font-extrabold text-green-700 bg-green-50 border border-green-150 px-2.5 py-1 rounded-lg">
                CONNECTED
              </span>
            </div>

            <hr className="border-gray-50" />

            {/* Linked Mobile Number */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-text-primary text-xs">Linked Mobile Number</p>
                  <p className="text-sm font-black text-primary mt-1 font-mono tracking-wide">
                    {user?.mobileVerified ? user.phoneNumber : 'Not Verified'}
                  </p>
                </div>
                {user?.mobileVerified && (
                  <span className="text-[9px] font-extrabold text-green-700 bg-green-50 border border-green-150 px-2 py-0.5 rounded-lg flex items-center gap-0.5 select-none">
                    Verified ✓
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate('/verify-mobile')}
                className={`w-full font-bold text-xs py-2.5 px-4 rounded-xl border transition-all focus:outline-none text-center ${
                  user?.mobileVerified
                    ? 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100'
                    : 'text-white bg-primary hover:bg-primary-hover border-transparent shadow-soft'
                }`}
              >
                {user?.mobileVerified ? 'Change Number' : 'Verify Now'}
              </button>
            </div>

          </div>
        </div>

        {/* Privacy & Security card */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pl-1 select-none">Privacy & Security</h3>
          <div className="bg-white border border-gray-150 rounded-[18px] p-4 shadow-soft space-y-4 text-xs select-none">
            
            {/* Trusted Device */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50/50 border border-blue-100/20 text-primary flex items-center justify-center shrink-0">
                <Lock size={14} />
              </div>
              <div>
                <p className="font-bold text-text-primary">Trusted Device Model</p>
                <p className="text-[9px] text-gray-450 mt-0.5 leading-relaxed">
                  This account is securely locked to your verified device. If you log in on another phone, mobile verification is required to grant authorization rights.
                </p>
              </div>
            </div>

            <hr className="border-gray-50" />

            {/* Notifications settings */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-text-primary flex items-center gap-2"><Bell size={13} className="text-gray-450" /> Push Notifications</span>
              <button
                type="button"
                onClick={() => handlePreferenceToggle('notifications', !user?.preferences?.notifications)}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                  user?.preferences?.notifications ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-soft transition-transform duration-200 ${
                  user?.preferences?.notifications ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* About Card */}
        <div className="bg-white border border-gray-150 rounded-[18px] p-3 shadow-soft space-y-0.5 text-xs select-none">
          <div className="flex justify-between items-center p-2.5 rounded-xl">
            <span className="font-semibold text-text-primary flex items-center gap-2"><Info size={13} className="text-gray-450" /> About DDS</span>
            <span className="text-[9px] font-black text-gray-400 font-mono">v1.2.0</span>
          </div>
        </div>

        {/* Danger Zone Section */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest pl-1 select-none">Danger Zone</h3>
          
          <div className="bg-red-50/40 border border-red-100 rounded-[18px] p-5 shadow-soft space-y-4">
            <div>
              <p className="font-bold text-red-700 text-xs">Delete DDS Account</p>
              <p className="text-[10px] text-red-600 font-semibold mt-1 leading-relaxed">
                This action permanently deletes your DDS account.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/delete-account')}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-soft transition-all focus:outline-none text-center"
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Sign Out Action */}
        <div className="select-none">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-text-primary font-bold text-xs py-3.5 px-4 rounded-xl transition-all focus:outline-none flex items-center justify-center gap-2 shadow-soft"
          >
            <LogOut size={14} className="text-gray-550" />
            <span>Sign Out of DDS</span>
          </motion.button>
        </div>

      </div>
    </div>
  );
};

export default Settings;
