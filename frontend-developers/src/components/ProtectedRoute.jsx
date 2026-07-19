import React from 'react';
import { Navigate } from 'react-router-dom';
import { useDevStore } from '../store/devStore';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, developer } = useDevStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Developer must complete mobile verification before accessing the portal
  if (!developer?.mobileVerified) return <Navigate to="/onboarding" replace />;

  return children;
};

export const PublicRoute = ({ children }) => {
  const { isAuthenticated, developer } = useDevStore();
  if (isAuthenticated && developer?.mobileVerified) return <Navigate to="/dashboard" replace />;
  return children;
};

export default ProtectedRoute;
