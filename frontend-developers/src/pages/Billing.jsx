import React, { useState, useEffect } from 'react';
import {
  CreditCard, Calendar, Clock, AlertTriangle, CheckCircle, RefreshCw,
  Plus, Trash2, ExternalLink, FileText, Activity, Info, ShieldAlert,
  DollarSign, ArrowRight, X, Sparkles, Loader2, Landmark
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useDevStore } from '../store/devStore';
import api from '../services/api';

// Stripe elements nested form
const CardForm = ({ clientSecret, onSave, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const tid = toast.loading('Confirming card credentials with Stripe...');

    try {
      const cardElement = elements.getElement(CardElement);
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement
        }
      });

      if (error) {
        toast.error(error.message || 'Setup confirmation failed.', { id: tid });
      } else {
        await onSave(setupIntent.payment_method);
        toast.success('Card successfully setup!', { id: tid });
      }
    } catch (err) {
      console.error(err);
      toast.error('Card onboarding failed.', { id: tid });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4.5">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '13px',
                color: '#1e293b',
                fontFamily: 'system-ui, sans-serif',
                '::placeholder': { color: '#94a3b8' }
              }
            }
          }}
        />
      </div>

      <div className="flex gap-2.5 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4.5 py-2.5 bg-slate-100 dark:bg-slate-800 dark:text-slate-350 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
          className="px-4.5 py-2.5 bg-blue-650 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          {loading && <Loader2 size={12} className="animate-spin" />}
          <span>Setup Card</span>
        </button>
      </div>
    </form>
  );
};

