import mongoose from 'mongoose';

const trustedDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    firebaseUid: {
      type: String,
      required: true,
      index: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    trustedDeviceId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    deviceFingerprint: {
      type: String,
      default: 'web-browser'
    },
    fcmToken: {
      type: String,
      default: ''
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const TrustedDevice = mongoose.model('TrustedDevice', trustedDeviceSchema);
export default TrustedDevice;
