const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    index: true,
    enum: [
      // Organizer & Moderation
      'organizer_verification_approved',
      'organizer_verification_rejected',
      'organizer_verification_revoked',
      'report_status_updated',
      'content_removed',
      'content_restored',
      // User management
      'user_banned',
      'user_unbanned',
      'user_role_changed',
      'user_password_reset',
      // Security
      'admin_login',
      'failed_login_burst',
      'two_factor_updated',
      // System & Events
      'event_created',
      'event_cancelled',
      'event_featured',
      'support_ticket_status_changed',
      'system_config_updated',
      'other'
    ]
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  actorUsername: {
    type: String,
    default: 'system'
  },
  actorRole: {
    type: String,
    default: 'admin'
  },
  targetType: {
    type: String,
    index: true,
    enum: ['user', 'event', 'report', 'tribe', 'support_ticket', 'system', 'other'],
    default: 'other'
  },
  targetId: {
    type: String,
    default: null
  },
  targetLabel: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success',
    index: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
