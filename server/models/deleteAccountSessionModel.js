import mongoose from 'mongoose';

const deleteAccountSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    // The Firebase Phone Verification ID (sessionInfo)
    firebaseSessionInfo: {
      type: String,
      default: ''
    },
    // Number of failed verification attempts in the current session
    attempts: {
      type: Number,
      default: 0
    },
    // Temporary 30-minute lock timestamp
    lockedUntil: {
      type: Date,
      default: null
    },
    // Daily 24-hour lock timestamp
    dailyLockUntil: {
      type: Date,
      default: null
    },
    // Number of times the user triggered a 30-minute lock today
    lockCountToday: {
      type: Number,
      default: 0
    },
    // Reset timer for daily lockCountToday tracker
    lockCountResetAt: {
      type: Date,
      default: null
    },
    // Mark if mobile ownership has been verified successfully in this session
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const DeleteAccountSession = mongoose.model('DeleteAccountSession', deleteAccountSessionSchema);
export default DeleteAccountSession;
