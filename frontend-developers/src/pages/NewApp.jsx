import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Loader2, Copy, Check, Eye, EyeOff, RotateCcw, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const NewApp = () => {
  const navigate = useNavigate();

  // ── Form State ──────────────────────────────────────────────────────────────
  const [appName, setAppName] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [domainsInput, setDomainsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ── Post-Creation State ──────────────────────────────────────────────────────
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // ── Submit Handler ──────────────────────────────────────────────────────────
  const handleCreateApplication = async (e) => {
    e.preventDefault();
    if (!appName.trim()) {
      toast.error('Application name is required.');
      return;
    }

    setIsLoading(true);
    try {
      const allowedDomains = domainsInput
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      const res = await api.post('/api/dev/apps', {
        applicationName: appName.trim(),
        environment,
        allowedDomains
      });

      const app = res.data.application;
      const creds = res.data.credentials;

      if (!creds || !creds.rawSecret) {
        toast.error('Application created but credentials were not returned. Please contact support.');
        return;
      }

      setCreatedCredentials({
        app,
        applicationId: creds.applicationId,
        publicKey: creds.publicKey,
        secretKey: creds.rawSecret,
        keyId: creds.keyId
      });

      toast.success(`"${app.applicationName}" created successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create application.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, id, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success(label);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleRegenerateKey = async (type) => {
    if (!window.confirm(`Regenerate ${type}? Existing credentials will be immediately invalidated.`)) {
      return;
    }

    try {
      // Call backend rotation API so the new secret hash is persisted in the database
      const appIdStr = createdCredentials?.applicationId;
      const keyId = createdCredentials?.keyId;

      if (!appIdStr || !keyId) {
        toast.error('Cannot regenerate: missing application or key reference. Please re-create the application.');
        return;
      }

      const res = await api.post(`/api/dev/apps/${appIdStr}/keys/${keyId}/rotate`);
      const rotated = res.data.key;

      setCreatedCredentials((prev) => ({
        ...prev,
        publicKey: rotated.publicKey || prev.publicKey,
        secretKey: rotated.rawSecret
      }));

      toast.success(`${type} regenerated and persisted successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to regenerate ${type}.`);
    }
  };

  return (
    <div className="p-8 max-w-3xl text-left">
      <button
        onClick={() => navigate('/apps')}
        className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Applications
      </button>

      {/* ── VIEW 1: CREATION FORM ────────────────────────────────────────────── */}
      {!createdCredentials ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create Application</h1>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Enter application details. DDS will automatically generate your API credentials upon creation.
            </p>
          </div>

          <form
            onSubmit={handleCreateApplication}
            className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6"
          >
            {/* 1. Application Name (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Application Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Flipkart"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* 2. Environment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Environment
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEnvironment('production')}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                    environment === 'production'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 ring-2 ring-blue-500/10'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  ● Production
                </button>
                <button
                  type="button"
                  onClick={() => setEnvironment('development')}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                    environment === 'development'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-700 ring-2 ring-blue-500/10'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  ○ Development
                </button>
              </div>
            </div>

            {/* 3. Allowed Domains */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Allowed Domains
              </label>
              <input
                type="text"
                value={domainsInput}
                onChange={(e) => setDomainsInput(e.target.value)}
                placeholder="flipkart.com, seller.flipkart.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
              <p className="text-[11px] text-gray-400 font-medium">
                Comma-separated domains authorized to interact with this application.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/apps')}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
                {isLoading ? 'Generating Credentials...' : 'Create Application'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ── VIEW 2: POST-CREATION GENERATED CREDENTIALS ─────────────────────── */
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 flex items-start gap-3">
            <ShieldCheck size={22} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-black text-emerald-900">Application & Credentials Generated</h2>
              <p className="text-xs text-emerald-700 mt-0.5 font-medium leading-relaxed">
                Copy these three credentials into your backend <code className="font-mono font-bold bg-white/70 px-1 rounded">.env</code> file. Your application is ready for integration.
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-gray-900 tracking-tight">API Credentials</h2>

            <div className="space-y-4">
              {/* 1. Application ID */}
              <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    1. Application ID
                  </span>
                  <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase font-mono">
                    {createdCredentials.applicationId}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-3">
                  <code className="text-xs font-mono font-bold text-gray-900 truncate">
                    {createdCredentials.applicationId}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdCredentials.applicationId, 'gen-app-id', 'Application ID copied!')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-md transition-all shrink-0"
                  >
                    {copiedId === 'gen-app-id' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} Copy
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">
                  Unique identifier for this application.
                </p>
              </div>

              {/* 2. Public API Key */}
              <div className="bg-gray-50/80 border border-gray-200/70 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    2. Public API Key
                  </span>
                  <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">
                    Frontend Identifier
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-3">
                  <code className="text-xs font-mono font-bold text-gray-900 truncate">
                    {createdCredentials.publicKey}
                  </code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyToClipboard(createdCredentials.publicKey, 'gen-pub-key', 'Public API Key copied!')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-md transition-all"
                    >
                      {copiedId === 'gen-pub-key' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} Copy
                    </button>
                    <button
                      onClick={() => handleRegenerateKey('Public Key')}
                      className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-md transition-all"
                      title="Regenerate Public Key"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">
                  Identifies the application making authentication requests.
                </p>
              </div>

              {/* 3. Secret API Key */}
              <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider">
                    3. Secret API Key
                  </span>
                  <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded uppercase">
                    Backend Only
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-lg p-3">
                  <code className={`text-xs font-mono font-bold text-gray-900 truncate ${showSecretKey ? '' : 'blur-[3px] select-none'}`}>
                    {showSecretKey ? createdCredentials.secretKey : 'dds_sk_live_************************'}
                  </code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-md transition-all"
                    >
                      {showSecretKey ? <EyeOff size={13} /> : <Eye size={13} />} {showSecretKey ? 'Hide' : 'Reveal'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(createdCredentials.secretKey, 'gen-sec-key', 'Secret API Key copied!')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-md transition-all"
                    >
                      {copiedId === 'gen-sec-key' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} Copy
                    </button>
                    <button
                      onClick={() => handleRegenerateKey('Secret API Key')}
                      className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-md transition-all"
                      title="Regenerate Secret Key"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>

                {/* Warning Banner */}
                <div className="flex items-center gap-1.5 text-amber-800 bg-amber-100/70 p-2 rounded-md text-[10px] font-bold">
                  <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                  <span>⚠ Never expose this key in frontend applications.</span>
                </div>

                <p className="text-[11px] text-gray-500 font-medium">
                  Authenticates requests from the developer backend.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => navigate(`/apps/${createdCredentials.applicationId}`)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              Go to Application Details <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewApp;
