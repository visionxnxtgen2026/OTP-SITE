import React from 'react';
import { Settings as SettingsIcon, ShieldCheck, User, Key, Server } from 'lucide-react';
import { useAdminStore } from '../store/adminStore';

export const Settings = () => {
  const { admin } = useAdminStore();

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-black text-white uppercase tracking-tight">Admin Portal Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Platform administration profile and cryptographic security preferences.</p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <User size={16} className="text-blue-400" /> Active Administrator Account
        </h2>

        <div className="divide-y divide-slate-800 text-xs">
          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400 font-medium">Email Address</span>
            <span className="font-bold text-white font-mono">{admin?.email || 'admin@dds.internal'}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400 font-medium">Role Access Level</span>
            <span className="px-2.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/40 rounded font-black text-[10px] uppercase font-mono">
              ADMINISTRATOR (FULL SYSTEM CAPABILITIES)
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-slate-400 font-medium">Session ID Token</span>
            <span className="text-slate-500 font-mono text-[11px]">Active JWT Session</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Server size={16} className="text-purple-400" /> Platform Isolation & Security Enforcements
        </h2>

        <ul className="text-xs text-slate-300 space-y-2.5 list-disc pl-4 font-medium leading-relaxed">
          <li>Normal Users and Developers cannot log into this Admin Portal application.</li>
          <li>Secret API Keys, OTP codes, verification numbers, and Stripe Secret keys are never rendered in the frontend.</li>
          <li>Every state modification is logged to the immutable MongoDB <code className="font-mono bg-slate-950 px-1 py-0.5 rounded text-blue-400">auditlogs</code> collection.</li>
        </ul>
      </div>
    </div>
  );
};

export default Settings;
