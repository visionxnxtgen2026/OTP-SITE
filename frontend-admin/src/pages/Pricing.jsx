import React, { useState, useEffect } from 'react';
import { Sliders, Save, ShieldAlert, CheckCircle, RefreshCw, CreditCard, Shield, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const Pricing = () => {
  const [formState, setFormState] = useState({
    dailyFreeRequests: 5,
    authRequestPricePaise: 50,
    monthlyGracePeriodDays: 7,
    maxVerificationAttempts: 3,
    verificationLockTimeMins: 30,
    accountDeleteOtpAttempts: 3,
    billingCurrency: 'INR',
    invoiceDay: 1,
    billingEnabled: true,
    autoSuspend: true,
    taxPercentage: 18,
    enableSandbox: true,
    stripePublicKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/config');
      if (response.data.success && Array.isArray(response.data.configs)) {
        const map = {};
        response.data.configs.forEach((c) => {
          map[c.key] = c.value;
        });
        setFormState((prev) => ({ ...prev, ...map }));
      }
    } catch (err) {
      console.error('[Pricing Config Fetch Error]', err);
      toast.error('Failed to load system configurations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleChange = (key, val) => {
    setFormState((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const toastId = toast.loading('Saving configurations to MongoDB...');

    try {
      const updatedConfigs = Object.keys(formState).map(key => {
        const val = formState[key];
        // Handle number conversions
        let finalVal = val;
        if (typeof val === 'string' && val.trim() !== '') {
          if (!isNaN(Number(val))) {
            finalVal = Number(val);
          }
        }
        // Handle booleans
        if (val === 'true') finalVal = true;
        if (val === 'false') finalVal = false;
        
        return { key, value: finalVal };
      });

      const payload = {
        configs: updatedConfigs
      };

      const response = await api.post('/admin/config', payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        if (Array.isArray(response.data.configs)) {
          const map = {};
          response.data.configs.forEach((c) => {
            map[c.key] = c.value;
          });
          setFormState((prev) => ({ ...prev, ...map }));
        }
        toast.success('Settings saved successfully', { id: toastId });
      }
    } catch (err) {
      console.error('Save Error:', err);
      toast.error(err.response?.data?.message || 'Failed to save settings.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto text-slate-205">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Sliders className="text-blue-500" size={22} />
            System Governance & Billing Setup
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic platform billing options, Stripe endpoints, and developer security policies.
          </p>
        </div>
        <button
          onClick={fetchConfigs}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-250 rounded-xl text-xs font-bold transition-all border border-slate-800 cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Persistence Banner */}
      <div className="bg-blue-950/40 border border-blue-900/40 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-300">
        <CheckCircle size={18} className="text-blue-400 shrink-0" />
        <span>
          <strong>Dynamic MongoDB Configuration Active:</strong> Changes apply in real time across the developer portal and user APIs without restarts.
        </span>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-8">
        
        {/* Section 1: Developer Billing Configuration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex items-start gap-4 border-b border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Developer Billing & Limits</h2>
              <p className="text-xs text-slate-400 mt-1">
                Globally enforce pricing rules, currency preferences, tax percentages, and automatic suspension.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Free Requests Per Day */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Daily Free Limit</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Daily free quota requests resets at 12:00 AM local time.</p>
              <input
                type="number"
                min="0"
                value={formState.dailyFreeRequests}
                onChange={(e) => handleChange('dailyFreeRequests', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500 transition-colors font-bold"
              />
            </div>

            {/* Price Per Request */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Price Per Request (Paise)</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Cost per extra check (50 paise = ₹0.50).</p>
              <input
                type="number"
                min="0"
                value={formState.authRequestPricePaise}
                onChange={(e) => handleChange('authRequestPricePaise', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500 transition-colors font-bold"
              />
            </div>

            {/* Invoice Grace Period */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Grace Period (Days)</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Overdue days threshold before account suspension blocks are added.</p>
              <input
                type="number"
                min="1"
                value={formState.monthlyGracePeriodDays}
                onChange={(e) => handleChange('monthlyGracePeriodDays', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500 transition-colors font-bold"
              />
            </div>

            {/* Billing Currency */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Currency</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Three-letter ISO code for customer pricing.</p>
              <input
                type="text"
                value={formState.billingCurrency}
                onChange={(e) => handleChange('billingCurrency', e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500 transition-colors font-bold"
              />
            </div>

            {/* Tax Percentage */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Tax Ratio (%)</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Applied rate during invoice calculation (e.g. 18 = 18% GST).</p>
              <input
                type="number"
                min="0"
                max="100"
                value={formState.taxPercentage}
                onChange={(e) => handleChange('taxPercentage', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500 transition-colors font-bold"
              />
            </div>

            {/* Invoice Day of Month */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Invoice Day of Month</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Day of the month to trigger invoice compile (1-28).</p>
              <input
                type="number"
                min="1"
                max="28"
                value={formState.invoiceDay}
                onChange={(e) => handleChange('invoiceDay', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-blue-500 transition-colors font-bold"
              />
            </div>

            {/* Billing Enabled Toggle */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Enable Billing State</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Toggle subscription invoicing processing state.</p>
              <select
                value={formState.billingEnabled ? 'true' : 'false'}
                onChange={(e) => handleChange('billingEnabled', e.target.value === 'true')}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="true">Enabled (Invoicing Active)</option>
                <option value="false">Disabled (Free Limits Only)</option>
              </select>
            </div>

            {/* Auto-Suspend Toggle */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2 flex flex-col justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Auto Suspend Overdue Accounts</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Automatically block verification keys when invoices expire grace period.</p>
              <select
                value={formState.autoSuspend ? 'true' : 'false'}
                onChange={(e) => handleChange('autoSuspend', e.target.value === 'true')}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="true">Enable Suspension Blocks</option>
                <option value="false">Soft Warning Mode (No Blocks)</option>
              </select>
            </div>

          </div>
        </div>

        {/* Section 2: Stripe Integration Credentials */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex items-start gap-4 border-b border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-650/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Stripe Integration Credentials</h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your Stripe webhook secrets, API access keys, and sandbox modes securely.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            
            {/* Sandbox Toggle */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Stripe Sandbox / Test Mode</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Toggles sandbox mock confirms when real Stripe keys are omitted.</p>
              <select
                value={formState.enableSandbox ? 'true' : 'false'}
                onChange={(e) => handleChange('enableSandbox', e.target.value === 'true')}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="true">Sandbox Simulation Mode Active (Uses sk_test_mock)</option>
                <option value="false">Production Stripe Gateway Active</option>
              </select>
            </div>

            {/* Public Key */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Stripe Publishable Key</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Required on developer portal to render card input Elements securely.</p>
              <input
                type="text"
                placeholder="pk_test_..."
                value={formState.stripePublicKey}
                onChange={(e) => handleChange('stripePublicKey', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Secret Key */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Lock size={12} className="text-slate-400" />
                <label className="text-xs font-black uppercase tracking-wider text-slate-200">Stripe Secret Key</label>
              </div>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Confidential back-end secret token used to request SetupIntents, Customers, and Invoices.</p>
              <input
                type="password"
                placeholder="sk_test_..."
                value={formState.stripeSecretKey}
                onChange={(e) => handleChange('stripeSecretKey', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Webhook Secret */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2">
                <Lock size={12} className="text-slate-400" />
                <label className="text-xs font-black uppercase tracking-wider text-slate-200">Stripe Webhook Secret</label>
              </div>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Enables verification signature validations on incoming charge payloads.</p>
              <input
                type="password"
                placeholder="whsec_..."
                value={formState.stripeWebhookSecret}
                onChange={(e) => handleChange('stripeWebhookSecret', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

          </div>
        </div>

        {/* Section 3: User Authentication & Security */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex items-start gap-4 border-b border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">User Authentication & Security</h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure user verification lockouts, OTP rate limits, and delete cooldowns.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Maximum Verification Attempts */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Max Verification Attempts</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Failed attempts allowed before cooldown lockout.</p>
              <input
                type="number"
                min="1"
                value={formState.maxVerificationAttempts}
                onChange={(e) => handleChange('maxVerificationAttempts', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-amber-500 transition-colors font-bold"
              />
            </div>

            {/* Lockout Duration (Minutes) */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Lockout Duration (Minutes)</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Temporary block period applied to locked out numbers.</p>
              <input
                type="number"
                min="1"
                value={formState.verificationLockTimeMins}
                onChange={(e) => handleChange('verificationLockTimeMins', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-amber-500 transition-colors font-bold"
              />
            </div>

            {/* Delete Account OTP Attempts */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-200">Delete Account OTP Attempts</label>
              <p className="text-[10px] text-slate-405 font-medium leading-normal">Max validation attempts during profile deletions.</p>
              <input
                type="number"
                min="1"
                value={formState.accountDeleteOtpAttempts}
                onChange={(e) => handleChange('accountDeleteOtpAttempts', e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none focus:border-amber-500 transition-colors font-bold"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-blue-600/20 cursor-pointer"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving Configurations...' : 'Save Governance Rules'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Pricing;
