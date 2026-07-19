import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    adminEmail: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    targetId: {
      type: String,
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: ['user', 'developer', 'invoice', 'configuration'],
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
