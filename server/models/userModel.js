import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
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
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // Sparse lets multiple profiles have undefined phoneNumber, but validates uniqueness when defined
      trim: true,
      index: true
    },
    ddsId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true
    },
    countryCode: {
      type: String,
      trim: true
    },
    countryISO: {
      type: String,
      trim: true
    },
    countryName: {
      type: String,
      trim: true
    },
    mobileVerified: {
      type: Boolean,
      default: false
    },
    phoneVerifiedAt: {
      type: Date
    },
    authProvider: {
      type: String,
      default: 'google'
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
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
    preferences: {
      language: {
        type: String,
        default: 'en'
      },
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
      },
      notifications: {
        type: Boolean,
        default: true
      }
    },
    lastLogin: {
      type: Date,
      default: Date.now
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

export default User;
