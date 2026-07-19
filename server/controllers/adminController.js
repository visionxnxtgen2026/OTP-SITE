import User from '../models/userModel.js';
import Developer from '../models/developerModel.js';
import Application from '../models/applicationModel.js';
import { Invoice } from '../models/billingModel.js';
import Configuration from '../models/configModel.js';
import AuditLog from '../models/auditLogModel.js';
import ApiRequestLog from '../models/apiRequestLogModel.js';
import ApiKey from '../models/apiKeyModel.js';

// Helper for converting paise to rupees decimal
const paiseToDec = (paise) => (paise / 100).toFixed(2);

/**
 * Log admin action helper
 */
const logAdminAction = async (admin, action, targetId, targetType, reason, details) => {
  try {
    if (!admin) return;
    await AuditLog.create({
      adminId: admin._id || '000000000000000000000001',
      adminEmail: admin.email || 'admin@dds.internal',
      action,
      targetId,
      targetType,
      reason: reason || 'N/A',
      details
    });
  } catch (err) {
    console.warn('[AuditLog] Non-critical error logging admin action:', err.message);
  }
};

/**
 * GET /api/user/admin/users
 */
export const getUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { email: new RegExp(search, 'i') },
          { phoneNumber: new RegExp(search, 'i') },
          { ddsId: new RegExp(search, 'i') }
        ]
      };
    }
    const users = await User.find(query)
      .select('-password -firebaseUid') // Protect tokens & credentials
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/admin/users/:userId/soft-delete
 */
