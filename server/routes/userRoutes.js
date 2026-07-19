import express from 'express';
import { 
  verifyPhone, 
  getProfile, 
  updateSettings,
  approveVerification,
  rejectVerification,
  getVerificationHistory,
  getAdminStats,
  deleteUserAccount,
  getDeleteAccountStatus,
  startDeleteAccountVerification,
  verifyDeleteAccountOTP
} from '../controllers/userController.js';
import { protect, verifiedOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require JWT authentication
router.use(protect);

router.post('/verify-phone', verifyPhone);
router.get('/profile', getProfile);
router.patch('/settings', verifiedOnly, updateSettings);
router.delete('/account', verifiedOnly, deleteUserAccount);

// Delete Account Verification Session Flow
router.get('/account/delete/status', verifiedOnly, getDeleteAccountStatus);
router.post('/account/delete/start', verifiedOnly, startDeleteAccountVerification);
router.post('/account/delete/verify-otp', verifiedOnly, verifyDeleteAccountOTP);

// Identity Verification approvals & history logs
router.post('/verification-requests/:verificationId/approve', verifiedOnly, approveVerification);
router.post('/verification-requests/:verificationId/reject', verifiedOnly, rejectVerification);
router.get('/verification-history', verifiedOnly, getVerificationHistory);
// Admin Routes
import { adminOnly } from '../middleware/authMiddleware.js';
import {
  getUsers,
  softDeleteUser,
  restoreUser,
  getDevelopers,
  updateDeveloperStatus,
  getAdminInvoices,
  markInvoicePaidAdmin,
  getConfig,
  updateConfig,
  getAuditLogs,
  getDashboardStats
} from '../controllers/adminController.js';

router.get('/admin/users', adminOnly, getUsers);
router.post('/admin/users/:userId/soft-delete', adminOnly, softDeleteUser);
router.post('/admin/users/:userId/restore', adminOnly, restoreUser);
router.get('/admin/developers', adminOnly, getDevelopers);
router.post('/admin/developers/:devId/status', adminOnly, updateDeveloperStatus);
router.get('/admin/invoices', adminOnly, getAdminInvoices);
router.post('/admin/invoices/:invoiceId/mark-paid', adminOnly, markInvoicePaidAdmin);
router.get('/admin/config', adminOnly, getConfig);
router.post('/admin/config', adminOnly, updateConfig);
router.get('/admin/audit-logs', adminOnly, getAuditLogs);
router.get('/admin/dashboard-stats', adminOnly, getDashboardStats);

export default router;
