import Developer from '../models/developerModel.js';
import { Invoice, DailyUsage, Payment } from '../models/billingModel.js';
import stripeService from './stripeService.js';
import Configuration from '../models/configModel.js';

export const getDeveloperLocalDate = (timezone = 'Asia/Kolkata') => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(new Date()); // Returns YYYY-MM-DD
  } catch (err) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(new Date());
  }
};

export const getNextResetTime = (timezone = 'Asia/Kolkata') => {
  try {
    const options = { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(new Date());
    
    const getVal = (type) => parseInt(parts.find(p => p.type === type).value, 10);
    
    const year = getVal('year');
    const month = getVal('month');
    const day = getVal('day');
    
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
    const currentLocal = new Date(Date.UTC(year, month - 1, day, getVal('hour'), getVal('minute'), getVal('second')));
    
    const diffMs = nextDay.getTime() - currentLocal.getTime();
    return new Date(Date.now() + diffMs);
  } catch (err) {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return nextDay;
  }
};

export const billingService = {
  /**
   * Log api usage. Increments the developer's daily count and computes cost.
   * Runs fire-and-forget, returns cost and free/paid status.
   */
  recordUsage: async (developerId, applicationId) => {
    try {
      const dev = await Developer.findById(developerId);
      const today = getDeveloperLocalDate(dev?.timezone || 'Asia/Kolkata'); // YYYY-MM-DD in dev's timezone
      const billingMonth = today.slice(0, 7); // YYYY-MM

      // Calculate total daily requests for this developer across all apps
      const dailyLogs = await DailyUsage.find({ developerId, date: today });
      const totalDailyRequests = dailyLogs.reduce((sum, log) => sum + (log.requestCount || 0), 0);

      const FREE_LIMIT = Number(await Configuration.getVal('dailyFreeRequests', 5));
      const COST_PER_REQUEST = Number(await Configuration.getVal('authRequestPricePaise', 50)); // in paise (₹0.50)
      let cost = 0;
      let isFree = true;

      if (totalDailyRequests < FREE_LIMIT) {
        // Increment free request
        await DailyUsage.findOneAndUpdate(
          { developerId, applicationId, date: today },
          { $inc: { requestCount: 1, freeRequestsUsed: 1 } },
          { upsert: true, new: true }
        );
      } else {
        // Switch to Pay As You Go and charge
        cost = COST_PER_REQUEST;
        isFree = false;
        await DailyUsage.findOneAndUpdate(
          { developerId, applicationId, date: today },
          { $inc: { requestCount: 1, paidRequestsUsed: 1, cost: COST_PER_REQUEST } },
          { upsert: true, new: true }
        );
      }

      // Dynamic grace period for due date
      const gracePeriodDays = Number(await Configuration.getVal('monthlyGracePeriodDays', 7));
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + gracePeriodDays);

      await Invoice.findOneAndUpdate(
        { developerId, billingMonth },
        {
          $inc: {
            freeRequests: isFree ? 1 : 0,
            paidRequests: isFree ? 0 : 1,
            subtotal: cost,
            total: cost
          },
          $setOnInsert: {
            dueDate,
            status: 'pending'
          }
        },
        { upsert: true }
      );

      return { isFree, cost };
    } catch (error) {
      console.error('[Billing Service] Error logging usage:', error.message);
      return { isFree: true, cost: 0 };
    }
  },

  /**
   * Finalize the month-end invoice.
   */
  generateMonthEndInvoice: async (developerId, billingMonth) => {
    try {
      const dev = await Developer.findById(developerId);
      if (!dev) return null;

      let invoice = await Invoice.findOne({ developerId, billingMonth });
      const gracePeriodDays = Number(await Configuration.getVal('monthlyGracePeriodDays', 7));
      const currency = await Configuration.getVal('billingCurrency', 'INR');
      const taxPercentage = Number(await Configuration.getVal('taxPercentage', 18));
      const pricePerRequest = Number(await Configuration.getVal('authRequestPricePaise', 50));
      const billingEnabled = await Configuration.getVal('billingEnabled', true);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + gracePeriodDays);

      if (!invoice) {
        // No usage this month, create an empty invoice anyway
        invoice = await Invoice.create({
          developerId,
          billingMonth,
          freeRequests: 0,
          paidRequests: 0,
          subtotal: 0,
          tax: 0,
          total: 0,
          status: 'paid', // 0 total is auto-paid
          dueDate
        });
      }

      if (invoice.status === 'paid') {
        return invoice;
      }

      // Compute final tax and total
      const subtotal = invoice.subtotal;
      const tax = Math.round(subtotal * (taxPercentage / 100));
      invoice.tax = tax;
      invoice.total = subtotal + tax;
      invoice.dueDate = dueDate;
      await invoice.save();

      // Ensure Stripe Customer exists
      if (!dev.stripeCustomerId) {
        const customerId = await stripeService.createCustomer(dev.email, dev.displayName || dev.company);
        dev.stripeCustomerId = customerId;
        await dev.save();
      }

      // If total > 0, generate Stripe Invoice
      if (invoice.total > 0 && billingEnabled) {
        try {
          // 1. Create Stripe Invoice Item
          const itemDesc = `DDS Phone Authentication Metered Usage - ${billingMonth} (${invoice.paidRequests} billable requests at ${currency} ${(pricePerRequest/100).toFixed(2)} each)`;
          await stripeService.createInvoiceItem(dev.stripeCustomerId, invoice.total, currency, itemDesc);

          // 2. Create Stripe Invoice
          const stripeInv = await stripeService.createStripeInvoice(dev.stripeCustomerId, {
            invoiceId: invoice.invoiceId,
            developerId: developerId.toString(),
            billingMonth
          });

          invoice.stripeInvoiceId = stripeInv.id;
          invoice.status = 'payment_pending'; // invoice created, waiting for webhook charge status
          await invoice.save();

          console.log(`[Billing Service] Created Stripe invoice ${stripeInv.id} for developer ${dev.email}`);
        } catch (stripeErr) {
          console.error(`[Billing Service] Stripe invoicing failed, falling back to local grace period:`, stripeErr.message);
          // Fallback if Stripe errors: set grace period
          invoice.status = 'payment_pending';
          const gracePeriodExpiresAt = new Date();
          gracePeriodExpiresAt.setDate(gracePeriodExpiresAt.getDate() + gracePeriodDays);
          invoice.gracePeriodExpiresAt = gracePeriodExpiresAt;
          await invoice.save();

          dev.billingStatus = 'payment_pending';
          await dev.save();
        }
      } else {
        invoice.status = 'paid';
        await invoice.save();
      }

      return invoice;
    } catch (error) {
      console.error('[Billing Service] Month-end invoice generation error:', error.message);
      throw error;
    }
  },

  /**
   * Mark invoice as paid and reactivate developer
   */
  markInvoicePaid: async (invoiceIdentifier, stripePaymentIntentId) => {
    try {
      const invoice = await Invoice.findOne({
        $or: [{ invoiceId: invoiceIdentifier }, { stripeInvoiceId: invoiceIdentifier }]
      });
      if (!invoice) throw new Error('Invoice not found');

      invoice.status = 'paid';
      invoice.paidAt = new Date();
      if (stripePaymentIntentId) {
        invoice.stripePaymentIntentId = stripePaymentIntentId;
      }
      await invoice.save();

      // Log payment record
      await Payment.create({
        invoiceId: invoice._id,
        developerId: invoice.developerId,
        stripePaymentIntent: stripePaymentIntentId || 'stripe_automated_charge',
        amount: invoice.total,
        status: 'succeeded',
        paidAt: new Date()
      });

      // Reactivate developer if they don't have other overdue invoices
      const overdueCount = await Invoice.countDocuments({
        developerId: invoice.developerId,
        status: 'overdue'
      });

      const pendingCount = await Invoice.countDocuments({
        developerId: invoice.developerId,
        status: 'payment_pending'
      });

      if (overdueCount === 0 && pendingCount === 0) {
        await Developer.findByIdAndUpdate(invoice.developerId, {
          billingStatus: 'active',
          status: 'active'
        });
        console.log(`[Billing Service] Reactivated developer account ${invoice.developerId}`);
      } else if (overdueCount === 0 && pendingCount > 0) {
        await Developer.findByIdAndUpdate(invoice.developerId, {
          billingStatus: 'payment_pending',
          status: 'active'
        });
        console.log(`[Billing Service] Developer account ${invoice.developerId} is active (grace period active)`);
      }

      return invoice;
    } catch (error) {
      console.error('[Billing Service] Error marking invoice paid:', error.message);
      throw error;
    }
  },

  /**
   * Start grace period for payment failures
   */
  startGracePeriod: async (invoiceIdentifier) => {
    try {
      const invoice = await Invoice.findOne({
        $or: [{ invoiceId: invoiceIdentifier }, { stripeInvoiceId: invoiceIdentifier }]
      });
      if (!invoice) throw new Error('Invoice not found');

      const gracePeriodDays = Number(await Configuration.getVal('monthlyGracePeriodDays', 7));

      invoice.status = 'payment_pending';
      const gracePeriodExpiresAt = new Date();
      gracePeriodExpiresAt.setDate(gracePeriodExpiresAt.getDate() + gracePeriodDays);
      invoice.gracePeriodExpiresAt = gracePeriodExpiresAt;
      await invoice.save();

      // Log failed payment record
      await Payment.create({
        invoiceId: invoice._id,
        developerId: invoice.developerId,
        stripePaymentIntent: invoice.stripePaymentIntentId || 'failed_stripe_charge',
        amount: invoice.total,
        status: 'failed',
        paidAt: new Date()
      });

      // Update developer to payment_pending but keep active
      await Developer.findByIdAndUpdate(invoice.developerId, {
        billingStatus: 'payment_pending',
        status: 'active'
      });

      console.warn(`[Billing Service] Grace Period STARTED for developer ${invoice.developerId} (invoice: ${invoice.invoiceId})`);
      return invoice;
    } catch (error) {
      console.error('[Billing Service] Error starting grace period:', error.message);
      throw error;
    }
  },

  /**
   * Mark invoice as overdue and block API access by suspending developer
   */
  markInvoiceOverdue: async (invoiceIdentifier) => {
    try {
      const invoice = await Invoice.findOne({
        $or: [{ invoiceId: invoiceIdentifier }, { stripeInvoiceId: invoiceIdentifier }]
      });
      if (!invoice) throw new Error('Invoice not found');

      invoice.status = 'overdue';
      await invoice.save();

      const autoSuspend = await Configuration.getVal('autoSuspend', true);
      if (autoSuspend) {
        // Set developer billingStatus to overdue and status to suspended
        await Developer.findByIdAndUpdate(invoice.developerId, {
          billingStatus: 'overdue',
          status: 'suspended'
        });
        console.warn(`[Billing Service] Developer account ${invoice.developerId} SUSPENDED due to overdue invoice ${invoice.invoiceId}`);
      } else {
        await Developer.findByIdAndUpdate(invoice.developerId, {
          billingStatus: 'overdue'
        });
      }

      return invoice;
    } catch (error) {
      console.error('[Billing Service] Error marking invoice overdue:', error.message);
      throw error;
    }
  }
};

export default billingService;
