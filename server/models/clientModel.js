import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      required: [true, 'Client ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    clientSecret: {
      type: String,
      required: [true, 'Client Secret is required']
    },
    clientName: {
      type: String,
      required: [true, 'Client Name is required'],
      trim: true
    },
    apiKey: {
      type: String,
      required: [true, 'API Key is required'],
      unique: true,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

const Client = mongoose.model('Client', clientSchema);

export default Client;
