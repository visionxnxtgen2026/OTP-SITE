import ApiRequestLog from '../models/apiRequestLogModel.js';
import Application from '../models/applicationModel.js';
import ApiKey from '../models/apiKeyModel.js';

/**
 * Build date range boundaries for aggregation queries.
 */
const getDateRange = (range = '30d') => {
  const now = new Date();
  const from = new Date();
  if (range === '7d') from.setDate(now.getDate() - 7);
  else if (range === '30d') from.setDate(now.getDate() - 30);
  else if (range === '90d') from.setDate(now.getDate() - 90);
  else from.setDate(now.getDate() - 30);
  return { from, to: now };
};

/**
 * GET /api/dev/analytics?range=30d
 * Aggregate usage stats across ALL applications for the developer.
 */
export const getOverallAnalytics = async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const { from, to } = getDateRange(range);
    const devId = req.developer._id;

    const [totals, dailySeries, topApps] = await Promise.all([
      // Aggregate totals
      ApiRequestLog.aggregate([
        { $match: { developerId: devId, timestamp: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            successRequests: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
            failedRequests: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
            totalCostPaise: { $sum: '$cost' }
          }
        }
      ]),
      // Daily time-series
      ApiRequestLog.aggregate([
        { $match: { developerId: devId, timestamp: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            requests: { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      // Top 5 apps by request count
      ApiRequestLog.aggregate([
        { $match: { developerId: devId, timestamp: { $gte: from, $lte: to } } },
        { $group: { _id: '$applicationId', requests: { $sum: 1 } } },
        { $sort: { requests: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'applications',
            localField: '_id',
            foreignField: '_id',
            as: 'app'
          }
        },
        { $unwind: { path: '$app', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            applicationName: '$app.applicationName',
            applicationId: '$app.applicationId',
            requests: 1
          }
        }
      ])
    ]);

    const summary = totals[0] || {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      totalCostPaise: 0
    };

    const dailyData = dailySeries.map((d) => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
      requests: d.requests,
      success: d.success,
      failed: d.failed
    }));

    res.status(200).json({
      success: true,
      range,
      summary: {
        totalRequests: summary.totalRequests,
        successRequests: summary.successRequests,
        failedRequests: summary.failedRequests,
        successRate: summary.totalRequests > 0
          ? Math.round((summary.successRequests / summary.totalRequests) * 100)
          : 0,
        totalCostPaise: summary.totalCostPaise,
        totalCostRupees: (summary.totalCostPaise / 100).toFixed(2)
      },
      dailyData,
      topApps
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dev/apps/:appId/analytics?range=30d
 * Aggregate usage stats for a single application.
 */
export const getAppAnalytics = async (req, res, next) => {
  try {
    const { range = '30d' } = req.query;
    const { from, to } = getDateRange(range);

    const app = await Application.findOne({
      applicationId: req.params.appId,
      developerId: req.developer._id
    });

    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const [totals, dailySeries, keyBreakdown] = await Promise.all([
      ApiRequestLog.aggregate([
        { $match: { applicationId: app._id, timestamp: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            successRequests: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
            failedRequests: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
            totalCostPaise: { $sum: '$cost' }
          }
        }
      ]),
      ApiRequestLog.aggregate([
        { $match: { applicationId: app._id, timestamp: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            requests: { $sum: 1 },
            success: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      // Breakdown per API key
      ApiRequestLog.aggregate([
        { $match: { applicationId: app._id, timestamp: { $gte: from, $lte: to } } },
        { $group: { _id: '$apiKeyId', requests: { $sum: 1 } } },
        {
          $lookup: {
            from: 'apikeys',
            localField: '_id',
            foreignField: '_id',
            as: 'key'
          }
        },
        { $unwind: { path: '$key', preserveNullAndEmptyArrays: true } },
        { $project: { keyLabel: '$key.keyLabel', publicKey: '$key.publicKey', requests: 1 } }
      ])
    ]);

    const summary = totals[0] || { totalRequests: 0, successRequests: 0, failedRequests: 0, totalCostPaise: 0 };

    res.status(200).json({
      success: true,
      application: { applicationId: app.applicationId, applicationName: app.applicationName },
      range,
      summary: {
        ...summary,
        successRate: summary.totalRequests > 0
          ? Math.round((summary.successRequests / summary.totalRequests) * 100)
          : 0,
        totalCostRupees: (summary.totalCostPaise / 100).toFixed(2)
      },
      dailyData: dailySeries.map((d) => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        requests: d.requests,
        success: d.success
      })),
      keyBreakdown
    });
  } catch (error) {
    next(error);
  }
};
