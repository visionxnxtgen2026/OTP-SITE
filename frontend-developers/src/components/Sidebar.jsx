import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard, Layers, BarChart2, CreditCard,
  BookOpen, Settings, LogOut, Zap, ChevronRight, HelpCircle, MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth } from '../services/firebase';
import { useDevStore } from '../store/devStore';

const NAV_MAIN = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/apps',       icon: Layers,          label: 'Applications' },
  { to: '/analytics',  icon: BarChart2,        label: 'Analytics' },
  { to: '/billing',    icon: CreditCard,       label: 'Billing' },
  { to: '/docs',       icon: BookOpen,         label: 'Documentation' },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { developer, logout } = useDevStore();

  const handleLogout = async () => {
    try {
      if (auth) await signOut(auth);
      logout();
      navigate('/login');
    } catch (e) {
      toast.error('Logout failed.');
    }
  };

  const initials = developer?.displayName
    ? developer.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (developer?.email || 'DE').slice(0, 2).toUpperCase();

  const isSettingsActive = location.pathname.startsWith('/settings');

  return (
    <aside className="w-[220px] shrink-0 h-screen bg-white border-r border-slate-100 flex flex-col sticky top-0 overflow-hidden select-none">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="h-[52px] px-5 flex items-center gap-2.5 border-b border-slate-100 shrink-0">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
          <Zap size={13} className="text-white fill-white" />
        </div>
        <div className="leading-none">
          <span className="text-[13px] font-black text-slate-900 tracking-tight">DDS</span>
          <span className="text-[9px] font-bold text-slate-400 ml-1.5 tracking-widest uppercase">Portal</span>
        </div>
      </div>

      {/* ── Main Nav ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {NAV_MAIN.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/apps' ? false : undefined}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
                <span className="flex-1">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* ── Settings ── (manual to catch all /settings/* sub-routes) */}
        <button
          onClick={() => navigate('/settings')}
          className={`w-full group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
            isSettingsActive
              ? 'bg-blue-650 text-white shadow-sm font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Settings size={15} className={isSettingsActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
          <span className="flex-1 text-left">Settings</span>
        </button>

        {/* ── Divider ── */}
        <div className="my-2 border-t border-slate-100" />

        {/* ── Help & Support ── */}
        <NavLink to="/support"
          className={({ isActive }) =>
            `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
              isActive
                ? 'bg-blue-650 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <HelpCircle size={15} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
              <span className="flex-1">Help & Support</span>
            </>
          )}
        </NavLink>

        {/* ── Feedback ── */}
        <NavLink to="/feedback"
          className={({ isActive }) =>
            `group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
              isActive
                ? 'bg-blue-650 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <MessageSquare size={15} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
              <span className="flex-1">Feedback</span>
            </>
          )}
        </NavLink>
      </nav>

      {/* ── Developer Info + Logout ───────────────────────────────────────── */}
      <div className="border-t border-slate-100 p-3 shrink-0 space-y-1">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default">
          {developer?.photoURL ? (
            <img src={developer.photoURL} alt="Avatar" className="w-7 h-7 rounded-full object-cover shrink-0 ring-2 ring-slate-100" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-[10px] shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-slate-900 truncate leading-none">{developer?.displayName || 'Developer'}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{developer?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