export const Billing = () => {
  const { developer } = useDevStore();
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Card elements configurations
  const [stripePublicKey, setStripePublicKey] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  
  // Card Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardLast4, setCardLast4] = useState('4242');
  const [cardExpMonth, setCardExpMonth] = useState('12');
  const [cardExpYear, setCardExpYear] = useState('2028');
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Webhook Simulator State
  const [simulatingEvent, setSimulatingEvent] = useState(null);

  const loadData = async (isPoll = false) => {
    if (!isPoll) setIsLoading(true);
    try {
      const [summaryRes, invoicesRes, configRes] = await Promise.all([
        api.get('/api/dev/billing/summary'),
        api.get('/api/dev/billing/invoices'),
        api.get('/api/developer/billing-config').catch(() => null)
      ]);

      setSummary(summaryRes.data?.summary || null);
      setInvoices(invoicesRes.data?.invoices || []);
      
      const pubKey = configRes?.data?.config?.stripePublicKey || 'pk_test_mock';
      setStripePublicKey(pubKey);
      if (pubKey && pubKey !== 'pk_test_mock') {
        setStripePromise(loadStripe(pubKey));
      }
    } catch (err) {
      console.error('[Billing Load Error]:', err);
      if (!isPoll) setError('Unable to load billing data.');
    } finally {
      if (!isPoll) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Auto-refresh billing metrics and invoice status every 3 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenStripePortal = async () => {
    const tid = toast.loading('Redirecting to Stripe Customer Portal...');
    try {
      const res = await api.post('/api/dev/billing/create-portal-session');
      if (res.data.url) {
        toast.success('Redirecting to Stripe...', { id: tid });
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to open Stripe Billing Portal.', { id: tid });
    }
  };

  const handleOpenAddCardModal = async () => {
    const tid = toast.loading('Initializing card setup session...');
    try {
      const res = await api.post('/api/dev/billing/create-setup-intent');
      if (res.data.clientSecret) {
        setClientSecret(res.data.clientSecret);
        setIsCardModalOpen(true);
        toast.dismiss(tid);
      }
    } catch (err) {
      toast.error('Failed to initialize Stripe Setup Intent.', { id: tid });
    }
  };

  const handleSaveRealCard = async (paymentMethodId) => {
    try {
      const res = await api.post('/api/dev/billing/attach-payment-method', {
        paymentMethodId
      });
      setIsCardModalOpen(false);
      loadData(true);
    } catch (err) {
      toast.error('Failed to save payment method on database.');
    }
  };

  const handleSaveMockCard = async (e) => {
    e.preventDefault();
    if (!cardLast4 || cardLast4.length !== 4 || !/^\d+$/.test(cardLast4)) {
      toast.error('Please enter a valid 4-digit card number.');
      return;
    }
    setIsSavingCard(true);
    const tid = toast.loading('Adding mock card to Stripe...');
    try {
      const pmId = `pm_mock_${Math.random().toString(36).substring(2, 9)}`;
      await api.post('/api/dev/billing/attach-payment-method', {
        paymentMethodId: pmId
      });
      toast.success('Mock card attached successfully!', { id: tid });
      setIsCardModalOpen(false);
      loadData(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update mock payment method.', { id: tid });
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleRemoveCard = async () => {
    if (!window.confirm('Are you sure you want to remove your card on file? This will disable automatic invoice payments.')) return;
    const tid = toast.loading('Removing payment method...');
    try {
      await api.delete('/api/dev/billing/payment-method');
      toast.success('Card removed successfully.', { id: tid });
      loadData(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove payment method.', { id: tid });
    }
  };

  const handleSimulateWebhook = async (type, invoiceId) => {
    setSimulatingEvent(type);
    const tid = toast.loading(`Simulating Stripe webhook event: ${type}...`);
    try {
      await api.post('/api/dev/billing/stripe/simulate-webhook', {
        type,
        invoiceId
      });
      toast.success(`Webhook event "${type}" completed successfully!`, { id: tid });
      loadData(true);
    } catch (err) {
      console.error(err);
      toast.error('Simulation failed.', { id: tid });
    } finally {
      setSimulatingEvent(null);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-1/3"></div>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
          <div className="h-32 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-8 space-y-4 max-w-md mx-auto">
          <AlertTriangle size={32} className="mx-auto text-red-600" />
          <div>
            <h3 className="font-black text-sm">Failed to Load Billing</h3>
            <p className="text-xs text-red-500 mt-1">Failed to fetch billing status from the DDS server.</p>
          </div>
          <button onClick={() => loadData()}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const freeRequestsPerDay = summary?.freeRequestsPerDay || 5;
  const pricePerRequestRupees = summary?.pricePerRequestRupees || '0.50';
  const todayFree = summary?.todayFree ?? 0;
  const remainingFree = summary?.remainingFree ?? 0;

  const nextResetStr = summary?.nextResetTime
    ? new Date(summary.nextResetTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '—';

  const statusColors = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    payment_pending: 'bg-amber-50 text-amber-700 border-amber-100',
    overdue: 'bg-red-50 text-red-700 border-red-100'
  };

  const invoiceStatuses = {
    paid: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    payment_pending: 'bg-amber-50 text-amber-600 border-amber-100',
    overdue: 'bg-red-50 text-red-600 border-red-100',
    pending: 'bg-slate-50 text-slate-600 border-slate-100'
  };

  const hasRealStripe = stripePublicKey && stripePublicKey !== 'pk_test_mock';

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-8 bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-200 min-h-screen transition-colors duration-200">
      
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-205 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Billing & Usage</h1>
            <span className="text-[10px] font-black text-white bg-slate-800 dark:bg-slate-900 border border-slate-700 px-2 py-0.5 rounded uppercase tracking-wider">Pay As You Go</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your card credentials, monitor daily free and paid authentication usage, and view invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider ${statusColors[summary?.billingStatus || 'active']}`}>
            Billing: {summary?.billingStatus?.replace('_', ' ') || 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* ── BANNERS: OVERDUE / SUSPENDED ──────────────────────────────────── */}
      {summary?.billingStatus === 'overdue' && (
        <div className="bg-red-50 border border-red-200 text-red-950 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
          <div className="flex items-center justify-between border-b border-red-100 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-red-800 flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-600" /> Account Suspended
            </h3>
            <span className="text-[9px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded tracking-wider">
              Authentication Disabled
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-red-800 font-medium leading-relaxed">
              Your developer API keys have been disabled because invoice payment failed and the grace period has expired.
              Your applications will return <code className="font-mono bg-red-100 text-red-700 px-1 py-0.5 rounded">402 Payment Required</code>.
              Please complete payment immediately through the Stripe billing portal to reactivate.
            </p>
            <div className="flex items-center gap-4 pt-1">
              <div>
                <span className="text-[10px] text-red-600 uppercase font-black tracking-wider block">Outstanding Balance</span>
                <span className="text-red-950 font-black text-lg">₹{summary?.outstandingRupees || '0.00'}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenStripePortal}
                  className="px-4 py-2 bg-red-655 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <span>Settle Outstanding via Stripe Portal</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BANNERS: GRACE PERIOD ACTIVE ─────────────────────────────────── */}
      {summary?.billingStatus === 'payment_pending' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-800 flex items-center gap-2">
              <Clock size={18} className="text-amber-600" /> Payment Pending — Grace Period Active
            </h3>
            <span className="text-[9px] font-black uppercase bg-amber-500 text-white px-2 py-0.5 rounded tracking-wider">
              Grace Period: {summary?.graceDaysRemaining || 7} Days Left
            </span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              Your automatic monthly payment failed. You are currently in a grace period.
              Your verification API keys remain active. Please settle the dues or update your card details inside the Stripe portal to avoid service suspension.
            </p>
            <div className="grid sm:grid-cols-4 gap-4 text-xs font-semibold pt-1">
              <div>
                <span className="text-amber-600 uppercase text-[9px] block font-black tracking-wider">Amount Due</span>
                <span className="text-amber-950 font-black text-sm">₹{summary?.outstandingRupees || '0.00'}</span>
              </div>
              <div>
                <span className="text-amber-600 uppercase text-[9px] block font-black tracking-wider">Days Remaining</span>
                <span className="text-amber-950 font-black text-sm">{summary?.graceDaysRemaining || 0} Days</span>
              </div>
              <div className="sm:col-span-2 flex items-end gap-2">
                <button
                  onClick={handleOpenStripePortal}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <span>Manage Billing & Pay</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── METRICS SUMMARY GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        
        {/* Card 1: Today's Free Usage */}
        <div className="bg-white dark:bg-[#0d1321] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Today's Free Usage</span>
              <Sparkles size={14} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                {todayFree} <span className="text-xs text-slate-300 dark:text-slate-500 font-normal">/ {freeRequestsPerDay}</span>
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                {remainingFree} remaining free requests today
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (todayFree / freeRequestsPerDay) * 100)}%` }} />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-550">
              <span>Next reset</span>
              <span className="font-semibold">{nextResetStr}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Current Month Usage */}
        <div className="bg-white dark:bg-[#0d1321] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm group">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Current Month Usage</span>
              <Activity size={14} className="text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                {summary?.currentMonthUsage || 0} <span className="text-xs text-slate-300 dark:text-slate-500 font-normal">requests</span>
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                Includes {summary?.paidRequestsThisMonth || 0} billable requests
              </p>
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-550">
            <span>Rate</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">₹{pricePerRequestRupees} / successful request</span>
          </div>
        </div>

        {/* Card 3: Current Month Bill */}
        <div className="bg-white dark:bg-[#0d1321] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm group">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Current Month Bill</span>
              <DollarSign size={14} className="text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                ₹{summary?.currentBillRupees || '0.00'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                Accumulated Pay As You Go total
              </p>
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-550">
            <span>Next Invoice Date</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{summary?.nextInvoiceDate}</span>
          </div>
        </div>

        {/* Card 4: Outstanding Balance */}
        <div className="bg-blue-600 text-white rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
          <div className="space-y-3">
            <div className="flex items-center justify-between text-blue-200">
              <span className="text-[10px] font-black uppercase tracking-wider">Outstanding Balance</span>
              <Landmark size={14} className="text-blue-200" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none">
                ₹{summary?.outstandingRupees || '0.00'}
              </p>
              <p className="text-[10px] text-blue-100 font-medium mt-1">
                Total outstanding invoices due
              </p>
            </div>
          </div>
          <div className="mt-4">
            {parseFloat(summary?.outstandingRupees || '0') > 0 && (
              <button
                onClick={handleOpenStripePortal}
                className="w-full py-1.5 bg-white hover:bg-slate-50 text-blue-650 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Pay Outstanding
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MIDDLE GRID: STRIPE BILLING PROFILE & WEBHOOK SIMULATION ──────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card & Card credentials */}
        <div className="md:col-span-2 bg-white dark:bg-[#0d1321] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Payment & Billing Details</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage your credit card credentials and invoice settings.</p>
            </div>
            
            <button
              onClick={handleOpenStripePortal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-850 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-350 transition-all cursor-pointer shadow-sm"
            >
              <span>Stripe Portal</span>
              <ExternalLink size={11} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Card on file */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550">Card on File</p>
              
              {summary?.paymentMethod ? (
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-slate-800 dark:bg-slate-950 text-white rounded font-bold text-[10px] flex items-center justify-center tracking-widest shrink-0 uppercase">
                      {summary.paymentMethod.brand}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-850 dark:text-slate-205">•••• •••• •••• {summary.paymentMethod.last4}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Expires {summary.paymentMethod.expMonth}/{summary.paymentMethod.expYear}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCard}
                    className="text-slate-405 hover:text-red-600 p-1.5 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center space-y-3">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">No credit card attached to your profile.</p>
                  <button
                    onClick={handleOpenAddCardModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={11} /> Setup Card Details
                  </button>
                </div>
              )}
            </div>

            {/* Billing specifications */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-550">Billing Information</p>
              <div className="space-y-2">
                {[
                  { label: 'Customer ID', value: developer?.stripeCustomerId || 'Auto-generated', mono: true },
                  { label: 'Timezone resetting', value: developer?.timezone || 'Asia/Kolkata' },
                  { label: 'Request Rate Limit', value: '10 requests/s' }
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-50 dark:border-slate-900 last:border-0">
                    <span className="text-slate-400 dark:text-slate-500 font-semibold">{label}</span>
                    <span className={`font-bold text-slate-700 dark:text-slate-300 ${mono ? 'font-mono text-[10px]' : ''}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stripe Webhook Simulator Panel */}
        <div className="bg-slate-900 dark:bg-[#0d1321] border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-4 text-slate-350">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Activity size={12} className="text-blue-400" /> Webhook Simulator
              </h3>
              <span className="text-[8px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                DEBUG MODE
              </span>
            </div>
            <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
              Force Stripe mock events to simulate webhook integrations and verify active grace periods or reactivations.
            </p>
          </div>

          <div className="space-y-2 flex-grow flex flex-col justify-center">
            {invoices.length === 0 ? (
              <p className="text-center text-[10px] text-slate-500 font-semibold py-4">No active invoices found to trigger events.</p>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="text-[8px] font-black uppercase tracking-wider text-slate-500 block mb-1">Target invoice ID</label>
                  <code className="text-xs font-mono font-bold text-white bg-slate-850 px-2.5 py-1.5 border border-slate-800 rounded-lg block">
                    {invoices[0].invoiceId}
                  </code>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    disabled={simulatingEvent === 'invoice.payment_succeeded'}
                    onClick={() => handleSimulateWebhook('invoice.payment_succeeded', invoices[0].invoiceId)}
                    className="flex items-center justify-center gap-1 px-2.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 disabled:opacity-40 border border-emerald-500/20 rounded-xl text-[10px] font-black text-emerald-455 transition-all cursor-pointer"
                  >
                    {simulatingEvent === 'invoice.payment_succeeded' ? <Loader2 size={10} className="animate-spin" /> : 'Payment Success'}
                  </button>
                  <button
                    disabled={simulatingEvent === 'invoice.payment_failed'}
                    onClick={() => handleSimulateWebhook('invoice.payment_failed', invoices[0].invoiceId)}
                    className="flex items-center justify-center gap-1 px-2.5 py-2 bg-amber-600/10 hover:bg-amber-600/20 disabled:opacity-40 border border-amber-500/20 rounded-xl text-[10px] font-black text-amber-455 transition-all cursor-pointer"
                  >
                    {simulatingEvent === 'invoice.payment_failed' ? <Loader2 size={10} className="animate-spin" /> : 'Payment Failure'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MONTHLY INVOICE TABLE ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0d1321] border border-slate-205 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Invoice History</h2>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Billed in INR (₹)</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold leading-relaxed">
            No invoices generated yet. Monthly bills are compiled automatically at 12:00 AM on the last day of each month.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 uppercase font-black tracking-wider text-[9px] border-b border-slate-100 dark:border-slate-800 select-none">
                <tr>
                  <th className="p-4 pl-6">Invoice ID</th>
                  <th className="p-4">Billing Period</th>
                  <th className="p-4">Successful Requests</th>
                  <th className="p-4">Billable Requests</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment Date</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-350">
                {invoices.map((inv) => (
                  <tr key={inv.invoiceId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 pl-6 font-mono font-bold text-slate-900 dark:text-white">{inv.invoiceId}</td>
                    <td className="p-4">{inv.billingMonth}</td>
                    <td className="p-4">{(inv.freeRequests || 0) + (inv.paidRequests || 0)}</td>
                    <td className="p-4">{inv.paidRequests || 0}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">₹{inv.totalRupees}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${invoiceStatuses[inv.status] || 'bg-slate-100'}`}>
                        {inv.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={handleOpenStripePortal}
                            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-bold uppercase transition-all shadow-sm cursor-pointer"
                          >
                            <span>Pay in Stripe</span>
                            <ExternalLink size={8} />
                          </button>
                        )}
                        <a
                          href={`${api.defaults.baseURL || ''}/api/dev/billing/invoices/${inv.invoiceId}/pdf`}
                          download={`Invoice-${inv.invoiceId}.pdf`}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer"
                        >
                          <FileText size={10} />
                          <span>PDF</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── STRIPE CARD ADD/SETUP MODAL ────────────────────────── */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#0d1321] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">Setup Card Credentials</h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {hasRealStripe && stripePromise ? (
              <Elements stripe={stripePromise}>
                <CardForm
                  clientSecret={clientSecret}
                  onSave={handleSaveRealCard}
                  onCancel={() => setIsCardModalOpen(false)}
                />
              </Elements>
            ) : (
              /* Sandbox/Mock Credit Card Form */
              <form onSubmit={handleSaveMockCard} className="space-y-4">
                <Callout type="info">Sandbox Mode: Real credentials are simulated automatically.</Callout>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Card brand</label>
                  <select
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">American Express</option>
                    <option value="RuPay">RuPay</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Last 4 digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4242"
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Expiry Month</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      placeholder="12"
                      value={cardExpMonth}
                      onChange={(e) => setCardExpMonth(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Expiry Year</label>
                    <input
                      type="number"
                      min={2026}
                      max={2040}
                      placeholder="2028"
                      value={cardExpYear}
                      onChange={(e) => setCardExpYear(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCardModalOpen(false)}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCard}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border border-blue-500"
                  >
                    {isSavingCard && <Loader2 size={12} className="animate-spin" />}
                    <span>Save Card</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Internal Callout component for compatibility
const Callout = ({ type = 'info', children }) => {
  const cfg = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-300',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-300'
  };
  return (
    <div className={`p-3 rounded-xl border text-xs leading-normal font-semibold ${cfg[type] || cfg.info}`}>
      {children}
    </div>
  );
};

export default Billing;
