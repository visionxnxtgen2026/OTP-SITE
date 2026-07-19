import express from 'express';
import { protectDeveloper, requireMobileVerified } from '../middleware/developerAuthMiddleware.js';
import {
  developerGoogleLogin,
  developerVerifyPhone,
  getDeveloperProfile,
  updateDeveloperProfile,
  deleteDeveloperAccount
} from '../controllers/developerAuthController.js';
import {
  getApplications,
  createApplication,
  getApplication,
  updateApplication,
  deleteApplication,
  getApiKeys,
  generateApiKey,
  updateApiKey,
  deleteApiKey,
  rotateApiKey,
  updateVerificationSettings
} from '../controllers/developerController.js';
import {
  getOverallAnalytics,
  getAppAnalytics
} from '../controllers/developerAnalyticsController.js';
import {
  getBillingSummary,
  getInvoices,
  payInvoice,
  createCheckoutSession,
  downloadInvoicePdf,
  getDailyUsage,
  getPublicConfig,
  addOrUpdatePaymentMethod,
  removePaymentMethod,
  createPortalSession,
  payInvoiceDirectly,
  simulateStripeWebhook,
  createSetupIntent,
  attachPaymentMethod
} from '../controllers/billingController.js';

const router = express.Router();

// ─── Public routes (no token required) ─────────────────────────────────────────
router.post('/auth/google-login', developerGoogleLogin);
router.get('/config/public', getPublicConfig);

// ─── Authenticated routes (developer JWT required) ────────────────────────────
router.get('/auth/me', protectDeveloper, getDeveloperProfile);
router.patch('/auth/me', protectDeveloper, updateDeveloperProfile);
router.delete('/auth/me', protectDeveloper, deleteDeveloperAccount);
router.post('/auth/verify-phone', protectDeveloper, developerVerifyPhone);

// ─── Applications (requires mobile verification) ──────────────────────────────
router.get('/apps', protectDeveloper, requireMobileVerified, getApplications);
router.post('/apps', protectDeveloper, requireMobileVerified, createApplication);
router.get('/apps/:appId', protectDeveloper, requireMobileVerified, getApplication);
router.patch('/apps/:appId', protectDeveloper, requireMobileVerified, updateApplication);
router.delete('/apps/:appId', protectDeveloper, requireMobileVerified, deleteApplication);
router.delete('/v1/applications/:applicationId', protectDeveloper, requireMobileVerified, deleteApplication);
router.patch('/apps/:appId/settings', protectDeveloper, requireMobileVerified, updateVerificationSettings);

// ─── API Keys per application ─────────────────────────────────────────────────
router.get('/apps/:appId/keys', protectDeveloper, requireMobileVerified, getApiKeys);
router.post('/apps/:appId/keys', protectDeveloper, requireMobileVerified, generateApiKey);
router.patch('/apps/:appId/keys/:keyId', protectDeveloper, requireMobileVerified, updateApiKey);
router.delete('/apps/:appId/keys/:keyId', protectDeveloper, requireMobileVerified, deleteApiKey);
router.post('/apps/:appId/keys/:keyId/rotate', protectDeveloper, requireMobileVerified, rotateApiKey);

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/analytics', protectDeveloper, requireMobileVerified, getOverallAnalytics);
router.get('/apps/:appId/analytics', protectDeveloper, requireMobileVerified, getAppAnalytics);

// ─── Billing (Pay-As-You-Go Stripe) ───────────────────────────────────────────
router.get('/billing/summary', protectDeveloper, getBillingSummary);
router.get('/billing/invoices', protectDeveloper, getInvoices);
router.get('/billing/usage/daily', protectDeveloper, getDailyUsage);
router.post('/billing/pay/:invoiceId', protectDeveloper, payInvoice);
router.post('/billing/create-checkout-session', protectDeveloper, createCheckoutSession);
router.get('/billing/invoices/:invoiceId/pdf', protectDeveloper, downloadInvoicePdf);
router.post('/billing/payment-method', protectDeveloper, addOrUpdatePaymentMethod);
router.delete('/billing/payment-method', protectDeveloper, removePaymentMethod);
router.post('/billing/create-portal-session', protectDeveloper, createPortalSession);
router.post('/billing/pay-direct/:invoiceId', protectDeveloper, payInvoiceDirectly);
router.post('/billing/stripe/simulate-webhook', protectDeveloper, simulateStripeWebhook);
router.post('/billing/create-setup-intent', protectDeveloper, createSetupIntent);
router.post('/billing/attach-payment-method', protectDeveloper, attachPaymentMethod);

export default router;
