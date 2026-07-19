import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  User, Phone, Globe, Building, Loader2, Check, Shield,
  Key, Bell, Users, Lock, LifeBuoy, Info, FileText, Scale,
  Cpu, Mail, MessageSquare, Activity, ArrowRight,
  BookOpen, AlertTriangle, ChevronRight, ExternalLink, Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useDevStore } from '../store/devStore';

// ─── Field Component ──────────────────────────────────────────────────────────
const Field = ({ label, hint, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-slate-400 font-medium">{hint}</p>}
  </div>
);

const Input = ({ register, name, placeholder, type = 'text', readOnly = false }) => (
  <input
    {...(register ? register(name) : {})}
    type={type}
    placeholder={placeholder}
    readOnly={readOnly}
    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium focus:outline-none transition-all ${
      readOnly
        ? 'border-slate-100 bg-slate-50 text-slate-500 cursor-default'
        : 'border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
    }`}
  />
);

const SectionCard = ({ title, desc, children }) => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
    {(title || desc) && (
      <div className="px-6 py-4 border-b border-slate-100">
        {title && <h3 className="text-sm font-black text-slate-900">{title}</h3>}
        {desc && <p className="text-xs text-slate-500 font-medium mt-0.5">{desc}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const InfoRow = ({ label, value, mono = false }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
    <span className="text-xs font-semibold text-slate-500">{label}</span>
    <span className={`text-xs font-medium text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
  </div>
);

// ─── SUB-PAGE: General ────────────────────────────────────────────────────────
const PageGeneral = ({ developer, updateDeveloper }) => {
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      displayName: developer?.displayName || '',
      company: developer?.company || '',
      website: developer?.website || '',
      timezone: developer?.timezone || 'Asia/Kolkata'
    }
  });

  const onSave = async (data) => {
    setIsSaving(true);
    try {
      await api.patch('/api/dev/auth/me', data);
      updateDeveloper(data);
      toast.success('Profile updated.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = developer?.displayName
    ? developer.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (developer?.email || 'DE').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <SectionCard title="Profile" desc="Your public developer identity on DDS.">
        <form onSubmit={handleSubmit(onSave)} className="space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm">
              {initials}
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">{developer?.displayName || 'Your Name'}</p>
              <p className="text-xs text-slate-500 font-medium">{developer?.email}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Display Name">
              <Input register={register} name="displayName" placeholder="Jane Smith" />
            </Field>
            <Field label="Company">
              <Input register={register} name="company" placeholder="Acme Corp" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Website">
              <Input register={register} name="website" placeholder="https://yourcompany.com" />
            </Field>
            <Field label="Timezone" hint="Midnight reset of daily free limit applies in this zone.">
              <select {...register('timezone')}
                className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10">
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Account Information" desc="Read-only account metadata.">
        <InfoRow label="Developer ID" value={developer?.developerId} mono />
        <InfoRow label="Email" value={developer?.email} />
        <InfoRow label="Phone" value={developer?.phoneNumber} />
        <div className="flex items-center justify-between py-4 mt-2">
          <div>
            <p className="text-xs font-bold text-red-600">Delete Account</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Permanently delete your developer profile and all application credentials.</p>
          </div>
          <Link to="/settings/delete"
            className="shrink-0 px-4 py-2 bg-red-650 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all">
            Delete Account
          </Link>
        </div>
      </SectionCard>
    </div>
  );
};

// ─── SUB-PAGE: API Keys ───────────────────────────────────────────────────────
const PageApiKeys = () => (
  <div className="space-y-6">
    <SectionCard title="API Keys" desc="Manage your application credentials and access tokens.">
      <div className="text-center py-10 space-y-2">
        <Key size={28} className="text-slate-350 mx-auto animate-pulse" />
        <p className="text-sm font-bold text-slate-500">Manage your API keys inside individual Application dashboards.</p>
        <Link to="/apps" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 mt-2">
          Go to Applications <ArrowRight size={12} />
        </Link>
      </div>
    </SectionCard>
  </div>
);

// ─── SUB-PAGE: Notifications ──────────────────────────────────────────────────
const PageNotifications = () => (
  <div className="space-y-6">
    <SectionCard title="Notification Preferences" desc="Control how DDS communicates with you.">
      {[
        { label: 'Authentication Alerts', sub: 'Get notified of unusual auth activity', enabled: true },
        { label: 'Billing Updates', sub: 'Invoices, upgrades, and payment confirmations', enabled: true },
        { label: 'Product Announcements', sub: 'New features and SDK releases', enabled: false },
        { label: 'Usage Limit Warnings', sub: 'Alert when approaching your daily free limit', enabled: true },
      ].map(({ label, sub, enabled }) => (
        <div key={label} className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0 gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{sub}</p>
          </div>
          <div className={`w-10 h-5.5 rounded-full relative cursor-pointer transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`} style={{ height: 22, width: 40 }}>
            <div className={`w-4 h-4 bg-white rounded-full absolute top-[3px] transition-transform shadow-sm ${enabled ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
          </div>
        </div>
      ))}
    </SectionCard>
  </div>
);

// ─── SUB-PAGE: Team ───────────────────────────────────────────────────────────
const PageTeam = () => (
  <div className="space-y-6">
    <SectionCard title="Team Members" desc="Invite colleagues to collaborate on your DDS applications.">
      <div className="text-center py-10 space-y-2">
        <Users size={28} className="text-slate-350 mx-auto" />
        <p className="text-sm font-bold text-slate-500">Team collaboration is coming soon.</p>
        <p className="text-xs text-slate-400 font-medium">You'll be able to invite team members and set role-based permissions.</p>
      </div>
    </SectionCard>
  </div>
);

// ─── SUB-PAGE: Access & Security ──────────────────────────────────────────────
const PageSecurity = () => (
  <div className="space-y-6">
    <SectionCard title="Access & Security" desc="Protect your account with advanced security settings.">
      {[
        { icon: Shield, label: 'Two-Factor Authentication', sub: 'Add an extra layer of security to your account.', status: 'Not enabled', action: 'Enable 2FA', warn: true },
        { icon: Globe, label: 'Allowed Domains', sub: 'Restrict API calls to specific domains.', status: 'Managed per application', action: 'View Applications' },
        { icon: Key, label: 'Active Sessions', sub: 'View and revoke active login sessions.', status: '1 active session', action: 'Manage' },
        { icon: AlertTriangle, label: 'Credential Rotation', sub: 'Rotate API keys every 90 days for best security.', status: 'Recommended', action: 'Learn More' },
      ].map(({ icon: Icon, label, sub, status, action, warn }) => (
        <div key={label} className="flex items-center justify-between gap-4 py-4 border-b border-slate-50 last:border-0 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${warn ? 'bg-amber-50' : 'bg-blue-50'}`}>
              <Icon size={16} className={warn ? 'text-amber-600' : 'text-blue-600'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <p className="text-xs text-slate-500 font-medium">{sub}</p>
              <span className={`inline-block text-[10px] font-bold mt-1 px-2 py-0.5 rounded-md ${warn ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>{status}</span>
            </div>
          </div>
          <button className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 hover:border-blue-400 rounded-lg transition-all cursor-pointer">{action}</button>
        </div>
      ))}
    </SectionCard>
  </div>
);

// ─── SUB-PAGE: Support ────────────────────────────────────────────────────────
const PageSupport = () => {
  const supportCards = [
    { icon: '📖', title: 'Documentation', desc: 'Integration guides, SDK reference, and API docs.', link: '/docs', label: 'Open Docs', internal: true },
    { icon: '🛠️', title: 'Developer Support', desc: 'Get help with integration issues and SDK questions.', link: 'mailto:support@dds.com', label: 'Email Support' },
    { icon: '🐛', title: 'Report an Issue', desc: 'Found a bug? Let us know and we\'ll fix it.', link: 'mailto:bugs@dds.com', label: 'File Report' },
    { icon: '💬', title: 'Contact Support', desc: 'Reach our engineering team directly.', link: 'mailto:support@dds.com', label: 'Contact Us' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-650 rounded-2xl p-6 text-white shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <LifeBuoy size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-base">Help & Support</h3>
            <p className="text-xs text-blue-100 font-medium">Our engineering team is here to help you integrate DDS successfully.</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <a href="mailto:support@dds.com" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors">
            <Mail size={11} /> Email Support
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {supportCards.map(({ icon, title, desc, link, label, internal }) => (
          <div key={title} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <h4 className="font-black text-sm text-slate-900">{title}</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-[1.6] flex-1">{desc}</p>
            {internal ? (
              <Link to={link} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                {label} <ArrowRight size={11} />
              </Link>
            ) : (
              <a href={link} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                {label} <ArrowRight size={11} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SUB-PAGE: About ──────────────────────────────────────────────────────────
const PageAbout = () => (
  <div className="space-y-6">
    <SectionCard title="About DDS" desc="Dynamic Decision System — Push-Based Authentication Platform">
      <div className="space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md">
            <Zap size={24} className="text-white fill-white" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900">DDS Authentication</h3>
            <p className="text-xs text-slate-500 font-medium">Enterprise Push-Based Authentication Platform</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'SDK Version', value: '@dds/server v2.0.0' },
            { label: 'API Version', value: 'v2.0' },
            { label: 'Released', value: 'July 2026' },
            { label: 'Platform', value: 'Node.js 16+' },
            { label: 'License', value: 'MIT' },
            { label: 'Support', value: '24/7 Engineering' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-650 font-medium leading-[1.7]">
          DDS replaces traditional SMS OTPs with instant push-based authentication via the DDS Mobile App. Developers integrate in under 2 minutes using the <code className="font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">@dds/server</code> SDK.
        </p>
      </div>
    </SectionCard>
  </div>
);

// ─── SUB-PAGE: Licenses ───────────────────────────────────────────────────────
const PageLicenses = () => (
  <div className="space-y-6">
    <SectionCard title="Open Source Licenses" desc="Third-party libraries used in the DDS platform.">
      {[
        { name: 'React', version: '18.3.1', license: 'MIT', use: 'Developer Portal UI' },
        { name: 'axios', version: '1.6.0', license: 'MIT', use: '@dds/server HTTP client' },
        { name: 'express', version: '4.18.0', license: 'MIT', use: 'DDS Server framework' },
        { name: 'bcryptjs', version: '2.4.3', license: 'MIT', use: 'Secret key hashing' },
        { name: 'mongoose', version: '8.0.0', license: 'MIT', use: 'Database ORM' },
        { name: 'stripe', version: '14.0.0', license: 'MIT', use: 'Payment processing' },
        { name: 'jsonwebtoken', version: '9.0.0', license: 'MIT', use: 'Session tokens' },
        { name: 'dotenv', version: '16.0.0', license: 'BSD-2', use: 'Environment variables' },
        { name: 'lucide-react', version: '0.363.0', license: 'ISC', use: 'Icon library' },
      ].map(({ name, version, license, use }) => (
        <div key={name} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">{name}</span>
              <span className="text-[10px] font-mono text-slate-400">v{version}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{use}</p>
          </div>
          <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">{license}</span>
        </div>
      ))}
    </SectionCard>
  </div>
);

// ─── PAGES CONFIG ─────────────────────────────────────────────────────────────
const PAGE_COMPONENTS = {
  general: PageGeneral,
  'api-keys': PageApiKeys,
  notifications: PageNotifications,
  team: PageTeam,
  security: PageSecurity,
  support: PageSupport,
  about: PageAbout,
  licenses: PageLicenses,
};

const PAGE_LABELS = {
  general: 'General',
  'api-keys': 'API Keys',
  notifications: 'Notifications',
  team: 'Team Members',
  security: 'Access & Security',
  support: 'Help & Support',
  about: 'About DDS',
  licenses: 'Licenses',
};

const PAGE_DESCS = {
  general: 'Manage your public profile and account details.',
  'api-keys': 'Manage credentials and security signatures.',
  notifications: 'Control your alerts and notifications preference.',
  team: 'Invite collaborators to your DDS applications.',
  security: 'Protect your account with 2FA, session audits, and passwords.',
  support: 'View docs and contact developer engineering.',
  about: 'Corporate statistics and release timeline.',
  licenses: 'Open source dependency components and licenses.',
};

// ─── MAIN SETTINGS COMPONENT ──────────────────────────────────────────────────
export const Settings = () => {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { developer, updateDeveloper } = useDevStore();

  const activeTab = tab || 'home';

  const menuCards = [
    { id: 'general', label: 'General', desc: 'Manage profile information.', icon: User },
    { id: 'api-keys', label: 'API Keys', desc: 'Manage Developer API credentials.', icon: Key },
    { id: 'notifications', label: 'Notifications', desc: 'Email and platform notifications.', icon: Bell },
    { id: 'team', label: 'Team Members', desc: 'Invite and manage team access.', icon: Users },
    {
      id: 'security',
      label: 'Access & Security',
      desc: 'Password, Two-Factor Authentication, Active Sessions, Connected Devices.',
      icon: Lock
    },
    {
      id: 'support',
      label: 'Help & Support',
      desc: 'Documentation, Developer Support, Report an Issue.',
      icon: LifeBuoy
    },
    {
      id: 'about',
      label: 'About DDS',
      desc: 'Platform Information, Version, Release Notes.',
      icon: Info
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      desc: 'GDPR/CCPA disclosures, subprocessors, and retention statements.',
      icon: FileText,
      url: '/legal/privacy-policy.html'
    },
    {
      id: 'terms',
      label: 'Terms & Conditions',
      desc: 'Postpaid PAYG rates, grace period limits, and suspension policy.',
      icon: Scale,
      url: '/legal/terms-and-conditions.html'
    },
    { id: 'licenses', label: 'Licenses', desc: 'Open source library licenses and packages.', icon: Cpu }
  ];

  const handleCardClick = (card) => {
    if (card.url) {
      window.open(card.url, '_blank');
    } else {
      navigate(`/settings/${card.id}`);
    }
  };

  const PageComponent = PAGE_COMPONENTS[activeTab];
  const pageLabel = PAGE_LABELS[activeTab];
  const pageDesc = PAGE_DESCS[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 select-none">
      
      {/* Navbar / Top Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
            <Zap size={15} className="text-blue-650" />
            <span>DDS Developer Portal</span>
          </Link>
        </div>
        
        {activeTab === 'home' ? (
          <Link to="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg text-xs font-bold transition-all">
            ← Back to Dashboard
          </Link>
        ) : (
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            ← Back to Settings
          </button>
        )}
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
          <ChevronRight size={11} />
          {activeTab === 'home' ? (
            <span className="text-slate-900">Settings</span>
          ) : (
            <>
              <Link to="/settings" className="hover:text-blue-600 transition-colors">Settings</Link>
              <ChevronRight size={11} />
              <span className="text-slate-900">{pageLabel}</span>
            </>
          )}
        </nav>

        {activeTab === 'home' ? (
          /* Settings Menu Grid */
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Settings</h1>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
                Manage your developer account, security, billing preferences, notifications, and platform resources.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(card)}
                    className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex items-start gap-4 group"
                  >
                    <div className="w-10 h-10 bg-slate-50 group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-650 rounded-xl flex items-center justify-center shrink-0 transition-colors">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-black text-sm text-slate-900">{card.label}</h3>
                        {card.url && <ExternalLink size={10} className="text-slate-300" />}
                      </div>
                      <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Sub-page view */
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-200">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{pageLabel}</h1>
              <p className="text-xs text-slate-500 mt-1">{pageDesc}</p>
            </div>

            <PageComponent developer={developer} updateDeveloper={updateDeveloper} />
          </div>
        )}

      </div>
    </div>
  );
};

export default Settings;
