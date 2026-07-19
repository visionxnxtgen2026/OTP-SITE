import mongoose from 'mongoose';
import { generateApplicationId } from '../utils/credentialGenerator.js';

// ── Verification settings sub-schema ─────────────────────────────────────────
// Each application has its own isolated authentication configuration.
// Changing settings on one app never affects another.
const verificationSettingsSchema = new mongoose.Schema(
  {
    // Number of digits in the generated verification code
    // Cryptographically secure random — never uses Math.random()
    codeLength: {
      type: Number,
      enum: [4, 5, 6, 7, 8, 10, 12, 16, 20],
      default: 6
    },
    // How long (seconds) a verification code remains valid
    expiry: {
      type: Number,
      enum: [30, 60, 120, 300, 600],
      default: 300  // 5 minutes
    },
    // Maximum incorrect code attempts before the request is auto-rejected
    // 'Unlimited' means no limit is enforced
    maxAttempts: {
      type: String,
      enum: ['3', '5', '10', 'Unlimited'],
      default: 'Unlimited'
    },
    // When true: if an active PENDING request exists for the same user+app,
    // return it instead of creating a duplicate
    duplicateProtection: {
      type: Boolean,
      default: true
    },
    // Minimum seconds that must pass between new requests for the same user
    // Only enforced when duplicateProtection is false
    duplicateRequestDelay: {
      type: Number,
      default: 60
    },
    // Max inbound API requests per minute from developer's server for this app
    rateLimit: {
      type: Number,
      default: 60
    },
    // Request timeout in seconds (how long to wait for user action before auto-expiry)
    requestTimeout: {
      type: Number,
      default: 300
    },
    // Developer webhook URL — called on every status change (APPROVED/REJECTED/EXPIRED/CANCELLED)
    webhookUrl: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    // Foreign key to Developer
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Developer',
      required: true,
      index: true
    },
    // Stable public identifier — safe to share
    applicationId: {
      type: String,
      unique: true,
      default: () => generateApplicationId(28),
      index: true
    },
    applicationName: {
      type: String,
      required: [true, 'Application name is required'],
      trim: true,
      maxlength: [100, 'Application name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    environment: {
      type: String,
      enum: ['production', 'development', 'staging'],
      default: 'production'
    },
    // Optional URL of the application logo (shown in the DDS mobile popup)
    logoUrl: {
      type: String,
      trim: true,
      default: ''
    },
    // Allowed domains for CORS origin restriction (optional per app)
    allowedDomains: [{ type: String, trim: true }],
    // Allowed IP addresses (optional per app)
    allowedIPs: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    // Per-application authentication configuration
    // Changing these only affects this specific application
    verificationSettings: {
      type: verificationSettingsSchema,
      default: () => ({})
    },
    // Aggregate counters (updated on each request for fast reads)
    totalRequests: { type: Number, default: 0 },
    successRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    dailyUsage: { type: Number, default: 0 },
    monthlyUsage: { type: Number, default: 0 },
    totalUsage: { type: Number, default: 0 },
    lastUsageDate: { type: String, default: null },
    freeLimit: { type: Number, default: 5 },
    payAsYouGoEnabled: { type: Boolean, default: false },
    billingStatus: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    }
  },
  { timestamps: true }
);

const Application = mongoose.model('Application', applicationSchema);
export default Application;
