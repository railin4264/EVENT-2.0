const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class AuditService {
  /**
   * Log an administrative or security action asynchronously
   */
  static async log({
    action,
    actor = null,
    actorUsername = null,
    actorRole = 'admin',
    targetType = 'other',
    targetId = null,
    targetLabel = null,
    status = 'success',
    details = {},
    req = null
  }) {
    try {
      let ipAddress = null;
      let userAgent = null;

      if (req) {
        ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null;
        if (Array.isArray(ipAddress)) ipAddress = ipAddress[0];
        if (typeof ipAddress === 'string' && ipAddress.includes(',')) ipAddress = ipAddress.split(',')[0].trim();
        userAgent = req.headers['user-agent'] || null;

        if (!actor && req.user) {
          actor = req.user.id || req.user._id;
          actorUsername = req.user.username;
          actorRole = req.user.role || 'user';
        }
      }

      await AuditLog.create({
        action,
        actor,
        actorUsername: actorUsername || 'system',
        actorRole: actorRole || 'system',
        targetType,
        targetId: targetId ? targetId.toString() : null,
        targetLabel,
        status,
        ipAddress,
        userAgent,
        details
      });
    } catch (error) {
      logger.error('Failed to write audit log:', error);
    }
  }

  /**
   * Query audit logs with pagination and filters
   */
  static async getLogs({
    page = 1,
    limit = 25,
    action,
    targetType,
    status,
    search,
    startDate,
    endDate
  } = {}) {
    const query = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { actorUsername: { $regex: q, $options: 'i' } },
        { targetLabel: { $regex: q, $options: 'i' } },
        { targetId: { $regex: q, $options: 'i' } },
        { ipAddress: { $regex: q, $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', 'username firstName lastName email role avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit statistics for dashboard overview
   */
  static async getStats() {
    const totalCount = await AuditLog.countDocuments();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [recentCount, actionsSummary, statusSummary] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { $gte: last24h } }),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AuditLog.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    return {
      total: totalCount,
      last24h: recentCount,
      actionsSummary,
      statusSummary
    };
  }
}

module.exports = AuditService;
