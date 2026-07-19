import mongoose from 'mongoose';

const configSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    description: {
      type: String
    }
  },
  { timestamps: true }
);

// Helper to ensure default configurations exist in MongoDB
configSchema.statics.ensureDefaultConfigs = async function () {
  try {
    const defaults = [
      { key: 'dailyFreeRequests', value: 5, description: 'Free requests per day' },
      { key: 'authRequestPricePaise', value: 50, description: 'Price per request in paise' },
      { key: 'monthlyGracePeriodDays', value: 7, description: 'Invoice grace period days' },
      { key: 'maxVerificationAttempts', value: 3, description: 'Max verification attempts' },
      { key: 'verificationLockTimeMins', value: 30, description: 'Lockout duration minutes' },
      { key: 'accountDeleteOtpAttempts', value: 3, description: 'Delete OTP attempts' },
      { key: 'billingCurrency', value: 'INR', description: 'Billing currency (INR, USD, etc.)' },
      { key: 'invoiceDay', value: 1, description: 'Billing cycle invoice day of month' },
      { key: 'billingEnabled', value: true, description: 'Enable billing' },
      { key: 'autoSuspend', value: true, description: 'Auto suspend overdue developer accounts' },
      { key: 'taxPercentage', value: 18, description: 'Tax percentage' },
      { key: 'enableSandbox', value: true, description: 'Enable Stripe sandbox/test mode' },
      { key: 'stripePublicKey', value: '', description: 'Stripe Publishable Key' },
      { key: 'stripeSecretKey', value: '', description: 'Stripe Secret Key' },
      { key: 'stripeWebhookSecret', value: '', description: 'Stripe Webhook Secret' }
    ];

    for (const item of defaults) {
      const existing = await this.findOne({ key: item.key });
      if (!existing) {
        await this.create(item);
      }
    }
  } catch (err) {
    console.warn('[ConfigModel] Default config seeding notice:', err.message);
  }
};

// Helper to fetch a key value with fallback
configSchema.statics.getVal = async function (key, defaultValue) {
  try {
    await this.ensureDefaultConfigs();
    const aliasMap = {
      freeRequestsPerDay: 'dailyFreeRequests',
      pricePerRequestPaise: 'authRequestPricePaise',
      pricePerRequest: 'authRequestPricePaise',
      gracePeriodDays: 'monthlyGracePeriodDays',
      invoiceGracePeriodDays: 'monthlyGracePeriodDays',
      verificationAttempts: 'maxVerificationAttempts',
      lockoutDurationMinutes: 'verificationLockTimeMins',
      lockoutMinutes: 'verificationLockTimeMins',
      deleteOtpAttempts: 'accountDeleteOtpAttempts',
      currency: 'billingCurrency'
    };
    const dbKey = aliasMap[key] || key;
    const config = await this.findOne({ key: dbKey });
    return config ? config.value : defaultValue;
  } catch (error) {
    console.error(`[ConfigModel] Error retrieving key ${key}:`, error.message);
    return defaultValue;
  }
};

const Configuration = mongoose.model('Configuration', configSchema);
export default Configuration;
