import React, { useState, useEffect } from 'react';
import { Search, Code2, ShieldAlert, Trash2, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const Developers = () => {
  const [developers, setDevelopers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchDevelopers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/developers?search=${encodeURIComponent(search)}`);
      if (res.data.success) {
        setDevelopers(res.data.developers);
      }
    } catch (err) {
      console.error('[Developers Fetch Error]', err);
      toast.error('Failed to load developers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevelopers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDevelopers();
  };

  const handleUpdateStatus = async (devId, updates) => {
    const reason = prompt('Enter audit reason for updating developer status:');
    if (reason === null) return;
    try {
      await api.post(`/admin/developers/${devId}/status`, { ...updates, reason });
      toast.success('Developer status updated.');
      fetchDevelopers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  };

  const handlePermanentDelete = async (devId) => {
    const confirm = window.confirm('Permanently delete developer, applications, API keys, and unlink Stripe Customer?');
    if (!confirm) return;
    const reason = prompt('Enter audit reason for developer purge:');
    if (reason === null) return;
    try {
      await api.post('/admin/delete-account', {
        targetId: devId,
        targetType: 'developer',
        reason
      });
      toast.success('Developer account purged cleanly.');
      fetchDevelopers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purge failed.');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Developer Governance</h1>
          <p className="text-xs text-slate-400 mt-1">Manage developer credentials, billing flags, and accounts.</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Email or Developer ID..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500 font-medium"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all">
            Search
          </button>
        </form>
      </div>

      {/* Security Privacy Banner */}
      <div className="bg-purple-950/40 border border-purple-800/40 rounded-2xl p-4 flex items-center gap-3 text-xs text-purple-300">
        <ShieldAlert size={18} className="text-purple-400 shrink-0" />
        <span>
          <strong>Secret Key Isolation Enforced:</strong> Secret API Keys, JWTs, and Stripe Secrets are cryptographically concealed and never exposed to the Admin Portal.
        </span>
      </div>

      {/* Developers Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <th className="px-6 py-4">Developer Email</th>
              <th className="px-6 py-4">Developer ID</th>
              <th className="px-6 py-4">Applications</th>
              <th className="px-6 py-4">Billing Status</th>
              <th className="px-6 py-4">Account Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {developers.map((d) => (
              <tr key={d.id} className="hover:bg-slate-850/50 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{d.email}</td>
                <td className="px-6 py-4 font-mono text-blue-400 font-semibold">{d.developerId}</td>
                <td className="px-6 py-4 font-bold text-slate-200">{d.appCount} apps</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    d.billingStatus === 'overdue'
                      ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                      : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  }`}>
                    {d.billingStatus}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    d.status === 'suspended'
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                      : 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                  }`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {d.status === 'suspended' ? (
                    <button
                      onClick={() => handleUpdateStatus(d.id, { status: 'active' })}
                      className="px-3 py-1.5 bg-green-950 hover:bg-green-900 text-green-400 border border-green-800/40 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(d.id, { status: 'suspended' })}
                      className="px-3 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-400 border border-amber-800/40 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Suspend
                    </button>
                  )}
                  <button
                    onClick={() => handlePermanentDelete(d.id)}
                    className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800/40 rounded-lg text-[10px] font-bold transition-all"
                  >
                    Delete
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

export default Developers;
