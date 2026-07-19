import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Code2, 
  AppWindow, 
  CreditCard, 
  Sliders, 
  ShieldAlert, 
  Settings, 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAdminStore } from '../store/adminStore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/developers', label: 'Developers', icon: Code2 },
  { path: '/applications', label: 'Applications', icon: AppWindow },
  { path: '/billing', label: 'Billing', icon: CreditCard },
  { path: '/pricing', label: 'Pricing', icon: Sliders },
  { path: '/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
  { path: '/settings', label: 'Settings', icon: Settings }
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const { admin, logout } = useAdminStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-850 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div className="p-6 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase">DDS Admin</h1>
            <p className="text-[10px] font-mono text-slate-400">Platform Control v1.0</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Admin Profile Footer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/60">
        <div className="flex items-center justify-between">
          <div className="truncate max-w-[140px]">
            <p className="text-xs font-bold text-slate-200 truncate">{admin?.email || 'admin@dds.internal'}</p>
            <span className="text-[9px] font-mono font-black uppercase text-blue-400 bg-blue-950/60 border border-blue-800/40 px-1.5 py-0.2 rounded">
              ADMIN ROLE
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
