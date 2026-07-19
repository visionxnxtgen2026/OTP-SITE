import React, { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, Trash2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(search)}`);
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('[Users Fetch Error]', err);
      toast.error('Failed to load user list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleSoftDelete = async (userId) => {
    const reason = prompt('Enter audit reason for soft deleting this user account:');
    if (reason === null) return;
    try {
      await api.post(`/admin/users/${userId}/soft-delete`, { reason });
      toast.success('User soft deleted.');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const handleRestore = async (userId) => {
    const reason = prompt('Enter audit reason for restoring this user account:');
    if (reason === null) return;
    try {
      await api.post(`/admin/users/${userId}/restore`, { reason });
      toast.success('User account restored.');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    }
  };

  const handlePermanentDelete = async (userId) => {
    const confirm = window.confirm('Permanently delete this user from MongoDB and Firebase Auth?');
    if (!confirm) return;
    const reason = prompt('Enter audit reason for permanent deletion:');
    if (reason === null) return;
    try {
      await api.post('/admin/delete-account', {
        targetId: userId,
        targetType: 'user',
        reason
      });
      toast.success('User permanently deleted.');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Permanent deletion failed.');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">User Governance</h1>
          <p className="text-xs text-slate-400 mt-1">Manage user verification status and account access.</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Email, Mobile Number, or ID..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500 font-medium"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all">
            Search
          </button>
        </form>
      </div>

      {/* Security Privacy Notice Banner */}
      <div className="bg-blue-950/40 border border-blue-800/40 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-300">
        <ShieldCheck size={18} className="text-blue-400 shrink-0" />
        <span>
          <strong>Cryptographic Privacy Enforced:</strong> Admin accounts cannot view OTPs, verification codes, login tokens, or passwords.
        </span>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">DDS User ID (Mobile)</th>
              <th className="px-6 py-4">Verified</th>
              <th className="px-6 py-4">Created Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-slate-850/50 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{u.email}</td>
                <td className="px-6 py-4 font-mono text-slate-300">{u.phoneNumber || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    u.mobileVerified
                      ? 'bg-green-950/60 text-green-400 border border-green-800/40'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                  }`}>
                    {u.mobileVerified ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    u.isDeleted ? 'bg-red-950/60 text-red-400 border border-red-800/40' : 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                  }`}>
                    {u.isDeleted ? 'Deleted' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {u.isDeleted ? (
                    <button
                      onClick={() => handleRestore(u._id)}
                      className="px-3 py-1.5 bg-green-950 hover:bg-green-900 text-green-400 border border-green-800/40 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSoftDelete(u._id)}
                      className="px-3 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-400 border border-amber-800/40 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Soft Delete
                    </button>
                  )}
                  <button
                    onClick={() => handlePermanentDelete(u._id)}
                    className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800/40 rounded-lg text-[10px] font-bold transition-all"
                  >
                    Purge
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

export default Users;
