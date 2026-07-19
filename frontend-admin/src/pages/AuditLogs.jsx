import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('[Audit Logs Fetch Error]', err);
      toast.error('Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">System Audit Log</h1>
          <p className="text-xs text-slate-400 mt-1">Immutable administrative action trail for security, compliance, and auditing.</p>
        </div>
        <button
          onClick={fetchAuditLogs}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-800"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Admin Email</th>
              <th className="px-6 py-4">Action Type</th>
              <th className="px-6 py-4">Target ID / Resource</th>
              <th className="px-6 py-4">Reason / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {logs.map((log) => (
              <tr key={log._id} className="hover:bg-slate-850/50 transition-colors">
                <td className="px-6 py-4 text-slate-400 font-mono flex items-center gap-2">
                  <Clock size={12} className="text-slate-500 shrink-0" />
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-200">{log.adminEmail}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-blue-950/60 text-blue-400 border border-blue-800/40 rounded-md font-black uppercase text-[10px] tracking-wider">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-slate-300 font-semibold">{log.targetId}</td>
                <td className="px-6 py-4 text-slate-400 font-medium">{log.reason || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;
