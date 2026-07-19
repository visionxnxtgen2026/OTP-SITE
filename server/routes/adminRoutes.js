import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  adminLogin,
  getUsers,
  softDeleteUser,
  restoreUser,
  getDevelopers,
  updateDeveloperStatus,
  getApplicationsAdmin,
  toggleApplicationStatusAdmin,
  getAdminInvoices,
  markInvoicePaidAdmin,
  getConfig,
  updateConfig,
  getAuditLogs,
  getDashboardStats,
  deleteAccountAdmin
} from '../controllers/adminController.js';

const router = express.Router();

// ─── Public Admin Auth ────────────────────────────────────────────────────────
router.post('/auth/login', adminLogin);

// TODO: Enable secure Admin authentication before production deployment. Current bypass is for local development only.
// Development mode authentication bypass middleware
const devAdminAuthBypass = (req, res, next) => {
  if (!req.user) {
    req.user = {
      _id: '000000000000000000000001',
      email: 'admin@dds.internal',
      displayName: 'Development Admin',
      role: 'admin'
    };
  }
  next();
};

router.use(devAdminAuthBypass);

router.get('/users', getUsers);
router.post('/users/:userId/soft-delete', softDeleteUser);
router.post('/users/:userId/restore', restoreUser);

router.get('/developers', getDevelopers);
router.post('/developers/:devId/status', updateDeveloperStatus);

router.get('/applications', getApplicationsAdmin);
router.post('/applications/:appId/toggle-status', toggleApplicationStatusAdmin);

router.get('/invoices', getAdminInvoices);
router.post('/invoices/:invoiceId/mark-paid', markInvoicePaidAdmin);

router.get('/config', getConfig);
router.post('/config', updateConfig);
router.get('/configuration', getConfig);
router.post('/configuration', updateConfig);
router.get('/configurations', getConfig);
router.post('/configurations', updateConfig);

router.get('/audit-logs', getAuditLogs);
router.get('/dashboard-stats', getDashboardStats);
router.post('/delete-account', deleteAccountAdmin);

export default router;
