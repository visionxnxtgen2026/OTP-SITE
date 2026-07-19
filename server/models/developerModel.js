import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const developerSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    displayName: {
      type: String,
      trim: true
    },
    photoURL: {
      type: String,
      trim: true
    },
    // Verified mobile — globally unique across all developer accounts
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true
    },
    countryCode: { type: String, trim: true },
    countryISO: { type: String, trim: true },
    countryName: { type: String, trim: true },
    mobileVerified: { type: Boolean, default: false },
    phoneVerifiedAt: { type: Date },
    // Developer-specific fields
    developerId: {
      type: String,
      unique: true,
      default: () => `DEV_${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16)}`,
      index: true
    },
    company: { type: String, trim: true },
    website: { type: String, trim: true },
    // Billing-specific fields
    billingStatus: {
      type: String,
      enum: ['active', 'payment_pending', 'overdue'],
      default: 'active'
    },
    paymentMethod: {
      brand: String,
      last4: String,
      expMonth: Number,
      expYear: Number
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
      index: true
    },
    paymentMethodId: {
      type: String,
      trim: true
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata' // Default to India/Kolkata timezone
    },
    authProvider: { type: String, default: 'google' },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active'
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    },
    lastLogin: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const Developer = mongoose.model('Developer', developerSchema);
export default Developer;
