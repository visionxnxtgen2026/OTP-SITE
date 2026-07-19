import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Key, BarChart2, TrendingUp, ArrowRight, Activity, Zap } from 'lucide-react';
import api from '../services/api';
import { useDevStore } from '../store/devStore';

const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={17} />
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  const { developer } = useDevStore();
  const [analytics, setAnalytics] = useState(null);
  const [apps, setApps] = useState([]);
  const [billing, setBilling] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsRes, appsRes, billingRes] = await Promise.all([
          api.get('/api/dev/analytics?range=30d'),
          api.get('/api/dev/apps'),
          api.get('/api/dev/billing/summary')
        ]);
        setAnalytics(analyticsRes.data);
        setApps(appsRes.data.applications || []);
        setBilling(billingRes.data.summary);
      } catch (e) {
        console.error('[Dashboard Load]', e.message);
      }
    };
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const isOverdue = billing?.billingStatus === 'overdue';

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{greeting()},</p>
          <h1 className="text-2xl font-black text-gray-900">{developer?.displayName?.split(' ')[0] || 'Developer'}</h1>
          <p className="text-xs text-gray-400 mt-1 font-mono">{developer?.developerId}</p>
        </div>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider ${
          isOverdue ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-50 text-green-600 border border-green-100'
        }`}>
          Status: {isOverdue ? 'SUSPENDED' : 'ACTIVE'}
        </span>
      </div>

      {isOverdue && (
        <div className="bg-red-50 border border-red-200 text-red-900 p-6 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-red-100 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-red-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              Account Suspended
            </h3>
            <span className="text-[10px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded">
              SUSPENDED
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs font-semibold">
            <div>
              <span className="text-red-400 uppercase text-[10px] block font-bold">Reason</span>
              <span className="text-red-900 font-extrabold">Outstanding Invoice</span>
            </div>
            <div>
              <span className="text-red-400 uppercase text-[10px] block font-bold">Amount Due</span>
              <span className="text-red-900 font-extrabold">₹{billing?.outstandingRupees}</span>
            </div>
            <div>
              <span className="text-red-400 uppercase text-[10px] block font-bold">Due Date</span>
              <span className="text-red-900 font-extrabold">{billing?.nextInvoiceDate}</span>
            </div>
          </div>

          <p className="text-xs text-red-700 leading-relaxed">
            Your DDS APIs are currently disabled. Complete payment to reactivate your account immediately.
          </p>

          <Link
            to="/billing"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-red-600/20"
          >
            Pay Now with Stripe
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Applications"
          value={apps.length}
          sub="Total apps"
          icon={Layers}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Requests (30d)"
          value={(analytics?.summary?.totalRequests || 0).toLocaleString()}
          sub={`${analytics?.summary?.successRate || 0}% success rate`}
          icon={Activity}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Today's Free Usage"
          value={`${billing?.todayFree || 0} / ${billing?.freeRequestsPerDay ?? '—'}`}
          sub={`${billing?.remainingFree || 0} free left`}
          icon={Zap}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Current Month Bill"
          value={`₹${billing?.currentBillRupees || '0.00'}`}
          sub={`${billing?.paidRequestsThisMonth || 0} paid requests`}
          icon={TrendingUp}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Applications section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider">Your Applications</h2>
          <Link to="/apps/new" className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
            + New App
          </Link>
        </div>

        {apps.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl p-10 text-center">
            <Layers size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No applications yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first application to generate API keys.</p>
            <Link to="/apps/new" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-all">
              <Layers size={13} /> Create Application
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {apps.slice(0, 6).map((app) => (
              <Link
                key={app._id}
                to={`/apps/${app.applicationId}`}
                className="bg-white border border-gray-100 rounded-xl p-5 hover:border-blue-200 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{app.applicationName}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{app.applicationId}</p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-2 ${
                    app.environment === 'production' ? 'bg-blue-50 text-blue-600' :
                    app.environment === 'development' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {app.environment}
                  </span>
                </div>
                {app.description && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{app.description}</p>
                )}
                <div className="flex items-center gap-2 mt-4 text-gray-400 group-hover:text-blue-600 transition-colors">
                  <Key size={12} />
                  <span className="text-[10px] font-semibold">View API Keys</span>
                  <ArrowRight size={10} className="ml-auto" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Top apps from analytics */}
      {analytics?.topApps?.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider mb-4">Top Applications by Usage</h2>
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Application</th>
                  <th className="text-right px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-wider">Requests (30d)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topApps.map((app, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-800">{app.applicationName || 'Unknown'}</td>
                    <td className="px-5 py-3 text-right font-mono text-gray-600">{app.requests.toLocaleString()}</td>
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
