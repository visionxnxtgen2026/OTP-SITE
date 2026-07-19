import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Local State & Hook providers
import api from '../services/api';

export const Activity = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetched = useRef(false);

  // Search & Filter local states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, APPROVED, REJECTED, EXPIRED

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/user/verification-history');
      setLogs(response.data.history || []);
    } catch (err) {
      console.error('[Fetch History Error]', err);
      // Use standard toast id to prevent spamming duplicate toasts
      toast.error('Unable to load activity history. Please try again later.', {
        id: 'activity-fetch-error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Safe mount effect to block StrictMode duplicate trigger loops
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchHistory();
    }
  }, []);

  const formatLogTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter & Search logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'ALL' || log.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Grouping logs by day
  const getGroupedLogs = () => {
    const today = [];
    const yesterday = [];
    const older = [];

    const todayDate = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDateString = yesterdayDate.toDateString();

    filteredLogs.forEach((log) => {
      const logDate = new Date(log.createdAt).toDateString();
      if (logDate === todayDate) {
        today.push(log);
      } else if (logDate === yesterdayDateString) {
        yesterday.push(log);
      } else {
        older.push(log);
      }
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = getGroupedLogs();

  return (
    <div className="space-y-4 pb-6 bg-[#F8FAFC] min-h-full">
      {/* Top App Bar (64px Height, perfectly centered, back button) */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-30 select-none">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-text-secondary hover:text-text-primary hover:bg-gray-50 rounded-full transition-all focus:outline-none"
          aria-label="Go Back"
        >
          <ArrowLeft size={20} className="stroke-[2.5]" />
        </button>
        <h2 className="text-xs font-black text-text-primary tracking-widest uppercase text-center flex-grow -ml-1">Authentication Activity</h2>
        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:text-text-primary hover:bg-gray-50 rounded-full transition-all focus:outline-none"
          aria-label="Refresh activity"
        >
          <RefreshCw size={15} className={`stroke-[2.5] ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Container */}
      <div className="px-5 space-y-4">
        
        {/* Search input field */}
        <div className="relative flex items-center bg-white border border-gray-200 rounded-[18px] px-4 py-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-soft">
          <Search size={16} className="text-gray-400 select-none" />
          <input
            type="text"
            placeholder="Search by application..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow bg-transparent text-xs font-bold text-text-primary pl-3.5 outline-none placeholder-gray-450 w-full"
          />
        </div>

        {/* Filter Pills list */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
          {['ALL', 'APPROVED', 'REJECTED', 'EXPIRED'].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`text-[9px] font-black tracking-wider px-3.5 py-2 rounded-xl border transition-all ${
                activeFilter === filter
                  ? 'bg-[#111827] text-white border-transparent shadow-soft'
                  : 'bg-white text-gray-450 border-gray-200 hover:bg-slate-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Timeline Group Log display */}
        <div className="space-y-5 pt-1">
          {isLoading && logs.length === 0 ? (
            <div className="py-20 text-center select-none">
              <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-2.5">Loading activity...</p>
            </div>
          ) : logs.length === 0 ? (
            /* Empty State 1: Zero past history logs exists at all */
            <div className="bg-white border border-gray-150 rounded-[22px] py-16 px-6 text-center shadow-soft select-none space-y-4 flex flex-col items-center justify-center">
              <svg width="56" height="56" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500 animate-pulse">
                <circle cx="34" cy="34" r="34" fill="#EFF6FF" />
                <path d="M34 50C34 50 48 43 48 32V19L34 13L20 19V32C20 43 34 50 34 50Z" fill="#3B82F6" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" />
                <path d="M28 32L32 36L40 28" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-[#111827]">No Authentication History</h3>
                <p className="text-[10px] text-gray-400 leading-relaxed max-w-[260px] mx-auto font-semibold">
                  Authentication approvals and rejections will appear here. Once another application requests verification, it will automatically be added to this page.
                </p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            /* Empty State 2: Logs exist but filtered search returned nothing */
            <div className="bg-white border border-gray-150 rounded-[22px] py-12 px-6 text-center shadow-soft select-none">
              <span className="text-3xl text-gray-300">🔍</span>
              <h3 className="text-xs font-bold text-text-primary mt-3">No matching logs found</h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">
                Try refining your filters or search keywords.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Timeline Category: Today */}
              {today.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">Today</h4>
                  <div className="space-y-2.5">
                    {today.map((log) => <ActivityRow key={log.verificationId} log={log} formatLogTime={formatLogTime} />)}
                  </div>
                </div>
              )}

              {/* Timeline Category: Yesterday */}
              {yesterday.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">Yesterday</h4>
                  <div className="space-y-2.5">
                    {yesterday.map((log) => <ActivityRow key={log.verificationId} log={log} formatLogTime={formatLogTime} />)}
                  </div>
                </div>
              )}

              {/* Timeline Category: Older */}
              {older.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">Older</h4>
                  <div className="space-y-2.5">
                    {older.map((log) => <ActivityRow key={log.verificationId} log={log} formatLogTime={formatLogTime} />)}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// Sub-component row helper
const ActivityRow = ({ log, formatLogTime }) => {
  return (
    <div className="bg-white border border-gray-150 rounded-[18px] p-4 shadow-soft flex items-center justify-between gap-4">
      <div>
        <h4 className="text-xs font-extrabold text-[#111827]">{log.clientName}</h4>
        <p className="text-[9px] text-gray-400 font-semibold tracking-wider mt-0.5 uppercase">ID: {log.verificationId.slice(0, 8)}...</p>
      </div>

      <div className="flex items-center gap-3 shrink-0 select-none">
        <span className="text-[9px] font-black tracking-wider text-text-secondary">
          {formatLogTime(log.createdAt)}
        </span>
        
        {/* Status badge mapping */}
        {log.status === 'APPROVED' && (
          <span className="text-[8px] font-black text-green-700 bg-green-50/50 border border-green-150 px-2.5 py-1 rounded flex items-center gap-1">
            <CheckCircle2 size={10} className="stroke-[2.5]" />
            <span>APPROVED</span>
          </span>
        )}
        {log.status === 'REJECTED' && (
          <span className="text-[8px] font-black text-red-700 bg-red-50/50 border border-red-150 px-2.5 py-1 rounded flex items-center gap-1">
            <XCircle size={10} className="stroke-[2.5]" />
            <span>REJECTED</span>
          </span>
        )}
        {log.status === 'PENDING' && (
          <span className="text-[8px] font-black text-amber-700 bg-amber-50/50 border border-amber-150 px-2.5 py-1 rounded flex items-center gap-1 animate-pulse">
            <Clock size={10} className="stroke-[2.5]" />
            <span>PENDING</span>
          </span>
        )}
        {log.status === 'EXPIRED' && (
          <span className="text-[8px] font-black text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded flex items-center gap-1">
            <AlertCircle size={10} className="stroke-[2.5]" />
            <span>EXPIRED</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default Activity;
