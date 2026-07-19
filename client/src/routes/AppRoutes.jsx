import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import Inbox from '../pages/Inbox';
import Activity from '../pages/Activity';
import AdminPortal from '../pages/AdminPortal';
import VerifyMobile from '../pages/VerifyMobile';
import VerifyMobileOTP from '../pages/VerifyMobileOTP';
import VerifyMobileSuccess from '../pages/VerifyMobileSuccess';
import DeleteAccount from '../pages/DeleteAccount';

// Security Guard & Mobile layout wrapper
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/AppLayout';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Authentication Login screen */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated Routes wrapped in ProtectedRoute & AppLayout chassis persistency */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/verify-mobile" element={<VerifyMobile />} />
                <Route path="/verify-mobile/otp" element={<VerifyMobileOTP />} />
                <Route path="/verify-mobile/success" element={<VerifyMobileSuccess />} />
                <Route path="/delete-account" element={<DeleteAccount />} />
                <Route path="/admin" element={<AdminPortal />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
