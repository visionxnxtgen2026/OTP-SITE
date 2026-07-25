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
    // Enterprise log attributes (Part 11)
    authenticationId: { type: String, index: true },
    applicationIdStr: { type: String, index: true },
    country: { type: String, default: 'Unknown' },
    device: { type: String, default: 'Server/SDK' },
    sdkVersion: { type: String, default: '1.0.0' },
    verificationCodeLength: { type: Number, default: 6 },
    expiry: { type: Number, default: 120 },
    userDecision: { type: String, enum: ['Approve', 'Reject', 'Expired', 'Cancelled', 'Pending', 'N/A'], default: 'N/A' },
    // Request status
    status: {
      type: String,
      default: 'SUCCESS',
      index: true
    },
    // Cost of this request in paise (₹0.15 = 15 paise)
    cost: {
      type: Number,
      default: 0
    },
    // Latency / Response time in milliseconds
    latency: { type: Number, default: 0 },
    responseTimeMs: { type: Number, default: 0 },
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
    timestamps: { createdAt: 'createdAt', updatedAt: false }
  }
);

// Compound index for analytics time-range queries
apiRequestLogSchema.index({ developerId: 1, timestamp: -1 });
apiRequestLogSchema.index({ applicationId: 1, timestamp: -1 });
apiRequestLogSchema.index({ apiKeyId: 1, timestamp: -1 });

const ApiRequestLog = mongoose.model('ApiRequestLog', apiRequestLogSchema);
export default ApiRequestLog;
