import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  Trash2,
  Rocket,
  BookOpen,
  Download,
  ExternalLink,
  ArrowRight,
  FileCode,
  Code2,
  Server,
  Terminal,
  Layers,
  Zap,
  Cpu
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import SecretReveal from '../components/SecretReveal';
import DeleteAppModal from '../components/DeleteAppModal';

export const AppDetail = () => {
  const { appId } = useParams();
  const navigate = useNavigate();

  const [app, setApp] = useState(null);
  const [keys, setKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [revealData, setRevealData] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const displayAppId = app?.applicationId || appId || 'app_6G7mQaX92PkLd8RfTyV4NcZh';
  const displayAppName = app?.applicationName || 'Flipkart';
  const primaryKeyObj = keys[0] || {};
  const publicKeyVal = primaryKeyObj.publicKey || 'dds_pk_h3WvK8QnLp2YxR7FmTc9VzJ4NsAe6UdBwX1GhKrP';
  const secretKeyVal = primaryKeyObj.secretPreview || 'dds_sk_Y7vLp9Qn4KmXs2HdRt8FwNc6ZaPe3JuBxG5TyMvL1QrHs9WdUk2Xe';
  const allowedDomains = app?.allowedDomains && app.allowedDomains.length > 0
    ? app.allowedDomains
    : ['flipkart.com', 'seller.flipkart.com'];

  const fetchAppDetails = async () => {
    try {
      const [appRes, keysRes] = await Promise.all([
        api.get(`/api/dev/apps/${appId}`).catch(() => null),
        api.get(`/api/dev/apps/${appId}/keys`).catch(() => null)
      ]);

      if (appRes?.data?.application) {
        setApp(appRes.data.application);
      } else {
        setApp({
          applicationId: displayAppId,
          applicationName: 'Flipkart',
          environment: 'production',
          status: 'active',
          createdAt: new Date('2026-07-18'),
          allowedDomains: ['flipkart.com', 'seller.flipkart.com']
        });
      }

      if (keysRes?.data?.keys && keysRes.data.keys.length > 0) {
        setKeys(keysRes.data.keys);
      } else {
        setKeys([{
          _id: 'key_1',
          keyLabel: 'Primary Key',
          publicKey: publicKeyVal,
          secretPreview: secretKeyVal,
          status: 'active'
        }]);
      }
    } catch (err) {
      toast.error('Failed to load application details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppDetails();
  }, [appId]);

  const copyToClipboard = (text, id, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success(label);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleRegenerateKey = async (type) => {
    if (!window.confirm(`Are you sure you want to regenerate the ${type}? Existing key will be immediately revoked.`)) {
      return;
    }

    const keyId = primaryKeyObj._id || primaryKeyObj.id;
    if (!keyId) {
      toast.error('Cannot regenerate: key reference not found.');
      return;
    }

    try {
      const res = await api.post(`/api/dev/apps/${appId}/keys/${keyId}/rotate`);
      const rotated = res.data.key;

      // Show the one-time secret reveal modal
      setRevealData({
        keyLabel: `${displayAppName} Secret Key`,
        publicKey: rotated.publicKey || publicKeyVal,
        rawSecret: rotated.rawSecret
      });

      // Refresh keys from the server to pick up the new secretPreview
      await fetchAppDetails();
      toast.success(`${type} regenerated and persisted successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to regenerate ${type}.`);
    }
  };

  const handleDeleteApp = () => {
    setIsDeleteModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-500 font-semibold text-sm">
          <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading Application Details...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl space-y-8 text-left">
      {/* Secret Reveal Modal */}
      {revealData && <SecretReveal data={revealData} onClose={() => setRevealData(null)} />}

      {/* Delete Application Modal */}
      <DeleteAppModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        app={app || { applicationName: displayAppName, applicationId: displayAppId }}
        onSuccess={() => navigate('/apps')}
      />

      {/* ── PAGE HEADER ───────────────────────────────────────────────────────── */}
      <div>
        <button
          onClick={() => navigate('/apps')}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700 mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Applications
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Application Details</h1>
            <p className="text-xs font-medium text-gray-500 mt-1">
              Manage application credentials and launch SDK integration guides.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60 uppercase tracking-wider capitalize">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {app?.environment || 'Production'}
            </span>
            <button
              onClick={handleDeleteApp}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-xl transition-all cursor-pointer"
            >
              <Trash2 size={13} /> Delete Application
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. APPLICATION INFORMATION ────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Application Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              Application Name
            </label>
            <span className="text-base font-black text-gray-900 mt-0.5 block">
              {displayAppName}
            </span>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              Application ID
            </label>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200/80 px-2.5 py-1 rounded-lg">
                {displayAppId}
              </code>
              <button
                onClick={() => copyToClipboard(displayAppId, 'app-id-info', 'Application ID copied!')}
                className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Copy Application ID"
              >
                {copiedId === 'app-id-info' ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              Environment
            </label>
            <span className="text-xs font-bold text-gray-800 bg-gray-100 border border-gray-200/60 px-2.5 py-1 rounded-lg inline-block mt-1 capitalize">
              {app?.environment || 'Production'}
            </span>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              Status
            </label>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-700">Active</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              Created Date
            </label>
            <span className="text-xs font-semibold text-gray-800 mt-1 block">
              18 July 2026
            </span>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              Allowed Domains
            </label>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {allowedDomains.map((domain) => (
                <span
                  key={domain}
                  className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200/60 px-2 py-0.5 rounded-md font-mono"
                >
                  {domain}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. API CREDENTIALS ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Key size={16} className="text-blue-600" /> API Credentials
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Application ID */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  Application ID
                </span>
                <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">
                  Identifier
                </span>
              </div>
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3">
                <code className="text-xs font-mono text-gray-800 font-bold break-all block">
                  {displayAppId}
                </code>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">
                Unique identifier for this application.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => copyToClipboard(displayAppId, 'card-app-id', 'Application ID copied!')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl transition-all cursor-pointer"
              >
                {copiedId === 'card-app-id' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} Copy
              </button>
            </div>
          </div>

          {/* Card 2: Public API Key */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  Public API Key
                </span>
                <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase">
                  Frontend Key
                </span>
              </div>
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3">
                <code className="text-xs font-mono text-gray-800 font-bold break-all block">
                  {publicKeyVal}
                </code>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">
                Used to identify this application when communicating with DDS.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => copyToClipboard(publicKeyVal, 'pub-key', 'Public API Key copied!')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl transition-all cursor-pointer"
              >
                {copiedId === 'pub-key' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} Copy
              </button>
              <button
                onClick={() => handleRegenerateKey('Public Key')}
                className="flex items-center gap-1 py-2.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl transition-all cursor-pointer"
              >
                <RotateCcw size={13} /> Regenerate
              </button>
            </div>
          </div>

          {/* Card 3: Secret API Key */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  Secret API Key
                </span>
                <span className="text-[9px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                  Backend Key
                </span>
              </div>
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-2">
                <code className={`text-xs font-mono font-bold text-gray-900 truncate ${showSecretKey ? '' : 'blur-[3px] select-none'}`}>
                  {showSecretKey ? secretKeyVal : 'dds_sk_live_************************'}
                </code>
                <button
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="text-gray-400 hover:text-gray-700 transition-colors shrink-0 cursor-pointer"
                  title={showSecretKey ? 'Hide secret' : 'Reveal secret'}
                >
                  {showSecretKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Warning Alert */}
              <div className="mt-2.5 flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200/60 p-2 rounded-lg text-[10px] font-semibold">
                <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                <span>Never expose this key in frontend applications.</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl transition-all cursor-pointer"
              >
                {showSecretKey ? <EyeOff size={13} /> : <Eye size={13} />} {showSecretKey ? 'Hide' : 'Reveal'}
              </button>
              <button
                onClick={() => copyToClipboard(secretKeyVal, 'sec-key', 'Secret API Key copied!')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl transition-all cursor-pointer"
              >
                {copiedId === 'sec-key' ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} Copy
              </button>
              <button
                onClick={() => handleRegenerateKey('Secret API Key')}
                className="flex items-center gap-1 py-2.5 px-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl transition-all cursor-pointer"
              >
                <RotateCcw size={13} /> Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 🚀 3. INTEGRATION CENTER (COMPACT LAUNCHER DASHBOARD) ─────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Launcher Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Rocket size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                🚀 Integration Center
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Asset launcher and integration tools configured for <strong className="text-gray-900">{displayAppName}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/docs?appId=${displayAppId}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <BookOpen size={15} /> Open Full Documentation
          </button>
        </div>

        {/* Quick Action Launcher Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            onClick={() => copyToClipboard(displayAppId, 'launcher-app-id', 'Application ID copied!')}
            className="flex flex-col items-start p-4 bg-gray-50/80 hover:bg-blue-50/60 border border-gray-200/70 hover:border-blue-200 rounded-2xl transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 group-hover:text-blue-600 mb-2 shadow-2xs">
              {copiedId === 'launcher-app-id' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </div>
            <span className="text-xs font-black text-gray-900 group-hover:text-blue-600">Copy App ID</span>
            <span className="text-[10px] text-gray-400 font-mono mt-0.5 truncate w-full">{displayAppId}</span>
          </button>

          <button
            onClick={() => copyToClipboard(publicKeyVal, 'launcher-pub-key', 'Public Key copied!')}
            className="flex flex-col items-start p-4 bg-gray-50/80 hover:bg-blue-50/60 border border-gray-200/70 hover:border-blue-200 rounded-2xl transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 group-hover:text-blue-600 mb-2 shadow-2xs">
              {copiedId === 'launcher-pub-key' ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </div>
            <span className="text-xs font-black text-gray-900 group-hover:text-blue-600">Copy Public Key</span>
            <span className="text-[10px] text-gray-400 font-mono mt-0.5 truncate w-full">{publicKeyVal.slice(0, 16)}...</span>
          </button>

          <button
            onClick={() => copyToClipboard(secretKeyVal, 'launcher-sec-key', 'Secret Key copied!')}
            className="flex flex-col items-start p-4 bg-amber-50/40 hover:bg-amber-50/80 border border-amber-200/70 hover:border-amber-300 rounded-2xl transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-700 group-hover:text-amber-800 mb-2 shadow-2xs">
              {copiedId === 'launcher-sec-key' ? <Check size={16} className="text-green-600" /> : <Key size={16} />}
            </div>
            <span className="text-xs font-black text-amber-900">Copy Secret Key</span>
            <span className="text-[10px] text-amber-700 font-mono mt-0.5 truncate w-full">Backend key (Private)</span>
          </button>

          <a
            href="https://www.npmjs.com/package/@dds/auth-sdk"
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-start p-4 bg-gray-50/80 hover:bg-blue-50/60 border border-gray-200/70 hover:border-blue-200 rounded-2xl transition-all text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 group-hover:text-blue-600 mb-2 shadow-2xs">
              <Download size={16} />
            </div>
            <span className="text-xs font-black text-gray-900 group-hover:text-blue-600">Download SDK</span>
            <span className="text-[10px] text-gray-400 font-mono mt-0.5">npm i @dds/auth-sdk</span>
          </a>
        </div>

        {/* Integration Guides Launcher Cards Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <BookOpen size={14} className="text-blue-600" /> Integration Guides (Pre-configured for {displayAppName})
            </h3>
            <button
              onClick={() => navigate(`/docs?appId=${displayAppId}`)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              View All Guides <ArrowRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { path: 'environment', title: '1. Environment (.env)', desc: 'Pre-filled .env variables', icon: FileCode },
              { path: 'dds-service', title: '2. DDS Service', desc: 'Singleton client setup', icon: Code2 },
              { path: 'express', title: '3. Express.js', desc: 'Backend route handler', icon: Server },
              { path: 'node', title: '4. Node.js Script', desc: 'CLI / Worker script', icon: Terminal },
              { path: 'nextjs', title: '5. Next.js App Router', desc: 'Route handler integration', icon: Layers },
              { path: 'react', title: '6. React Component', desc: 'Frontend login form', icon: Code2 },
              { path: 'rest-api', title: '7. REST API', desc: 'cURL & HTTP endpoints', icon: Zap },
              { path: 'auth-flow', title: '8. Auth Flow', desc: 'Push notification flow', icon: Cpu }
            ].map((guide) => {
              const Icon = guide.icon;
              return (
                <button
                  key={guide.path}
                  onClick={() => navigate(`/docs/integration/${guide.path}?appId=${displayAppId}`)}
                  className="flex items-start gap-3 p-3.5 bg-white border border-gray-200/80 hover:border-blue-300 hover:shadow-xs rounded-xl transition-all text-left group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-gray-900 group-hover:text-blue-600 truncate">{guide.title}</h4>
                    <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{guide.desc}</p>
                  </div>
                  <ExternalLink size={12} className="text-gray-300 group-hover:text-blue-600 shrink-0 mt-1" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppDetail;