export const softDeleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.status = 'inactive';
    await user.save();

    // Log admin action
    await logAdminAction(req.user, 'Soft Delete User', user.phoneNumber || user.email, 'user', reason);

    res.status(200).json({ success: true, message: 'User account soft deleted.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/admin/users/:userId/restore
 */
export const restoreUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isDeleted = false;
    user.deletedAt = null;
    user.status = 'active';
    await user.save();

    await logAdminAction(req.user, 'Restore User', user.phoneNumber || user.email, 'user', reason);

    res.status(200).json({ success: true, message: 'User account successfully restored.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/admin/developers
 */
export const getDevelopers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { email: new RegExp(search, 'i') },
          { developerId: new RegExp(search, 'i') }
        ]
      };
    }
    const developers = await Developer.find(query).sort({ createdAt: -1 });

    const enrichedDevs = await Promise.all(
      developers.map(async (dev) => {
        const appCount = await Application.countDocuments({ developerId: dev._id });
        
        // Calculate current month usage count
        const currentMonth = new Date().toISOString().slice(0, 7);
        const invoice = await Invoice.findOne({ developerId: dev._id, billingMonth: currentMonth });
        const requestCount = (invoice?.freeRequests || 0) + (invoice?.paidRequests || 0);

        return {
          id: dev._id,
          developerId: dev.developerId,
          email: dev.email,
          displayName: dev.displayName,
          company: dev.company,
          billingStatus: dev.billingStatus,
          status: dev.status,
          isDeleted: dev.isDeleted,
          appCount,
          currentMonthUsage: requestCount
        };
      })
    );

    res.status(200).json({ success: true, developers: enrichedDevs });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/admin/developers/:devId/status
 */
export const updateDeveloperStatus = async (req, res, next) => {
  try {
    const { devId } = req.params;
    const { status, billingStatus, isDeleted, reason } = req.body;

    const dev = await Developer.findById(devId);
    if (!dev) return res.status(404).json({ success: false, message: 'Developer not found' });

    if (status !== undefined) dev.status = status;
    if (billingStatus !== undefined) dev.billingStatus = billingStatus;
    if (isDeleted !== undefined) {
      dev.isDeleted = isDeleted;
      if (isDeleted) {
        dev.deletedAt = new Date();
      } else {
        dev.deletedAt = null;
      }
    }
    await dev.save();

    await logAdminAction(
      req.user,
      'Update Developer Status',
      dev.developerId,
      'developer',
      reason,
      { status, billingStatus, isDeleted }
    );

    res.status(200).json({ success: true, message: 'Developer status updated successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/admin/invoices
 */
export const getAdminInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find()
      .populate('developerId', 'email displayName developerId')
      .sort({ billingMonth: -1 });

    res.status(200).json({
      success: true,
      invoices: invoices.map((inv) => ({
        invoiceId: inv.invoiceId,
        developerEmail: inv.developerId?.email || 'N/A',
        developerId: inv.developerId?.developerId || 'N/A',
        billingMonth: inv.billingMonth,
        freeRequests: inv.freeRequests,
        paidRequests: inv.paidRequests,
        totalRupees: paiseToDec(inv.total),
        status: inv.status,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/admin/invoices/:invoiceId/mark-paid
 */
export const markInvoicePaidAdmin = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { reason } = req.body;

    const invoice = await Invoice.findOne({ invoiceId });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.stripePaymentIntentId = 'MANUAL_SETTLEMENT_ADMIN';
    await invoice.save();

    // Check if billingStatus overdue needs clearing
    const overdueCount = await Invoice.countDocuments({
      developerId: invoice.developerId,
      status: 'overdue'
    });

    if (overdueCount === 0) {
      await Developer.findByIdAndUpdate(invoice.developerId, {
        billingStatus: 'active'
      });
    }

    await logAdminAction(req.user, 'Mark Invoice Paid', invoiceId, 'invoice', reason);

    res.status(200).json({ success: true, message: 'Invoice marked paid and developer status updated.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/admin/config
 */
/**
 * GET /api/user/admin/config & GET /api/admin/config & GET /api/admin/configuration
 */
/**
 * GET /api/user/admin/config & GET /api/admin/config & GET /api/admin/configuration
 */
export const getConfig = async (req, res, next) => {
  try {
    const configs = await Configuration.find();
    res.status(200).json({
      success: true,
      configs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/admin/config & POST /api/admin/config & POST /api/admin/configuration
 */
export const updateConfig = async (req, res, next) => {
  try {
    console.log("Received Body:", req.body);

    const { configs, reason } = req.body;

    if (!Array.isArray(configs)) {
      console.warn("Validation Error: Configs must be an array.");
      return res.status(400).json({
        success: false,
        message: "Configs must be an array."
      });
    }

    console.log("Array.isArray(req.body.configs) === true verified");

    for (const c of configs) {
      if (c.key && c.value !== undefined) {
        const numVal = !isNaN(Number(c.value)) ? Number(c.value) : c.value;
        await Configuration.findOneAndUpdate(
          { key: c.key },
          { value: numVal },
          { upsert: true, new: true }
        );
      }
    }

    if (req.user) {
      logAdminAction(req.user, 'Update Configuration', 'SYSTEM', 'configuration', reason || 'Admin Settings Update', configs).catch(() => {});
    }

    const updatedConfigs = await Configuration.find();

    return res.status(200).json({
      success: true,
      message: 'Settings saved successfully',
      configs: updatedConfigs
    });
  } catch (error) {
    console.error("[Config Update Error]:", error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to save configuration settings'
    });
  }
};

/**
 * GET /api/user/admin/audit-logs
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/admin/dashboard-stats
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      developersCount,
      applicationsCount,
      deletedAccounts,
      invoices,
      todayRequests
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ mobileVerified: true }),
      Developer.countDocuments(),
      Application.countDocuments(),
      User.countDocuments({ isDeleted: true }),
      Invoice.find(),
      ApiRequestLog.countDocuments({
        timestamp: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
    ]);

    // Calculate revenue & pending
    let monthlyRevenue = 0;
    let pendingBills = 0;

    invoices.forEach((inv) => {
      if (inv.status === 'paid') {
        monthlyRevenue += inv.total;
      } else {
        pendingBills += inv.total;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        developers: developersCount,
        applications: applicationsCount,
        deletedAccounts,
        todayRequests,
        monthlyRevenueRupees: paiseToDec(monthlyRevenue),
        pendingBillsRupees: paiseToDec(pendingBills)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/auth/login
 * Dedicated Admin login verification endpoint
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json({ success: false, message: 'Firebase authentication token is required.' });
    }

    const { getFirebaseAdmin } = await import('../config/firebase.js');
    const { generateToken } = await import('../services/tokenService.js');
    const admin = getFirebaseAdmin();

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(firebaseToken);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }

    const user = await User.findOne({ 
      $or: [{ firebaseUid: decoded.uid }, { email: decoded.email?.toLowerCase() }] 
    });

    if (!user) {
      return res.status(403).json({ success: false, message: 'Access Denied: Admin user account not found.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access Denied: Standard user or developer accounts cannot log into the Admin Portal.' 
      });
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: user._id,
        email: user.email,
        displayName: user.displayName || 'Administrator',
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/user/admin/applications
 * List all developer applications across the platform
 */
export const getApplicationsAdmin = async (req, res, next) => {
  try {
    const apps = await Application.find()
      .populate('developerId', 'email developerId company')
      .sort({ createdAt: -1 });

    const enrichedApps = await Promise.all(
      apps.map(async (app) => {
        const totalRequests = await ApiRequestLog.countDocuments({ appId: app._id });
        return {
          id: app._id,
          appId: app.appId,
          name: app.name,
          description: app.description,
          developerEmail: app.developerId?.email || 'N/A',
          developerId: app.developerId?.developerId || 'N/A',
          status: app.status || 'active',
          isApiEnabled: app.status === 'active',
          totalRequests,
          createdAt: app.createdAt
        };
      })
    );

    res.status(200).json({ success: true, applications: enrichedApps });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/admin/applications/:appId/toggle-status
 */
export const toggleApplicationStatusAdmin = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const { status, reason } = req.body;

    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });

    app.status = status;
    await app.save();

    await logAdminAction(req.user, 'Toggle Application Status', app.name, 'application', reason, { status });

    res.status(200).json({ success: true, message: `Application status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/user/admin/delete-account
 * Permanent deletion of User or Developer account with full cascade
 */
export const deleteAccountAdmin = async (req, res, next) => {
  try {
    const { targetId, targetType, reason } = req.body;

    if (targetType === 'user') {
      const targetUser = await User.findById(targetId);
      if (!targetUser) return res.status(404).json({ success: false, message: 'User not found.' });

      // Clean up Firebase User
      try {
        const { getFirebaseAdmin } = await import('../config/firebase.js');
        await getFirebaseAdmin().auth().deleteUser(targetUser.firebaseUid);
      } catch (e) {
        console.error('[AdminDeleteUser] Firebase cleanup note:', e.message);
      }

      await User.deleteOne({ _id: targetId });
      await logAdminAction(req.user, 'Permanent Delete User', targetUser.email, 'user', reason);

    } else if (targetType === 'developer') {
      const dev = await Developer.findById(targetId);
      if (!dev) return res.status(404).json({ success: false, message: 'Developer not found.' });

      await ApiKey.deleteMany({ developerId: targetId });
      await ApiRequestLog.deleteMany({ developerId: targetId });
      await Application.deleteMany({ developerId: targetId });
      await Invoice.deleteMany({ developerId: targetId });

      try {
        const { getFirebaseAdmin } = await import('../config/firebase.js');
        await getFirebaseAdmin().auth().deleteUser(dev.firebaseUid);
      } catch (e) {
        console.error('[AdminDeleteDev] Firebase cleanup note:', e.message);
      }

      await Developer.deleteOne({ _id: targetId });
      await logAdminAction(req.user, 'Permanent Delete Developer', dev.developerId, 'developer', reason);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid target type specified.' });
    }

    res.status(200).json({ success: true, message: `${targetType} account permanently purged.` });
  } catch (error) {
    next(error);
  }
};
