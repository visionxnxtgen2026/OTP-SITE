import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout & Pages
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Developers from './pages/Developers';
import Applications from './pages/Applications';
import Billing from './pages/Billing';
import Pricing from './pages/Pricing';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import { useAdminStore } from './store/adminStore';

// TODO: Enable secure Admin authentication before production deployment. Current bypass is for local development only.
const ProtectedAdminRoute = ({ children }) => {
  // Development mode: Admin authentication is bypassed
  return children;
};

const AdminLayout = ({ children }) => (
  <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
    <Sidebar />
    <main className="flex-1 overflow-y-auto min-h-screen">{children}</main>
  </div>
);

export const App = () => (
  <BrowserRouter>
    <Toaster position="top-right" toastOptions={{ style: { background: '#090d16', color: '#fff', border: '1px solid #1e293b', fontSize: 13, fontWeight: 600 } }} />
    <Routes>
      {/* Development Mode: Bypass login screens completely */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />

      {/* Admin Console Routes */}
      <Route path="/dashboard" element={<ProtectedAdminRoute><AdminLayout><Dashboard /></AdminLayout></ProtectedAdminRoute>} />
      <Route path="/users" element={<ProtectedAdminRoute><AdminLayout><Users /></AdminLayout></ProtectedAdminRoute>} />
      <Route path="/developers" element={<ProtectedAdminRoute><AdminLayout><Developers /></AdminLayout></ProtectedAdminRoute>} />
      <Route path="/applications" element={<ProtectedAdminRoute><AdminLayout><Applications /></AdminLayout></ProtectedAdminRoute>} />
      <Route path="/billing" element={<ProtectedAdminRoute><AdminLayout><Billing /></AdminLayout></ProtectedAdminRoute>} />
      <Route path="/pricing" element={<ProtectedAdminRoute><AdminLayout><Pricing /></AdminLayout></ProtectedAdminRoute>} />
      <Route path="/audit-logs" element={<ProtectedAdminRoute><AdminLayout><AuditLogs /></AdminLayout></ProtectedAdminRoute>} />
      <Route path="/settings" element={<ProtectedAdminRoute><AdminLayout><Settings /></AdminLayout></ProtectedAdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
