import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Code2, 
  AppWindow, 
  RefreshCw, 
  Coins, 
  FileText, 
  UserX,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/dashboard-stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('[Dashboard Stats Fetch Error]', err);
      toast.error('Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/30' },
    { label: 'Verified Users', value: stats?.verifiedUsers || 0, icon: ShieldCheck, color: 'text-green-400', bg: 'bg-green-950/40 border-green-800/30' },
    { label: 'Total Developers', value: stats?.developers || 0, icon: Code2, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/30' },
    { label: 'Applications', value: stats?.applications || 0, icon: AppWindow, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/30' },
    { label: "Today's Requests", value: stats?.todayRequests || 0, icon: RefreshCw, color: 'text-indigo-400', bg: 'bg-indigo-950/40 border-indigo-800/30' },
    { label: 'Monthly Revenue', value: `₹${stats?.monthlyRevenueRupees || '0.00'}`, icon: Coins, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/30' },
    { label: 'Pending Bills', value: `₹${stats?.pendingBillsRupees || '0.00'}`, icon: FileText, color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-800/30' },
    { label: 'Deleted Accounts', value: stats?.deletedAccounts || 0, icon: UserX, color: 'text-slate-400', bg: 'bg-slate-900 border-slate-800' }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Platform Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time platform overview and health metrics.</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-800 cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => (
          <div key={c.label} className={`p-6 rounded-2xl border ${c.bg} backdrop-blur-xl space-y-4 shadow-xl`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">{c.label}</span>
              <div className={`p-2 rounded-xl bg-slate-950/60 ${c.color}`}>
                <c.icon size={18} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-white tracking-tight">{c.value}</span>
              <span className="text-[10px] font-bold text-green-400 flex items-center gap-0.5">
                <TrendingUp size={10} /> Active
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Infrastructure Operational Status */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">System Status & Environment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-300">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span>Stripe Billing Engine</span>
            <span className="px-2 py-0.5 bg-green-950 text-green-400 border border-green-800/40 rounded text-[10px] font-black uppercase">
              TEST MODE READY
            </span>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span>Dynamic Configurations</span>
            <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800/40 rounded text-[10px] font-black uppercase">
              ACTIVE
            </span>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span>Cryptographic Privacy Guard</span>
            <span className="px-2 py-0.5 bg-purple-950 text-purple-400 border border-purple-800/40 rounded text-[10px] font-black uppercase">
              ENFORCED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
