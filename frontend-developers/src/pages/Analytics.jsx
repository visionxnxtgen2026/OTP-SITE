import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { Activity, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

const RANGE_OPTIONS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' }
];

export const Analytics = () => {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get(`/api/dev/analytics?range=${range}`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [range]);

  const summary = data?.summary || {};
  const dailyData = data?.dailyData || [];

  return (
    <div className="p-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">API usage across all your applications.</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {RANGE_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: summary.totalRequests?.toLocaleString() || '0', icon: Activity, color: 'text-blue-600 bg-blue-50' },
          { label: 'Success Rate', value: `${summary.successRate || 0}%`, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
          { label: 'Successful', value: summary.successRequests?.toLocaleString() || '0', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Failed', value: summary.failedRequests?.toLocaleString() || '0', icon: XCircle, color: 'text-red-600 bg-red-50' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{isLoading ? '—' : value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                <Icon size={17} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Line Chart */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-6">Daily Requests</h2>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dailyData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} dot={false} name="Success" />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Apps Bar Chart */}
      {(data?.topApps?.length > 0) && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-6">Top Applications by Usage</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.topApps} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="applicationName" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="requests" fill="#2563eb" radius={[4, 4, 0, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cost summary */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total API Cost ({range})</p>
          <p className="text-3xl font-black text-gray-900 mt-1">₹{summary.totalCostRupees || '0.00'}</p>
          <p className="text-xs text-gray-400 mt-1">₹0.15 per successful request after 1,000 free credits</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Billable requests</p>
          <p className="text-xl font-black text-gray-700">{(summary.successRequests || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
