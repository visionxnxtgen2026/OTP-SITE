import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, Copy, Check, ChevronRight, ShieldCheck, Zap, Lock,
  Code2, Terminal, Server, AlertTriangle, HelpCircle, History,
  LifeBuoy, CheckCircle2, Cpu, Menu, X, Rocket, ArrowRight,
  ArrowLeft, Sun, Moon, Link2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

// ─── Error Boundary ───────────────────────────────────────────────────────────
export class DocsErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  componentDidCatch(e, info) { 
    console.error('[Docs Render Error Boundary Catch]:', e, info); 
  }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen bg-white dark:bg-[#0b0f19] flex items-center justify-center p-6 text-left font-sans">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle size={24} className="shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-[#111827] dark:text-white">Documentation failed to load.</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">Something went wrong while rendering this page.</p>
            </div>
          </div>
          <div className="bg-[#F8FAFC] dark:bg-slate-950 p-4.5 rounded-xl border border-[#E5E7EB] dark:border-slate-800">
            <p className="text-[9px] font-mono font-bold text-[#6B7280] uppercase tracking-widest">Error Details</p>
            <p className="text-[11.5px] font-mono text-red-600 dark:text-red-405 mt-1.5 whitespace-pre-wrap leading-relaxed max-h-[120px] overflow-y-auto">
              {this.state.error?.toString()}
            </p>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors text-center shadow-sm"
            >
              Retry
            </button>
            <a
              href="/docs"
              onClick={(e) => { e.preventDefault(); this.setState({ hasError: false }); window.location.href = '/docs'; }}
              className="flex-1 py-2.5 border border-[#E5E7EB] dark:border-slate-800 text-[#6B7280] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs rounded-xl text-center transition-colors"
            >
              Back to Documentation Home
            </a>
          </div>
        </div>
      </div>
    );
    return this.props.children;
  }
}

// ─── CodeBlock ────────────────────────────────────────────────────────────────
const CodeBlock = ({ lang = 'js', code, title, compact = false }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="bg-[#0b0f19] rounded-xl overflow-hidden border border-slate-850 dark:border-slate-800/80 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] my-4 font-mono select-text">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-850 select-none">
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-[10px] text-slate-400 font-bold tracking-wider font-sans">{title}</span>
          )}
          <span className="text-[9px] text-slate-500 bg-slate-850 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">{lang}</span>
        </div>
        <button onClick={copy} className="flex items-center gap-1.5 text-[10px] text-slate-450 hover:text-slate-200 transition-colors bg-slate-850 hover:bg-slate-800 px-2 py-1 rounded cursor-pointer border border-slate-800">
          {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
          <span className="font-sans font-semibold">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className={`text-[12.5px] text-slate-200 overflow-x-auto leading-[1.65] font-mono ${compact ? 'p-3.5' : 'p-5'}`}>{code}</pre>
    </div>
  );
};

// ─── Callout ──────────────────────────────────────────────────────────────────
const Callout = ({ type = 'info', children }) => {
  const cfg = {
    info:    { bg: 'bg-[#F8FAFC] dark:bg-blue-950/10 border-blue-200/60 dark:border-blue-900/40',   icon: <Zap size={14} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,       text: 'text-[#111827] dark:text-blue-200' },
    success: { bg: 'bg-[#F8FAFC] dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/40', icon: <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />, text: 'text-[#111827] dark:text-emerald-200' },
    warning: { bg: 'bg-[#F8FAFC] dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/40', icon: <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />, text: 'text-[#111827] dark:text-amber-200' },
    danger:  { bg: 'bg-[#F8FAFC] dark:bg-red-950/10 border-red-200/60 dark:border-red-900/40',     icon: <AlertTriangle size={14} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />,  text: 'text-[#111827] dark:text-red-200' },
  };
  const s = cfg[type] || cfg.info;
  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border ${s.bg} my-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]`}>
      {s.icon}
      <div className={`text-xs font-medium leading-[1.6] ${s.text}`}>{children}</div>
    </div>
  );
};

// ─── LanguageTabs ─────────────────────────────────────────────────────────────
const LanguageTabs = ({ tabs }) => {
  const [active, setActive] = useState(0);
  return (
    <div className="my-4">
      <div className="flex gap-1 border-b border-[#E5E7EB] dark:border-slate-800">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`px-3 py-2 text-xs font-medium transition-all border-b-2 -mb-px cursor-pointer ${active === i ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-semibold' : 'text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-650'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-b-xl overflow-hidden">
        <CodeBlock lang={tabs[active].lang} code={tabs[active].code} title={tabs[active].title} />
      </div>
    </div>
  );
};

