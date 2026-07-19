import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './components/Sidebar';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Apps from './pages/Apps';
import AppDetail from './pages/AppDetail';
import NewApp from './pages/NewApp';
import Analytics from './pages/Analytics';
import Billing from './pages/Billing';
import Docs from './pages/Docs';
import Settings from './pages/Settings';
import DeleteAccount from './pages/DeleteAccount';
import HelpSupport from './pages/HelpSupport';
import Feedback from './pages/Feedback';

const PortalLayout = ({ children }) => (
  <div className="flex min-h-screen bg-gray-50">
    <Sidebar />
    <main className="flex-1 overflow-y-auto">{children}</main>
  </div>
);

export const App = () => (
  <BrowserRouter>
    <Toaster position="top-right" toastOptions={{ style: { fontSize: 13, fontWeight: 600 } }} />
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Protected + portal layout */}
      <Route path="/dashboard" element={<ProtectedRoute><PortalLayout><Dashboard /></PortalLayout></ProtectedRoute>} />
      <Route path="/apps" element={<ProtectedRoute><PortalLayout><Apps /></PortalLayout></ProtectedRoute>} />
      <Route path="/apps/new" element={<ProtectedRoute><PortalLayout><NewApp /></PortalLayout></ProtectedRoute>} />
      <Route path="/apps/:appId" element={<ProtectedRoute><PortalLayout><AppDetail /></PortalLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><PortalLayout><Analytics /></PortalLayout></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><PortalLayout><Billing /></PortalLayout></ProtectedRoute>} />
      <Route path="/docs" element={<ProtectedRoute><Docs /></ProtectedRoute>} />
      <Route path="/docs/integration/:guideId" element={<ProtectedRoute><Docs /></ProtectedRoute>} />
      <Route path="/docs/*" element={<ProtectedRoute><Docs /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/:tab" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/delete" element={<ProtectedRoute><DeleteAccount /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
      <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
