import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  ShieldCheck, 
  Key, 
  Radio, 
  RefreshCw, 
  Settings as SettingsIcon,
  Search,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  History,
  Coins
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Local State & Stores
import { useAuthStore } from '../store/authStore';
import api from '../services/api';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'Users' },
  { id: 'developers', label: 'Developers' },
  { id: 'billing', label: 'Billing' },
  { id: 'config', label: 'Pricing Config' },
  { id: 'audit', label: 'Audit Logs' }
];

export const AdminPortal = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  // Search filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Loaded DB data
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modal reason tracking
  const [actionReason, setActionReason] = useState('');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const statsRes = await api.get('/api/user/admin/dashboard-stats');
        setStats(statsRes.data.stats || {});
      } else if (activeTab === 'users') {
        const usersRes = await api.get(`/api/user/admin/users?search=${searchQuery}`);
        setUsers(usersRes.data.users || []);
      } else if (activeTab === 'developers') {
        const devsRes = await api.get(`/api/user/admin/developers?search=${searchQuery}`);
        setDevelopers(devsRes.data.developers || []);
      } else if (activeTab === 'billing') {
        const invoicesRes = await api.get('/api/user/admin/invoices');
        setInvoices(invoicesRes.data.invoices || []);
      } else if (activeTab === 'config') {
        const configsRes = await api.get('/api/user/admin/config');
        setConfigs(configsRes.data.configs || []);
      } else if (activeTab === 'audit') {
        const logsRes = await api.get('/api/user/admin/audit-logs');
        setAuditLogs(logsRes.data.logs || []);
      }
    } catch (err) {
      console.error('[Fetch Admin Data Error]', err);
      toast.error('Failed to load portal data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Access Restricted: Administrator role required.');
      navigate('/dashboard');
      return;
    }
    fetchAdminData();
  }, [user, navigate, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdminData();
  };

  // User Actions
  const handleSoftDeleteUser = async (userId) => {
    const reason = prompt('Enter reason for soft deleting user:');
    if (reason === null) return;
    try {
      await api.post(`/api/user/admin/users/${userId}/soft-delete`, { reason });
      toast.success('User soft deleted.');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred.');
    }
  };

  const handleRestoreUser = async (userId) => {
    const reason = prompt('Enter reason for restoring user:');
    if (reason === null) return;
    try {
      await api.post(`/api/user/admin/users/${userId}/restore`, { reason });
      toast.success('User restored.');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred.');
    }
  };

  // Developer Actions
  const handleUpdateDevStatus = async (devId, updates) => {
    const reason = prompt('Enter reason for this action:');
    if (reason === null) return;
    try {
      await api.post(`/api/user/admin/developers/${devId}/status`, { ...updates, reason });
      toast.success('Developer updated successfully.');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred.');
    }
  };

  // Invoice Actions
  const handleMarkPaid = async (invoiceId) => {
    const reason = prompt('Enter settlement notes/reason:');
    if (reason === null) return;
    try {
      await api.post(`/api/user/admin/invoices/${invoiceId}/mark-paid`, { reason });
      toast.success('Invoice marked paid successfully.');
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred.');
    }
  };

  // Config Actions
  const handleUpdateConfigValue = async (key, val) => {
    let parsedVal = val;
    if (!isNaN(Number(val))) {
      parsedVal = Number(val);
    }
    const reason = 'Updated via Pricing Configuration admin screen';
    try {
      await api.post('/api/user/admin/config', {
        configs: [{ key, value: parsedVal }],
        reason
      });
      toast.success('Configuration updated.');
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to update config.');
    }
  };

  return (
    <div className="space-y-6 pb-12 bg-gray-50 min-h-screen text-gray-800">
      {/* Top Header Bar */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-extrabold text-gray-900 tracking-tight">DDS Administration Panel</h1>
        </div>
        <button
          onClick={fetchAdminData}
          disabled={isLoading}
          className="p-2 text-gray-400 hover:text-gray-900 rounded-full transition-all focus:outline-none"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tab Navigation links */}
      <div className="px-6">
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-6 max-w-7xl mx-auto">
        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600' },
                { label: 'Verified Users', value: stats.verifiedUsers, icon: ShieldCheck, color: 'bg-green-50 text-green-600' },
                { label: 'Developers', value: stats.developers, icon: Key, color: 'bg-amber-50 text-amber-600' },
                { label: 'Applications', value: stats.applications, icon: Radio, color: 'bg-purple-50 text-purple-600' },
                { label: "Today's Requests", value: stats.todayRequests, icon: RefreshCw, color: 'bg-indigo-50 text-indigo-600' },
                { label: 'Monthly Revenue', value: `₹${stats.monthlyRevenueRupees || '0.00'}`, icon: Coins, color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Pending Bills', value: `₹${stats.pendingBillsRupees || '0.00'}`, icon: FileText, color: 'bg-rose-50 text-rose-600' },
                { label: 'Deleted Accounts', value: stats.deletedAccounts, icon: XCircle, color: 'bg-gray-100 text-gray-600' }
              ].map((c) => (
                <div key={c.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">{c.label}</span>
                    <c.icon size={16} className={c.color.split(' ')[1]} />
                  </div>
                  <p className="text-2xl font-black text-gray-900">{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Users */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Email, Phone number, or DDS ID..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-white font-medium"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
                Search
              </button>
            </form>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-5 py-3">User Email</th>
                    <th className="px-5 py-3">DDS User ID (Mobile)</th>
                    <th className="px-5 py-3">Verification</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900">{u.email}</td>
                      <td className="px-5 py-3.5 font-mono text-gray-600 font-semibold">{u.phoneNumber || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${u.mobileVerified ? 'bg-green-50 text-green-600 border border-green-150' : 'bg-amber-50 text-amber-600'}`}>
                          {u.mobileVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${u.isDeleted ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {u.isDeleted ? 'Deleted' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {u.isDeleted ? (
                          <button
                            onClick={() => handleRestoreUser(u._id)}
                            className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded text-[10px] font-bold"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSoftDeleteUser(u._id)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[10px] font-bold"
                          >
                            Soft Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Developers */}
        {activeTab === 'developers' && (
          <div className="space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Developer Email or ID..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs outline-none bg-white font-medium"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
                Search
              </button>
            </form>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Developer ID</th>
                    <th className="px-5 py-3">Apps Count</th>
                    <th className="px-5 py-3">Billing Status</th>
                    <th className="px-5 py-3">Month Usage</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {developers.map((d) => (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900">{d.email}</td>
                      <td className="px-5 py-3.5 font-mono text-gray-600 font-semibold">{d.developerId}</td>
                      <td className="px-5 py-3.5 font-bold">{d.appCount}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${d.billingStatus === 'overdue' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {d.billingStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono">{d.currentMonthUsage} requests</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${d.status === 'suspended' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {d.status === 'suspended' ? (
                          <button
                            onClick={() => handleUpdateDevStatus(d.id, { status: 'active' })}
                            className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded text-[10px] font-bold"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateDevStatus(d.id, { status: 'suspended' })}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] font-bold"
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateDevStatus(d.id, { isDeleted: true })}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[10px] font-bold"
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
        )}

        {/* Tab 4: Billing */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-5 py-3">Invoice ID</th>
                    <th className="px-5 py-3">Developer</th>
                    <th className="px-5 py-3">Period</th>
                    <th className="px-5 py-3 text-right">Free Requests</th>
                    <th className="px-5 py-3 text-right">Paid Requests</th>
                    <th className="px-5 py-3 text-right">Amount Due</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.invoiceId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-gray-800 font-semibold">{inv.invoiceId}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-gray-900">{inv.developerEmail}</div>
                        <div className="text-[9px] text-gray-400 uppercase font-mono">{inv.developerId}</div>
                      </td>
                      <td className="px-5 py-3.5 font-medium">{inv.billingMonth}</td>
                      <td className="px-5 py-3.5 text-right font-mono">{inv.freeRequests.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right font-mono">{inv.paidRequests.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-gray-900">₹{inv.totalRupees}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          inv.status === 'paid' ? 'bg-green-50 text-green-600 border border-green-150' :
                          inv.status === 'overdue' ? 'bg-red-50 text-red-600 border border-red-150' :
                          'bg-amber-50 text-amber-600 border-amber-150'
                        }`}>{inv.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkPaid(inv.invoiceId)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Pricing Config */}
        {activeTab === 'config' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <SettingsIcon size={16} /> Update Configurations
              </h3>
              
              <div className="space-y-4">
                {configs.map((c) => (
                  <div key={c.key} className="flex flex-col gap-1.5 p-3 border border-gray-100 rounded-xl hover:border-blue-100 transition-colors bg-gray-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">{c.description || c.key}</span>
                      <span className="text-[9px] font-mono text-gray-400 uppercase">{c.key}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        defaultValue={c.value}
                        onBlur={(e) => {
                          if (e.target.value !== String(c.value)) {
                            handleUpdateConfigValue(c.key, e.target.value);
                          }
                        }}
                        placeholder="Value"
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guide Card */}
            <div className="bg-blue-50/50 border border-blue-150 rounded-2xl p-6 space-y-3">
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} /> Pricing & Lock Guidelines
              </h4>
              <ul className="text-xs text-blue-800 space-y-2 list-disc pl-4 font-medium leading-relaxed">
                <li>Changes made to pricing and security thresholds update in real-time.</li>
                <li>`authRequestPricePaise` represents the request cost in Indian Paise (e.g. 50 paise = ₹0.50).</li>
                <li>Verify lock rules dictate max OTP failures before applying temporary cooldown bans.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 6: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="px-5 py-3">Admin</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Target ID</th>
                    <th className="px-5 py-3">Reason</th>
                    <th className="px-5 py-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-800">{log.adminEmail}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-extrabold uppercase rounded text-[9px] tracking-wider">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-gray-600 font-semibold">{log.targetId}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-600">{log.reason}</td>
                      <td className="px-5 py-3.5 text-gray-450">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPortal;
