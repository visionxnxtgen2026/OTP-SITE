import mongoose from 'mongoose';

const apiRequestLogSchema = new mongoose.Schema(
  {
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Developer',
      required: true,
      index: true
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true
    },
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiKey',
      required: true,
      index: true
    },
    // The API endpoint hit
    endpoint: { type: String, required: true },
    method: { type: String, default: 'POST' },
    // SUCCESS or FAILED — only SUCCESS requests incur a cost
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      required: true,
      index: true
    },
    // Cost of this request in paise (₹0.15 = 15 paise)
    cost: {
      type: Number,
      default: 0
    },
    // Response time in milliseconds
    responseTimeMs: { type: Number },
    // IP of the caller application server
    ipAddress: { type: String },
    // High-precision timestamp for time-series queries
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    // No updatedAt needed — logs are immutable
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    // TTL index: auto-delete logs older than 90 days to control storage
    // Remove this if you want permanent logs
    // expireAfterSeconds: 7776000
  }
);

// Compound index for analytics time-range queries
apiRequestLogSchema.index({ developerId: 1, timestamp: -1 });
apiRequestLogSchema.index({ applicationId: 1, timestamp: -1 });
apiRequestLogSchema.index({ apiKeyId: 1, timestamp: -1 });

const ApiRequestLog = mongoose.model('ApiRequestLog', apiRequestLogSchema);
export default ApiRequestLog;
