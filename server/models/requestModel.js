import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    verificationId: {
      type: String,
      required: [true, 'Verification ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    ddsId: {
      type: String,
      required: [true, 'DDS User ID is required'],
      trim: true,
      index: true
    },
    verificationCode: {
      type: String
    },
    popupDelivered: {
      type: Boolean,
      default: true
    },
    popupDeliveredAt: {
      type: Date,
      default: Date.now
    },
    codeSubmitted: {
      type: Boolean,
      default: false
    },
    codeSubmittedAt: {
      type: Date
    },
    enteredCode: {
      type: String,
      default: ''
    },
    approved: {
      type: Boolean,
      default: false
    },
    userPhoneNumber: {
      type: String,
      trim: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    verificationCodePlain: {
      type: String
    },
    clientName: {
      type: String,
      required: [true, 'Requesting client name is required'],
      trim: true
    },
    clientId: {
      type: String,
      required: [true, 'Requesting client ID is required'],
      trim: true,
      index: true
    },
    location: {
      type: String,
      default: 'Unknown Location'
    },
    device: {
      type: String,
      default: 'Unknown Device'
    },
    // Tracks how many times the user submitted an incorrect verification code.
    // Used to enforce app.verificationSettings.maxAttempts.
    attempts: {
      type: Number,
      default: 0
    },
    // Enforced maximum incorrect entries for this specific request
    maxAttempts: {
      type: String,
      enum: ['3', '5', '10', 'Unlimited'],
      default: 'Unlimited'
    },
    // The length of the verification code requested
    verificationCodeLength: {
      type: Number,
      default: 6
    },
    // Dynamically provided webhook URL for this request
    webhookUrl: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const VerificationRequest = mongoose.model('VerificationRequest', requestSchema);

export default VerificationRequest;