// ─── EndpointCard ─────────────────────────────────────────────────────────────
const EndpointCard = ({ method, path, desc, headers, body, response, errors }) => {
  const [tab, setTab] = useState('body');
  const methodColors = {
    POST: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450 border border-blue-200/50 dark:border-blue-900/50',
    GET: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-455 border border-emerald-200/50 dark:border-emerald-900/50',
    DELETE: 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-455 border border-red-200/50 dark:border-red-900/50',
    PUT: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-455 border border-amber-200/50 dark:border-amber-900/50'
  };
  const tabs = [body && 'body', headers && 'headers', response && 'response', errors && 'errors'].filter(Boolean);
  const contents = { headers, body, response, errors };
  return (
    <div className="border border-[#E5E7EB] dark:border-slate-805 rounded-2xl overflow-hidden shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] my-5 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-[#F8FAFC] dark:bg-slate-900/60 border-b border-[#E5E7EB] dark:border-slate-805">
        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${methodColors[method] || 'bg-slate-500 text-white'}`}>{method}</span>
        <code className="text-[11.5px] font-mono font-bold text-[#111827] dark:text-slate-200">{path}</code>
        {desc && <span className="text-xs text-[#6B7280] dark:text-slate-400 font-medium ml-auto hidden sm:block">{desc}</span>}
      </div>
      {desc && <p className="text-xs text-[#6B7280] px-5 pt-3 sm:hidden">{desc}</p>}
      {tabs.length > 0 && (
        <div>
          <div className="flex gap-2 border-b border-[#E5E7EB]/50 dark:border-slate-800/60 px-5">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-b-2 -mb-px transition-all ${tab === t ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-semibold' : 'text-[#6B7280] dark:text-slate-500 border-transparent hover:text-[#111827] dark:hover:text-slate-350'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="px-5 py-2.5">
            {contents[tab] && <CodeBlock lang={tab === 'headers' ? 'http' : 'json'} code={contents[tab]} compact />}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── SecureCredentialCard ─────────────────────────────────────────────────────
const SecureCredentialCard = ({ label, value }) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMaskedValue = () => {
    if (!value) return '—';
    if (revealed) return value;
    if (value.length <= 15) return '••••••••••••••••';
    return `${value.slice(0, 8)}••••••••••••••••${value.slice(-6)}`;
  };

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] group hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-[#6B7280] dark:text-slate-500 uppercase tracking-widest">{label}</span>
          <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 px-1.5 py-0.5 rounded">Active</span>
        </div>
        <p className="font-mono text-[11.5px] text-[#111827] dark:text-slate-300 mt-1.5 truncate max-w-lg leading-relaxed select-all">
          {getMaskedValue()}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 select-none">
        <button
          onClick={() => setRevealed(!revealed)}
          className="p-1.5 text-slate-400 hover:text-[#111827] dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-805 rounded-lg transition-colors cursor-pointer"
          title={revealed ? 'Hide credential' : 'Reveal credential'}
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          onClick={handleCopy}
          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-450 hover:bg-slate-100 dark:hover:bg-slate-805 rounded-lg transition-colors cursor-pointer"
          title="Copy to clipboard"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
};

const Eye = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
);

const EyeOff = ({ size }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
);

// ─── StepCard ─────────────────────────────────────────────────────────────────
const StepCard = ({ num, title, children }) => (
  <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-805 rounded-xl p-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-start gap-4">
    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#6B7280] dark:text-slate-400 font-bold text-xs flex items-center justify-center shrink-0">
      {num}
    </div>
    <div className="min-w-0 flex-1">
      <h4 className="font-bold text-sm text-[#111827] dark:text-slate-150 mb-1.5 leading-tight">{title}</h4>
      <div className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed font-medium">{children}</div>
    </div>
  </div>
);

// ─── Error Table ──────────────────────────────────────────────────────────────
const ErrorTable = ({ rows }) => (
  <div className="rounded-xl border border-[#E5E7EB] dark:border-slate-805 overflow-hidden my-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
    <table className="w-full text-xs text-left border-collapse">
      <thead className="bg-[#F8FAFC] dark:bg-slate-900 border-b border-[#E5E7EB] dark:border-slate-805 text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
        <tr>
          <th className="px-5 py-3 w-1/4">Code</th>
          <th className="px-5 py-3 w-1/6">Status</th>
          <th className="px-5 py-3">Meaning</th>
          <th className="px-5 py-3">Fix / Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#E5E7EB]/50 dark:divide-slate-800/60 font-semibold text-[#111827] dark:text-slate-350 bg-white dark:bg-slate-900">
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
            <td className="px-5 py-3 font-mono font-bold text-slate-800 dark:text-slate-300">{r.code}</td>
            <td className="px-5 py-3 font-mono text-[#6B7280]">{r.status}</td>
            <td className="px-5 py-3 text-slate-800 dark:text-slate-205">{r.meaning}</td>
            <td className="px-5 py-3 text-[#6B7280] dark:text-slate-400 leading-relaxed font-medium">{r.fix}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const DocsContent = () => {
  const { guideId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const appIdParam = searchParams.get('appId');

  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('quick-start');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appContext, setAppContext] = useState(null);
  const [sdkInstallTab, setSdkInstallTab] = useState(0); // npm | pnpm | yarn | bun
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sidebar collapsible navigation sections state
  const [openSections, setOpenSections] = useState({
    gettingStarted: true,
    integration: true,
    resources: true
  });

  const toggleSection = (sect) => {
    setOpenSections(prev => ({ ...prev, [sect]: !prev[sect] }));
  };

  const mainScrollRef = useRef(null);

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch app credentials if appId param present
  useEffect(() => {
    if (!appIdParam) return;
    api.get(`/api/v1/applications/${appIdParam}`).then(r => {
      const a = r.data?.application;
      if (a) setAppContext({ appId: a.applicationId, publicKey: a.publicKey, secretKey: a.secretKey, appName: a.name, allowedDomains: a.allowedDomains || [], environment: a.environment || 'production' });
    }).catch(() => {});
  }, [appIdParam]);

  useEffect(() => {
    if (guideId) { 
      const timer = setTimeout(() => {
        const el = document.getElementById(guideId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [guideId]);

  const creds = appContext || {
    appId: 'app_6G7mQaX92PkLd8RfTyV4NcZh',
    publicKey: 'dds_pk_h3WvK8QnLp2YxR7FmTc9VzJ4NsAe6UdBwX1GhKrP',
    secretKey: 'dds_sk_Y7vLp9Qn4KmXs2HdRt8FwNc6ZaPe3JuBxG5TyMvL1QrHs9WdUk2Xe',
    allowedDomains: ['yourapp.com'],
    environment: 'production',
    appName: 'Your App'
  };

  const NAV = [
    { id: 'quick-start',   label: 'Quick Start',       icon: Rocket,       desc: 'Integrate authentication in under 2 minutes.', tag: 'Popular' },
    { id: 'installation',  label: 'Installation',       icon: Terminal,     desc: 'Install the SDK and configure environment.' },
    { id: 'sdk-usage',     label: 'SDK Usage',          icon: Code2,        desc: 'Authentication, status checks, and client health.' },
    { id: 'api-reference', label: 'API Reference',      icon: Server,       desc: 'HTTP REST endpoints schema reference.' },
    { id: 'auth-flow',     label: 'Auth Flow',          icon: Cpu,          desc: 'Platform sequence and security guidelines.' },
    { id: 'cli',           label: 'CLI Reference',      icon: Terminal,     desc: 'Configuration initialization wizard.' },
    { id: 'error-codes',   label: 'Error Codes',        icon: AlertTriangle,desc: 'DDS error code definitions and fixes.' },
    { id: 'billing',       label: 'Billing Details',    icon: DollarSign,   desc: 'Postpaid Pay As You Go and Free Limits.' },
    { id: 'security',      label: 'Security Guidelines', icon: Lock,        desc: 'Secret key isolation and HTTPS policies.' },
    { id: 'changelog',     label: 'Changelog',          icon: History,      desc: 'Release timeline and upgrade notes.' },
    { id: 'support',       label: 'Support Desk',       icon: LifeBuoy,     desc: 'Contact engineering and file bug reports.' },
  ];

  const filtered = NAV.filter(s =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scrollTo = (id) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    setIsSearchOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ScrollSpy
  useEffect(() => {
    const container = mainScrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const sp = container.scrollTop + 140;
      for (const s of NAV) {
        const el = document.getElementById(s.id);
        if (el) {
          const top = el.offsetTop - container.offsetTop;
          if (sp >= top && sp < top + el.offsetHeight) { setActiveSection(s.id); break; }
        }
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const ERROR_ROWS = [
    { code: 'MISSING_APP_ID',      status: '400', meaning: 'App ID not provided',         fix: 'Set DDS_APP_ID in .env or pass appId to constructor' },
    { code: 'INVALID_APP_ID',      status: '401', meaning: 'App ID format is wrong',       fix: 'Must start with app_ followed by 16–64 alphanumeric chars' },
    { code: 'INVALID_PUBLIC_KEY',  status: '401', meaning: 'Public key rejected',          fix: 'Must start with dds_pk_ and match your application' },
    { code: 'INVALID_SECRET_KEY',  status: '401', meaning: 'Secret key rejected',          fix: 'Must start with dds_sk_ and match stored hash' },
    { code: 'APPLICATION_DISABLED',status: '403', meaning: 'App is paused',               fix: 'Enable the application in the Developer Portal' },
    { code: 'USER_NOT_FOUND',      status: '404', meaning: 'Phone not registered in DDS',  fix: 'User must install and register DDS Mobile App' },
    { code: 'USER_OFFLINE',        status: '422', meaning: 'Mobile app not connected',     fix: 'Ask user to open DDS Mobile App and stay online' },
    { code: 'USER_REJECTED',       status: '403', meaning: 'User tapped Reject',           fix: 'Show retry option to user' },
    { code: 'REQUEST_EXPIRED',     status: '408', meaning: 'Timed out (default: 2 min)',   fix: 'Increase timeoutMs or ask user to retry' },
    { code: 'FREE_LIMIT_EXCEEDED', status: '402', meaning: 'Daily free limit reached',     fix: 'Upgrade plan or enable Pay As You Go in Billing' },
    { code: 'DUPLICATE_REQUEST',   status: '409', meaning: 'Active request already exists',fix: 'Wait for current request to expire or be resolved' },
  ];

  const copyPageLink = (id) => {
    const url = `${window.location.origin}/docs#${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Page section link copied!');
  };

  const handleBackToPortal = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-[#0b0f19] text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-205">
      
      {/* ── TOP NAVBAR ────────────────────────────────────────────────────────── */}
      <header className="h-[52px] shrink-0 bg-white dark:bg-[#0d1321] border-b border-[#E5E7EB] dark:border-slate-800/80 px-6 flex items-center justify-between z-30 select-none shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-white font-black">
              <Zap size={13} className="fill-white text-white" />
            </div>
            <span className="font-bold text-xs text-[#111827] dark:text-white uppercase tracking-wider">DDS Docs</span>
          </div>

          {/* Breadcrumb - occupy very little space */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#6B7280] font-medium">
            <span 
              onClick={handleBackToPortal}
              className="hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer"
            >
              Developer Portal
            </span>
            <ChevronRight size={10} className="text-[#6B7280]/60" />
            <span 
              onClick={() => scrollTo('quick-start')}
              className="hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer"
            >
              Documentation
            </span>
            <ChevronRight size={10} className="text-[#6B7280]/60" />
            <span className="text-[#111827] dark:text-slate-300 font-semibold truncate max-w-[120px]">
              {NAV.find(s => s.id === activeSection)?.label || 'Quick Start'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Global Search triggers command palette */}
          <div
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 w-56 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 px-2.5 py-1 rounded-md text-[11px] text-slate-400 font-medium cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-850 transition-all shadow-[0_1px_2px_0_rgba(0,0,0,0.01)]"
          >
            <Search size={11} className="text-slate-450" />
            <span className="flex-1 text-left">Search docs...</span>
            <kbd className="bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 px-1 py-0.5 rounded text-[9px] font-mono font-bold">⌘K</kbd>
          </div>

          {appContext && (
            <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50 px-2.5 py-1 rounded-lg">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">{appContext.appName}</span>
              <button
                onClick={() => { setAppContext(null); searchParams.delete('appId'); setSearchParams(searchParams); }}
                className="text-emerald-500 hover:text-emerald-700 cursor-pointer ml-1 text-xs font-bold"
              >
                <X size={10} />
              </button>
            </div>
          )}

          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[#6B7280] hover:text-[#111827] dark:hover:text-slate-300">
            <svg height="15" width="15" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>

          <button onClick={toggleDarkMode} className="text-[#6B7280] hover:text-[#111827] dark:hover:text-slate-350 cursor-pointer">
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer">
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* ── TWO-COLUMN DOCUMENTATION CANVAS ────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* Left Column: Collapsible sticky navigation sidebar */}
        <aside className="hidden lg:flex flex-col w-[230px] shrink-0 bg-[#F8FAFC] dark:bg-[#0d1321] border-r border-[#E5E7EB] dark:border-slate-800/80 h-full overflow-y-auto p-4 select-none scrollbar-none">
          <div className="space-y-5">
            
            {/* Group 1: Getting Started */}
            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection('gettingStarted')}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#6B7280] hover:text-[#111827] dark:hover:text-slate-350 cursor-pointer"
              >
                <span>Getting Started</span>
                <ChevronRight size={9} className={`transform transition-transform ${openSections.gettingStarted ? 'rotate-90' : ''}`} />
              </button>
              {openSections.gettingStarted && (
                <div className="space-y-0.5 mt-1 animate-slideDown">
                  {NAV.slice(0, 2).map(s => {
                    const Icon = s.icon;
                    const isActive = activeSection === s.id;
                    return (
                      <button key={s.id} onClick={() => scrollTo(s.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left border-l-2 ${isActive ? 'bg-white dark:bg-slate-800/40 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-semibold shadow-[0_1px_2px_0_rgba(0,0,0,0.01)]' : 'text-[#6B7280] dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 hover:text-[#111827] dark:hover:text-white border-transparent'}`}>
                        <Icon size={12} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-[#6B7280]/70'} />
                        <span>{s.label}</span>
                        {s.tag && <span className="ml-auto text-[8px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1 rounded">{s.tag}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Group 2: Integration */}
            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection('integration')}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#6B7280] hover:text-[#111827] dark:hover:text-slate-350 cursor-pointer"
              >
                <span>Integration</span>
                <ChevronRight size={9} className={`transform transition-transform ${openSections.integration ? 'rotate-90' : ''}`} />
              </button>
              {openSections.integration && (
                <div className="space-y-0.5 mt-1 animate-slideDown">
                  {NAV.slice(2, 7).map(s => {
                    const Icon = s.icon;
                    const isActive = activeSection === s.id;
                    return (
                      <button key={s.id} onClick={() => scrollTo(s.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left border-l-2 ${isActive ? 'bg-white dark:bg-slate-800/40 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-semibold shadow-[0_1px_2px_0_rgba(0,0,0,0.01)]' : 'text-[#6B7280] dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 hover:text-[#111827] dark:hover:text-white border-transparent'}`}>
                        <Icon size={12} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-[#6B7280]/70'} />
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Group 3: Resources */}
            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection('resources')}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#6B7280] hover:text-[#111827] dark:hover:text-slate-350 cursor-pointer"
              >
                <span>Resources</span>
                <ChevronRight size={9} className={`transform transition-transform ${openSections.resources ? 'rotate-90' : ''}`} />
              </button>
              {openSections.resources && (
                <div className="space-y-0.5 mt-1 animate-slideDown">
                  {NAV.slice(7).map(s => {
                    const Icon = s.icon;
                    const isActive = activeSection === s.id;
                    return (
                      <button key={s.id} onClick={() => scrollTo(s.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left border-l-2 ${isActive ? 'bg-white dark:bg-slate-800/40 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-semibold shadow-[0_1px_2px_0_rgba(0,0,0,0.01)]' : 'text-[#6B7280] dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/20 hover:text-[#111827] dark:hover:text-white border-transparent'}`}>
                        <Icon size={12} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-[#6B7280]/70'} />
                        <span>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-[#E5E7EB] dark:border-slate-800">
            <div className="bg-white dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800 rounded-xl p-3 space-y-1 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
              <p className="text-[10px] font-black text-[#111827] dark:text-slate-350">@dds/server SDK</p>
              <p className="text-[9px] text-[#6B7280] font-medium">Node.js 16+ &bull; MIT License</p>
              <a href="mailto:support@dds.com" className="text-[9px] text-blue-600 dark:text-blue-400 font-bold hover:underline block mt-1">Get assistance →</a>
            </div>
          </div>
        </aside>

        {/* Right Column: Center Documentation Content (Fills the remaining screen) */}
        <main ref={mainScrollRef} className="flex-1 min-w-0 h-full overflow-y-auto scroll-smooth bg-white dark:bg-[#0b0f19] px-6 sm:px-12 py-8 select-text">
          <div className="max-w-[800px] mx-auto space-y-16">
            
            {/* ── 1. QUICK START ────────────────────────────────────────────── */}
            <section id="quick-start" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h1 className="text-2xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <Rocket className="text-blue-600 dark:text-blue-400" size={22} /> Quick Start
                  </h1>
                  <button
                    onClick={() => copyPageLink('quick-start')}
                    className="p-1.5 text-slate-400 hover:text-[#111827] dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer transition-colors"
                    title="Copy Section Link"
                  >
                    <Link2 size={13} />
                  </button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">
                  Integrate phone-based push authentication into your applications in under 2 minutes.
                </p>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-semibold pt-1">
                  <span>Last Updated: July 19, 2026</span>
                  <span>&bull;</span>
                  <span>2 min read</span>
                </div>
              </div>

              {/* Credentials Cards */}
              <div className="space-y-3 bg-[#F8FAFC] dark:bg-slate-900/10 border border-[#E5E7EB] dark:border-slate-805 p-5 rounded-2xl">
                <div>
                  <h3 className="text-xs font-bold text-[#111827] dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" /> Active Application Credentials
                  </h3>
                  <p className="text-[10px] text-[#6B7280] dark:text-slate-500 font-medium mt-0.5">Use these keys inside your local environment variable file.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 pt-1">
                  <SecureCredentialCard label="Application ID" value={creds.appId} />
                  <SecureCredentialCard label="Public API Key" value={creds.publicKey} />
                  <SecureCredentialCard label="Secret API Key" value={creds.secretKey} />
                </div>
              </div>

              {/* Step Cards Grid */}
              <div className="grid grid-cols-1 gap-4 pt-1">
                <StepCard num="1" title="Create a DDS Application">
                  <p>Open the <strong>Applications</strong> tab inside the Developer Portal. Tap <strong>Create Application</strong> to generate a new application ID and API credential credentials.</p>
                </StepCard>
                <StepCard num="2" title="Install the Server SDK">
                  <p>In your terminal project root, run the following command to add the official Node.js SDK:</p>
                  <CodeBlock lang="bash" code="npm install @dds/server" compact />
                </StepCard>
                <StepCard num="3" title="Initialize setup CLI">
                  <p>DDS includes a zero-config setup CLI. Run the init wizard to automatically test connectivity and write environment variables:</p>
                  <CodeBlock lang="bash" code="npx dds init" compact />
                </StepCard>
                <StepCard num="4" title="Paste Credentials Prompt">
                  <p>Paste the credentials displayed above when prompted by the setup wizard. The CLI will safely write them to a local <code>.env</code> file.</p>
                </StepCard>
                <StepCard num="5" title="Verify User Authentication">
                  <p>Require the SDK in your express/Node backend and request verification for any phone number. The SDK reads environment variables automatically:</p>
                  <CodeBlock lang="javascript" title="server.js" code={`const { DDS } = require("@dds/server");
const dds = new DDS(); // Auto-reads DDS_APP_ID, DDS_PUBLIC_KEY, DDS_SECRET_KEY

app.post("/auth/login", async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    const result = await dds.requestAuth({ mobileNumber });
    // Returns: { success: true, requestId: "req_xxxx", verificationCode: "482751" }
    
    // Display the code on the web page. User confirms it in their mobile app.
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.code, message: error.message });
  }
});`} />
                </StepCard>
              </div>

              {/* Previous / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <div />
                <button
                  onClick={() => scrollTo('installation')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: Installation</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 2. INSTALLATION ────────────────────────────────────────────── */}
            <section id="installation" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <Terminal className="text-slate-800 dark:text-slate-205" size={20} /> Installation
                  </h2>
                  <button onClick={() => copyPageLink('installation')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Install the official package and configure variables.</p>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-[#6B7280] dark:text-slate-500 tracking-wider">Select package manager</p>
                <div className="flex gap-2">
                  {['npm', 'pnpm', 'yarn', 'bun'].map((t, idx) => (
                    <button
                      key={t}
                      onClick={() => setSdkInstallTab(idx)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${sdkInstallTab === idx ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-800 dark:border-slate-700' : 'bg-white dark:bg-slate-900 text-[#6B7280] border-[#E5E7EB] dark:border-slate-800 hover:border-slate-300'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  {sdkInstallTab === 0 && <CodeBlock lang="bash" code="npm install @dds/server" />}
                  {sdkInstallTab === 1 && <CodeBlock lang="bash" code="pnpm add @dds/server" />}
                  {sdkInstallTab === 2 && <CodeBlock lang="bash" code="yarn add @dds/server" />}
                  {sdkInstallTab === 3 && <CodeBlock lang="bash" code="bun add @dds/server" />}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-[#6B7280] dark:text-slate-500 tracking-wider">Configure Environment File</p>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Create a <code>.env</code> file in your backend root and paste credentials:</p>
                <CodeBlock lang="env" title=".env" code={`DDS_APP_ID=${creds.appId}
DDS_PUBLIC_KEY=${creds.publicKey}
DDS_SECRET_KEY=${creds.secretKey}
DDS_BASE_URL=http://localhost:5000`} />
                <Callout type="danger">Never commit keys to version control systems like GitHub. Add <code>.env</code> to <code>.gitignore</code>.</Callout>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('quick-start')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: Quick Start</span>
                </button>
                <button
                  onClick={() => scrollTo('sdk-usage')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: SDK Usage</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 3. SDK USAGE ──────────────────────────────────────────────── */}
            <section id="sdk-usage" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <Code2 className="text-slate-800 dark:text-slate-205" size={20} /> SDK Usage
                  </h2>
                  <button onClick={() => copyPageLink('sdk-usage')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Initialize and use SDK methods for seamless authentication.</p>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xs font-bold text-[#111827] dark:text-slate-200 mb-1">Initialization</h3>
                  <LanguageTabs tabs={[
                    { label: 'Zero-config (Recommended)', lang: 'js', code: `const { DDS } = require("@dds/server");\nconst dds = new DDS(); // Automatically loads env variables` },
                    { label: 'Explicit Parameters', lang: 'js', code: `const { DDS } = require("@dds/server");\nconst dds = new DDS({\n  appId:     "${creds.appId}",\n  publicKey: "${creds.publicKey}",\n  secretKey: "${creds.secretKey}"\n});` },
                    { label: 'ESM / TypeScript', lang: 'ts', code: `import { DDS } from "@dds/server";\nconst dds = new DDS();` }
                  ]} />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#111827] dark:text-slate-200 mb-1">Request Auth Session</h3>
                  <CodeBlock lang="javascript" code={`const result = await dds.requestAuth({
  mobileNumber: "+919876543210"
});\n\n// Response payload:\n// { success: true, requestId: "req_52b171f451f", verificationCode: "482751" }`} />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#111827] dark:text-slate-200 mb-1">Poll Authentication Status</h3>
                  <CodeBlock lang="javascript" code={`const status = await dds.getStatus("req_52b171f451f");\n\n// Status responses:\n// Waiting: { success: true, pending: true, status: "PENDING" }\n// Approved: { success: true, pending: false, status: "APPROVED", enteredCode: "482751" }`} />
                </div>
              </div>

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('installation')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: Installation</span>
                </button>
                <button
                  onClick={() => scrollTo('api-reference')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: API Reference</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 4. API REFERENCE ──────────────────────────────────────────── */}
            <section id="api-reference" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <Server className="text-slate-805 dark:text-slate-205" size={20} /> API Reference
                  </h2>
                  <button onClick={() => copyPageLink('api-reference')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Direct HTTP integration specifications.</p>
              </div>

              <EndpointCard
                method="POST"
                path="/api/v1/auth/request"
                desc="Create push auth request to mobile app"
                headers={`Authorization: Bearer ${creds.secretKey}\nx-dds-public-key: ${creds.publicKey}\nContent-Type: application/json`}
                body={`{\n  "phone": "+919876543210",\n  "applicationId": "${creds.appId}"\n}`}
                response={`{\n  "success": true,\n  "requestId": "req_52b171f451f34e3499ea",\n  "verificationCode": "482751",\n  "status": "PENDING",\n  "expiresIn": 120\n}`}
                errors={`// 401 – Invalid Credentials\n{\n  "success": false,\n  "error": "INVALID_SECRET_KEY",\n  "message": "Secret key is invalid."\n}`}
              />

              <EndpointCard
                method="GET"
                path="/api/v1/auth/status/:requestId"
                desc="Retrieve real-time authentication session state"
                headers={`Authorization: Bearer ${creds.secretKey}\nx-dds-public-key: ${creds.publicKey}`}
                response={`{\n  "success": true,\n  "pending": false,\n  "status": "APPROVED",\n  "enteredCode": "482751"\n}`}
              />

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('sdk-usage')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: SDK Usage</span>
                </button>
                <button
                  onClick={() => scrollTo('auth-flow')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: Auth Flow</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 5. AUTH FLOW ──────────────────────────────────────────────── */}
            <section id="auth-flow" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <Cpu className="text-slate-805 dark:text-slate-205" size={20} /> Authentication Flow
                  </h2>
                  <button onClick={() => copyPageLink('auth-flow')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Cryptographic workflow overview.</p>
              </div>

              <div className="bg-[#F8FAFC] dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-805 p-6 rounded-2xl flex flex-col items-center justify-center space-y-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Platform Communication Flow</p>
                <div className="flex items-center flex-wrap justify-center gap-3 text-xs font-bold select-none">
                  <span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] text-slate-700 dark:text-slate-300">Developer</span>
                  <ChevronRight size={12} className="text-[#6B7280]" />
                  <span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] text-slate-700 dark:text-slate-300">DDS SDK</span>
                  <ChevronRight size={12} className="text-[#6B7280]" />
                  <span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] text-slate-700 dark:text-slate-300">DDS API</span>
                  <ChevronRight size={12} className="text-[#6B7280]" />
                  <span className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] text-slate-700 dark:text-slate-300">DDS App</span>
                  <ChevronRight size={12} className="text-[#6B7280]" />
                  <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/50 rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">Approval</span>
                </div>
              </div>

              <CodeBlock lang="text" title="Sequence Steps" code={`1. Developer website prompts for phone login.
2. Backend calls dds.requestAuth({ mobileNumber }).
3. DDS API verifies credentials (App ID, keys) and prepares socket session.
4. DDS triggers secure push notify on the mobile app.
5. User enters verification code shown on browser and taps Approve.
6. Developer backend polls status and receives APPROVED status.`} />

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('api-reference')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: API Reference</span>
                </button>
                <button
                  onClick={() => scrollTo('cli')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: CLI Reference</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 6. CLI ────────────────────────────────────────────────────── */}
            <section id="cli" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <Terminal className="text-slate-800 dark:text-slate-205" size={20} /> CLI Reference
                  </h2>
                  <button onClick={() => copyPageLink('cli')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Initialize parameters automatically using the dds CLI tool.</p>
              </div>

              <CodeBlock lang="bash" code="npx dds init" />
              <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">The interactive wizard will scan the directory, find framework endpoints, configure <code>.env</code> file, and test client latency.</p>

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('auth-flow')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-355 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: Auth Flow</span>
                </button>
                <button
                  onClick={() => scrollTo('error-codes')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-355 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: Error Codes</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 7. ERROR CODES ────────────────────────────────────────────── */}
            <section id="error-codes" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <AlertTriangle className="text-slate-808 dark:text-slate-205" size={20} /> Error Codes
                  </h2>
                  <button onClick={() => copyPageLink('error-codes')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Handle errors thrown during API verification.</p>
              </div>

              <ErrorTable rows={ERROR_ROWS} />

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('cli')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: CLI Reference</span>
                </button>
                <button
                  onClick={() => scrollTo('billing')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: Billing</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 8. BILLING ────────────────────────────────────────────────── */}
            <section id="billing" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <DollarSign className="text-slate-800 dark:text-slate-205" size={20} /> Billing
                  </h2>
                  <button onClick={() => copyPageLink('billing')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Understand daily limits and postpaid PAYG rates.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: 'Free Daily Limit', val: '5 free requests/day', sub: 'Calculated across all apps based on local timezone.' },
                  { title: 'PAYG Pricing', val: '₹0.50 / request', sub: 'Auto-charged only on successful approvals beyond limit.' },
                  { title: 'Rate Limit', val: '10 requests / s', sub: 'Requests exceeding limits return HTTP 429.' },
                  { title: 'Grace Period', val: '7 Calendar Days', sub: 'Allows active API usage when card charges fail.' }
                ].map((item) => (
                  <div key={item.title} className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-805 rounded-xl p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] space-y-1">
                    <span className="text-[9px] font-black text-[#6B7280] dark:text-slate-500 uppercase tracking-widest">{item.title}</span>
                    <p className="text-sm font-bold text-[#111827] dark:text-white">{item.val}</p>
                    <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-normal font-medium">{item.sub}</p>
                  </div>
                ))}
              </div>

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('error-codes')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-300 dark:hover:bg-slate-900 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: Error Codes</span>
                </button>
                <button
                  onClick={() => scrollTo('security')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-300 dark:hover:bg-slate-900 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: Security</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 9. SECURITY ───────────────────────────────────────────────── */}
            <section id="security" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <Lock className="text-slate-800 dark:text-slate-205" size={20} /> Security
                  </h2>
                  <button onClick={() => copyPageLink('security')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Credential isolation rules and server recommendations.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { icon: '🔒', title: 'Never Expose Secret Key', body: 'The dds_sk_ key should never touch client browsers or git repos. Always keep it in server environment variables.' },
                  { icon: '🌐', title: 'Production HTTPS Enforced', body: 'DDS APIs enforce HTTPS. Unencrypted HTTP is permitted only during development on localhost.' },
                  { icon: '🛡️', title: 'Domain Whitelists', body: 'Set Allowed Domains in Application Settings to block API queries from untrusted websites.' }
                ].map((item) => (
                  <div key={item.title} className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-805 rounded-xl p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] flex gap-4">
                    <span className="text-base shrink-0">{item.icon}</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#111827] dark:text-white">{item.title}</h4>
                      <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1.5 leading-relaxed font-medium">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('billing')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-300 dark:hover:bg-slate-900 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: Billing</span>
                </button>
                <button
                  onClick={() => scrollTo('changelog')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-300 dark:hover:bg-slate-900 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: Changelog</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 10. CHANGELOG ─────────────────────────────────────────────── */}
            <section id="changelog" className="space-y-6 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <History className="text-slate-800 dark:text-slate-205" size={20} /> Changelog
                  </h2>
                  <button onClick={() => copyPageLink('changelog')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Release logs and version specifications.</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    version: 'v2.0.0', date: 'July 19, 2026', badge: 'Latest',
                    changes: [
                      'Redesigned settings to standalone layout page.',
                      'Integrated postpaid Pay As You Go with Stripe auto-billing.',
                      'Added 7-day payment grace period and automatic suspension rules.'
                    ]
                  },
                  {
                    version: 'v1.0.0', date: 'July 19, 2026',
                    changes: [
                      'Renamed package to @dds/server.',
                      'Zero-config new DDS() env initialization.',
                      'Created npx dds init wizard CLI.'
                    ]
                  }
                ].map((item) => (
                  <div key={item.version} className="border border-[#E5E7EB] dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-[0_1px_2px_0_rgba(0,0,0,0.01)]">
                    <div className="px-5 py-3 bg-[#F8FAFC] dark:bg-slate-900 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#111827] dark:text-white">{item.version}</span>
                        {item.badge && <span className="text-[8px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{item.badge}</span>}
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400">{item.date}</span>
                    </div>
                    <ul className="p-5 space-y-2">
                      {item.changes.map(c => (
                        <li key={c} className="text-xs text-[#6B7280] dark:text-slate-400 font-medium flex items-start gap-2">
                          <span className="text-emerald-500 shrink-0 mt-0.5">+</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('security')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:bg-slate-900 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: Security</span>
                </button>
                <button
                  onClick={() => scrollTo('support')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 hover:border-slate-350 dark:hover:bg-slate-900 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
                >
                  <span>Next: Support</span>
                  <ArrowRight size={12} className="text-[#6B7280]" />
                </button>
              </div>
            </section>

            {/* ── 11. SUPPORT ───────────────────────────────────────────────── */}
            <section id="support" className="space-y-6 pb-20 scroll-margin-top-12">
              <div className="space-y-2 border-b border-[#E5E7EB]/70 dark:border-slate-800/60 pb-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
                    <LifeBuoy className="text-slate-800 dark:text-slate-205" size={20} /> Support
                  </h2>
                  <button onClick={() => copyPageLink('support')} className="p-1.5 text-slate-400 hover:text-[#111827] rounded-lg cursor-pointer"><Link2 size={13} /></button>
                </div>
                <p className="text-xs text-[#6B7280] dark:text-slate-405 leading-relaxed">Reach out to the DDS developer relations team.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: '✉️', title: 'Email Support', body: 'Contact support@dds.com for account settings and billing help.' },
                  { icon: '🐛', title: 'Report an Issue', body: 'Email bugs@dds.com if you detect a platform bug or security vulnerability.' },
                  { icon: '💬', title: 'Developer Relations', body: 'Ask integration, code, or SDK-specific assistance questions.' }
                ].map((item) => (
                  <a key={item.title} href="mailto:support@dds.com" className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-805 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-800 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] flex flex-col gap-2 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.icon}</span>
                      <h4 className="text-xs font-bold text-[#111827] dark:text-white">{item.title}</h4>
                    </div>
                    <p className="text-xs text-[#6B7280] dark:text-slate-400 font-medium leading-relaxed flex-grow">{item.body}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 mt-2 select-none">
                      Send message <ArrowRight size={11} />
                    </span>
                  </a>
                ))}
              </div>

              {/* Prev / Next buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-[#E5E7EB]/50 dark:border-slate-800">
                <button
                  onClick={() => scrollTo('changelog')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-850 hover:border-slate-300 dark:hover:bg-slate-900 text-[#111827] dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <ArrowLeft size={12} className="text-[#6B7280]" />
                  <span>Previous: Changelog</span>
                </button>
                <div />
              </div>
            </section>

          </div>
        </main>
      </div>

      {/* ── COMMAND PALETTE SEARCH MODAL (Ctrl + K) ───────────────────────────── */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 pt-[12vh] animate-fadeIn">
          <div className="bg-white dark:bg-[#0d1321] border border-[#E5E7EB] dark:border-slate-800 max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
            
            {/* Input header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5E7EB] dark:border-slate-800">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Type a query or section name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 text-sm font-semibold focus:outline-none text-[#111827] dark:text-white"
              />
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            {/* Content view */}
            <div className="max-h-[300px] overflow-y-auto p-2.5">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-slate-400 font-semibold py-8">No documentation sections found matching your search.</p>
              ) : (
                <div className="space-y-1">
                  <p className="px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Documentation sections</p>
                  {filtered.map(s => {
                    const Icon = s.icon;
                    return (
                      <div
                        key={s.id}
                        onClick={() => scrollTo(s.id)}
                        className="flex items-start gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl cursor-pointer transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-550 group-hover:text-blue-600 flex items-center justify-center shrink-0">
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <h4 className="text-xs font-bold text-[#111827] dark:text-white">{s.label}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.desc || 'Documentation section details'}</p>
                        </div>
                        <ArrowRight size={11} className="text-slate-350 self-center group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2.5 bg-[#F8FAFC] dark:bg-slate-900/60 border-t border-[#E5E7EB] dark:border-slate-800/80 flex items-center justify-between text-[9px] text-[#6B7280] font-semibold">
              <span>Use arrow keys to navigate and enter to select</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Docs() {
  return (
    <DocsErrorBoundary>
      <DocsContent />
    </DocsErrorBoundary>
  );
}
