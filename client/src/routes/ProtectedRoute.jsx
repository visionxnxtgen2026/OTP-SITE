import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Route protection wrapper to guard authenticated views
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, mobileVerified } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect unauthenticated client requests back to Login page
    return <Navigate to="/login" replace />;
  }

  const isVerifyRoute = location.pathname.startsWith('/verify-mobile');
  const isSuccessRoute = location.pathname === '/verify-mobile/success';

  // If the user is authenticated but not mobile verified, force them to verify-mobile
  if (!mobileVerified && !isVerifyRoute) {
    return <Navigate to="/verify-mobile" replace />;
  }

  // If the user is already verified, do not allow access to active verify input/otp screens
  if (mobileVerified && isVerifyRoute && !isSuccessRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
