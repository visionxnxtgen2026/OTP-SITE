import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Activity, TrendingUp, Clock, ShieldCheck, Cpu, RefreshCw, AlertTriangle, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useDevStore } from '../store/devStore';

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:border-blue-100 transition-all">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 font-medium">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  const { developer } = useDevStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, appsRes] = await Promise.all([
        api.get('/api/dev/dashboard'),
        api.get('/api/dev/apps')
      ]);
      setDashboardData(dashRes.data);
      setApps(appsRes.data.applications || []);
    } catch (e) {
      console.error('[Dashboard Load]', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cards = dashboardData?.cards || {};
  const recent = dashboardData?.recentActivity || [];

  return (
    <div className="p-8 space-y-8 max-w-6xl">
      {/* Top Banner */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">DDS Developer Portal</p>
          <h1 className="text-2xl font-black text-gray-900">{developer?.displayName || developer?.company || 'Developer'} Dashboard</h1>
          <p className="text-xs text-gray-400 mt-1 font-mono">{developer?.developerId}</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Stats
        </button>
      </div>

      {/* 9 Mandatory Dashboard Cards (Part 10) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
        {/* 1. Applications */}
        <StatCard
          label="1. Applications"
          value={cards.applications ?? apps.length}
          sub="Total registered apps"
          icon={Layers}
          color="bg-blue-50 text-blue-600"
        />

        {/* 2. Today's Requests */}
        <StatCard
          label="2. Today's Requests"
          value={cards.todayRequests ?? 0}
          sub="Total authentication requests"
          icon={Activity}
          color="bg-indigo-50 text-indigo-600"
        />

        {/* 3. Success Rate */}
        <StatCard
          label="3. Success Rate"
          value={cards.successRate ?? '100%'}
          sub="Verified approvals"
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600"
        />

        {/* 4. Current Month Usage */}
        <StatCard
          label="4. Current Month Usage"
          value={(cards.currentMonthUsage ?? 0).toLocaleString()}
          sub="Requests processed this month"
          icon={TrendingUp}
          color="bg-purple-50 text-purple-600"
        />

        {/* 5. Current Month Bill */}
        <StatCard
          label="5. Current Month Bill"
          value={cards.currentMonthBill ?? '₹0.00'}
          sub="Pay-as-you-go accumulated"
          icon={Zap}
          color="bg-amber-50 text-amber-600"
        />

        {/* 6. Pending Requests */}
        <StatCard
          label="6. Pending Requests"
          value={cards.pendingRequests ?? 0}
          sub="Awaiting user mobile approval"
          icon={Clock}
          color="bg-yellow-50 text-yellow-600"
        />

        {/* 7. API Health */}
        <StatCard
          label="7. API Health"
          value={cards.apiHealth ?? '100% Operational'}
          sub="DDS Platform Gateway Status"
          icon={ShieldCheck}
          color="bg-teal-50 text-teal-600"
        />

        {/* 8. Recent Activity */}
        <StatCard
          label="8. Recent Activity"
          value={`${cards.recentActivityCount ?? recent.length} Events`}
          sub="Latest API audit logs"
          icon={Cpu}
          color="bg-rose-50 text-rose-600"
        />

        {/* 9. Application Status */}
        <StatCard
          label="9. Application Status"
          value={cards.applicationStatus ?? `${apps.length} Active`}
          sub="Global environment state"
          icon={Layers}
          color="bg-sky-50 text-sky-600"
        />
      </div>

      {/* Applications Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Your Developer Applications</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage secure credentials, status, environment, and daily/monthly limits</p>
          </div>
          <Link
            to="/apps/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20"
          >
            + Create Application
          </Link>
        </div>

        {apps.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center">
            <Layers size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700">No applications created yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">Create your application to generate an Application ID (dds_app_...), API Key (dds_pk_...), and Secret Key (dds_sk_...).</p>
            <Link to="/apps/new" className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all">
              Create Application Now
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <Link
                key={app._id}
                to={`/apps/${app.applicationId}`}
                className="border border-gray-100 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all group bg-gray-50/30"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate group-hover:text-blue-600 transition-colors">{app.applicationName}</p>
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5 truncate">{app.applicationId}</p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ml-2 ${
                    app.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {app.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Daily Usage</span>
                    <span className="font-bold text-gray-800">{app.dailyUsage || 0} / {app.dailyLimit || 1000}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-bold">Monthly Usage</span>
                    <span className="font-bold text-gray-800">{app.monthlyUsage || 0} / {app.monthlyLimit || 30000}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 text-[11px] font-bold text-blue-600 group-hover:underline">
                  <span>Manage Credentials & Settings</span>
                  <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Table */}
      {recent.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-4">Recent API Activity Logs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="text-left py-2.5 px-3">Auth ID</th>
                  <th className="text-left py-2.5 px-3">App ID</th>
                  <th className="text-left py-2.5 px-3">Status</th>
                  <th className="text-left py-2.5 px-3">Latency</th>
                  <th className="text-left py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-mono">
                {recent.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-bold text-blue-600">{log.authenticationId || 'auth_...'}</td>
                    <td className="py-2.5 px-3 text-gray-600">{log.applicationIdStr || 'dds_app_...'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">{log.latency || log.responseTimeMs || 0}ms</td>
                    <td className="py-2.5 px-3 text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
