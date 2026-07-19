import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export const Billing = () => {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/invoices');
      if (res.data.success) {
        setInvoices(res.data.invoices);
      }
    } catch (err) {
      console.error('[Admin Invoices Fetch Error]', err);
      toast.error('Failed to load billing invoices.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleMarkPaid = async (invoiceId) => {
    const reason = prompt('Enter manual settlement notes/reason:');
    if (reason === null) return;
    try {
      await api.post(`/admin/invoices/${invoiceId}/mark-paid`, { reason });
      toast.success('Invoice marked as paid. Developer account reactivated if needed.');
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Settlement failed.');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Billing & Invoicing Governance</h1>
          <p className="text-xs text-slate-400 mt-1">Monitor monthly Pay-As-You-Go developer invoices and process manual settlements.</p>
        </div>
        <button
          onClick={fetchInvoices}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-800"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stripe Status Indicator Banner */}
      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
          <span>
            <strong>Stripe Billing Integration Active:</strong> Test Keys configured in backend <code className="font-mono bg-emerald-950 px-1 py-0.5 rounded">.env</code>. Automatic webhook triggers update invoices in real time.
          </span>
        </div>
        <span className="px-2.5 py-1 bg-emerald-900/60 border border-emerald-700/50 rounded-md text-[10px] font-black uppercase tracking-wider text-emerald-300">
          TEST MODE
        </span>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[10px] font-black uppercase tracking-wider">
              <th className="px-6 py-4">Invoice ID</th>
              <th className="px-6 py-4">Developer</th>
              <th className="px-6 py-4">Period</th>
              <th className="px-6 py-4 text-right">Free Requests</th>
              <th className="px-6 py-4 text-right">Paid Requests</th>
              <th className="px-6 py-4 text-right">Amount Due</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {invoices.map((inv) => (
              <tr key={inv.invoiceId} className="hover:bg-slate-850/50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-white">{inv.invoiceId}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-200">{inv.developerEmail}</div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase">{inv.developerId}</div>
                </td>
                <td className="px-6 py-4 text-slate-400 font-medium">{inv.billingMonth}</td>
                <td className="px-6 py-4 text-right font-mono text-slate-400">{inv.freeRequests.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-mono text-slate-300">{inv.paidRequests.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-mono font-bold text-white">₹{inv.totalRupees}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    inv.status === 'paid'
                      ? 'bg-green-950/60 text-green-400 border border-green-800/40'
                      : inv.status === 'overdue'
                      ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                  }`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {inv.status !== 'paid' && (
                    <button
                      onClick={() => handleMarkPaid(inv.invoiceId)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-md shadow-blue-600/20"
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
  );
};

export default Billing;
