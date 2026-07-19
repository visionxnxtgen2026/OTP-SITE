import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: String,
      unique: true,
      default: () => `INV_${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 12)}`,
      index: true
    },
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Developer',
      required: true,
      index: true
    },
    // Month formatted as YYYY-MM
    billingMonth: {
      type: String,
      required: true,
      index: true
    },
    freeRequests: {
      type: Number,
      default: 0
    },
    paidRequests: {
      type: Number,
      default: 0
    },
    subtotal: {
      type: Number,
      default: 0 // stored in paise
    },
    tax: {
      type: Number,
      default: 0 // stored in paise
    },
    total: {
      type: Number,
      default: 0 // stored in paise
    },
    status: {
      type: String,
      enum: ['pending', 'payment_pending', 'paid', 'overdue'],
      default: 'pending',
      index: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    gracePeriodExpiresAt: {
      type: Date
    },
    paidAt: {
      type: Date
    },
    stripeInvoiceId: {
      type: String,
      sparse: true
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true
    }
  },
  { timestamps: true }
);

invoiceSchema.index({ developerId: 1, billingMonth: 1 }, { unique: true });

const dailyUsageSchema = new mongoose.Schema(
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
    // Date formatted as YYYY-MM-DD
    date: {
      type: String,
      required: true,
      index: true
    },
    requestCount: {
      type: Number,
      default: 0
    },
    freeRequestsUsed: {
      type: Number,
      default: 0
    },
    paidRequestsUsed: {
      type: Number,
      default: 0
    },
    cost: {
      type: Number,
      default: 0 // stored in paise
    }
  },
  { timestamps: true }
);

dailyUsageSchema.index({ developerId: 1, date: 1, applicationId: 1 }, { unique: true });

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      default: () => `PAY_${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 12)}`,
      index: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Billing', // References the Invoice model (Billing export)
      required: true,
      index: true
    },
    developerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Developer',
      required: true,
      index: true
    },
    stripePaymentIntent: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true // in paise
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed'],
      default: 'pending'
    },
    paidAt: {
      type: Date
    }
  },
  { timestamps: true }
);

// Retain model names or map to Invoice/DailyUsage/Payment
// We export Billing as Invoice for backward compatibility with import names.
const Billing = mongoose.model('Billing', invoiceSchema); // This is our Invoice
const DailyUsage = mongoose.model('DailyUsage', dailyUsageSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const WalletTransaction = mongoose.model('WalletTransaction', new mongoose.Schema({}, { strict: false })); // Dummy for compatibility

export { Billing as Invoice, Billing, DailyUsage, Payment, WalletTransaction };
export default Billing;
