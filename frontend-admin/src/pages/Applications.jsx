import React, { useState, useEffect } from 'react';
import { AppWindow, Play, Pause, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/applications');
      if (res.data.success) {
        setApplications(res.data.applications);
      }
    } catch (err) {
      console.error('[Applications Fetch Error]', err);
      toast.error('Failed to load applications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleToggleStatus = async (appId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const reason = prompt(`Enter audit reason for changing application status to ${nextStatus}:`);
    if (reason === null) return;

    try {
      await api.post(`/admin/applications/${appId}/toggle-status`, {
        status: nextStatus,
        reason
      });
      toast.success(`Application ${nextStatus === 'active' ? 'enabled' : 'suspended'}.`);
      fetchApplications();
    } catch (err) {
      toast.error('Failed to toggle application status.');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Client Applications</h1>
          <p className="text-xs text-slate-400 mt-1">Overview of developer-registered applications using DDS authentication services.</p>
        </div>
        <button
          onClick={fetchApplications}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-800"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Applications Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <th className="px-6 py-4">Application Name</th>
              <th className="px-6 py-4">Developer</th>
              <th className="px-6 py-4">Created Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">API Enabled</th>
              <th className="px-6 py-4 text-right">Total Requests</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-slate-850/50 transition-colors">
                <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400">
                    <AppWindow size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-white">{app.name}</div>
                    <div className="text-[10px] font-mono text-slate-500">{app.appId}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-200">{app.developerEmail}</div>
                  <div className="text-[10px] font-mono text-blue-400">{app.developerId}</div>
                </td>
                <td className="px-6 py-4 text-slate-400">{new Date(app.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    app.status === 'active'
                      ? 'bg-green-950/60 text-green-400 border border-green-800/40'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                  }`}>
                    {app.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-slate-300">
                  {app.isApiEnabled ? (
                    <span className="text-green-400 flex items-center gap-1"><Play size={10} /> Yes</span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1"><Pause size={10} /> No</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-white">
                  {app.totalRequests.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleToggleStatus(app.id, app.status)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                      app.status === 'active'
                        ? 'bg-amber-950 hover:bg-amber-900 text-amber-400 border-amber-800/40'
                        : 'bg-green-950 hover:bg-green-900 text-green-400 border-green-800/40'
                    }`}
                  >
                    {app.status === 'active' ? 'Suspend App' : 'Enable App'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Applications;
