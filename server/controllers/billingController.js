import Developer from '../models/developerModel.js';
import { Invoice, DailyUsage, Payment } from '../models/billingModel.js';
import stripeService from '../services/stripeService.js';
import billingService, { getDeveloperLocalDate, getNextResetTime } from '../services/billingService.js';
import PDFDocument from 'pdfkit';
import Configuration from '../models/configModel.js';

// Conversion helpers
const paiseToDec = (paise) => (paise / 100).toFixed(2);

/**
 * GET /api/developer/billing-config
 * Dynamic public config endpoint returning dynamic billing thresholds and options
 */
export const getPublicConfig = async (req, res, next) => {
  try {
    const freeRequestsPerDay = Number(await Configuration.getVal('dailyFreeRequests', 5));
    const pricePerRequestPaise = Number(await Configuration.getVal('authRequestPricePaise', 50));
    const invoiceGracePeriodDays = Number(await Configuration.getVal('monthlyGracePeriodDays', 7));
    const currency = await Configuration.getVal('billingCurrency', 'INR');
    const stripePublicKey = await Configuration.getVal('stripePublicKey', '');
    const pricePerRequestRupees = Number(paiseToDec(pricePerRequestPaise));

    res.status(200).json({
      success: true,
      config: {
        freeRequestsPerDay,
        pricePerRequest: pricePerRequestRupees,
        pricePerRequestPaise,
        invoiceGracePeriodDays,
        billingCycleDays: 30,
        currency,
        stripePublicKey
      },
      freeRequestsPerDay,
      pricePerRequestPaise,
      pricePerRequestRupees,
      gracePeriodDays: invoiceGracePeriodDays
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dev/billing/summary
 * Returns developer usage statistics, metered costs, outstanding charges, and payment statuses
 */
export const getBillingSummary = async (req, res, next) => {
  try {
    const devId = req.developer._id;
    const dev = await Developer.findById(devId);
    if (!dev) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }

    const today = getDeveloperLocalDate(dev.timezone || 'Asia/Kolkata');
    const currentMonth = today.slice(0, 7);

    // Fetch configurations from MongoDB
    const freeRequestsPerDay = Number(await Configuration.getVal('dailyFreeRequests', 5));
    const pricePerRequestPaise = Number(await Configuration.getVal('authRequestPricePaise', 50));
    const gracePeriodDays = Number(await Configuration.getVal('monthlyGracePeriodDays', 7));
    const pricePerRequestRupees = paiseToDec(pricePerRequestPaise);

    // Fetch daily usage for today (across all applications)
    const dailyLogs = await DailyUsage.find({ developerId: devId, date: today });
    const todayTotal = dailyLogs.reduce((sum, log) => sum + (log.requestCount || 0), 0);
    const todayFree = dailyLogs.reduce((sum, log) => sum + (log.freeRequestsUsed || 0), 0);
    const todayPaid = dailyLogs.reduce((sum, log) => sum + (log.paidRequestsUsed || 0), 0);
    const remainingFree = Math.max(0, freeRequestsPerDay - todayTotal);

    const nextResetTime = getNextResetTime(dev.timezone || 'Asia/Kolkata');

    // Fetch billing cycle logs
    const currentInvoice = await Invoice.findOne({ developerId: devId, billingMonth: currentMonth });
    const currentMonthUsage = (currentInvoice?.freeRequests || 0) + (currentInvoice?.paidRequests || 0);
    const paidRequestsThisMonth = currentInvoice?.paidRequests || 0;
    const currentBill = currentInvoice?.total || 0;

    // Fetch outstanding balance
    const outstandingInvoices = await Invoice.find({
      developerId: devId,
      status: { $in: ['pending', 'payment_pending', 'overdue'] }
    });
    const outstandingTotal = outstandingInvoices.reduce((sum, inv) => sum + inv.total, 0);

    const paymentPendingInvoice = outstandingInvoices.find(inv => inv.status === 'payment_pending');
    let gracePeriodActive = false;
    let graceDaysRemaining = 0;
    if (paymentPendingInvoice && paymentPendingInvoice.gracePeriodExpiresAt) {
      gracePeriodActive = true;
      graceDaysRemaining = Math.max(0, Math.ceil((paymentPendingInvoice.gracePeriodExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextInvoiceDate = lastDayOfMonth.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });

    const recentPayments = await Payment.find({ developerId: devId })
      .sort({ createdAt: -1 })
      .limit(5);

    const currentRequestRate = todayTotal > 0 ? `${(todayTotal / 86400).toFixed(4)} req/s` : '0.0000 req/s';

    res.status(200).json({
      success: true,
      summary: {
        freeRequestsPerDay,
        pricePerRequestPaise,
        pricePerRequestRupees,
        gracePeriodDays,
        todayFree,
        todayPaid,
        todayTotal,
        remainingFree,
        nextResetTime: nextResetTime.toISOString(),
        currentMonthUsage,
        paidRequestsThisMonth,
        currentBillRupees: paiseToDec(currentBill),
        outstandingRupees: paiseToDec(outstandingTotal),
        nextInvoiceDate,
        billingStatus: dev.billingStatus || 'active',
        status: dev.status || 'active',
        paymentMethod: dev.paymentMethod || null,
        paymentMethodStatus: dev.paymentMethodId ? 'attached' : 'none',
        gracePeriodActive,
        graceDaysRemaining,
        currentRequestRate,
        recentPayments: recentPayments.map(p => ({
          paymentId: p.paymentId,
          amountRupees: paiseToDec(p.amount),
          status: p.status,
          paidAt: p.paidAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dev/billing/invoices
 */
export const getInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ developerId: req.developer._id })
      .sort({ billingMonth: -1 });

    res.status(200).json({
      success: true,
      invoices: invoices.map((inv) => ({
        invoiceId: inv.invoiceId,
        billingMonth: inv.billingMonth,
        freeRequests: inv.freeRequests,
        paidRequests: inv.paidRequests,
        totalRupees: paiseToDec(inv.total),
        status: inv.status,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dev/billing/usage/daily
 */
export const getDailyUsage = async (req, res, next) => {
  try {
    const devId = req.developer._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageLogs = await DailyUsage.find({
      developerId: devId,
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    res.status(200).json({
      success: true,
      dailyData: usageLogs.map((log) => ({
        date: log.date,
        requests: log.requestCount,
        free: log.freeRequestsUsed,
        paid: log.paidRequestsUsed,
        costRupees: paiseToDec(log.cost)
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dev/billing/create-setup-intent
 * Generates SetupIntent client secret for card onboarding on client
 */
export const createSetupIntent = async (req, res, next) => {
  try {
    const dev = await Developer.findById(req.developer._id);
    if (!dev) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }

    if (!dev.stripeCustomerId) {
      const customerId = await stripeService.createCustomer(dev.email, dev.displayName || dev.company);
      dev.stripeCustomerId = customerId;
      await dev.save();
    }

    const setupIntent = await stripeService.createSetupIntent(dev.stripeCustomerId);
    res.status(200).json({
      success: true,
      clientSecret: setupIntent.client_secret
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dev/billing/attach-payment-method
 * Saves Stripe Payment Method ID and sets it default
 */
export const attachPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.body;
    if (!paymentMethodId) {
      return res.status(400).json({ success: false, message: 'Missing paymentMethodId' });
    }

    const dev = await Developer.findById(req.developer._id);
    if (!dev) {
      return res.status(404).json({ success: false, message: 'Developer not found' });
    }

    if (!dev.stripeCustomerId) {
      const customerId = await stripeService.createCustomer(dev.email, dev.displayName || dev.company);
      dev.stripeCustomerId = customerId;
      await dev.save();
    }

    const pm = await stripeService.attachPaymentMethod(dev.stripeCustomerId, paymentMethodId);
    
    // Sync local details for developer visibility
    const card = pm.card || {};
    dev.paymentMethodId = paymentMethodId;
    dev.paymentMethod = {
      brand: card.brand || 'Card',
      last4: card.last4 || '4242',
      expMonth: card.exp_month || 12,
      expYear: card.exp_year || 2028
    };
    dev.billingStatus = 'active';
    await dev.save();

    res.status(200).json({
      success: true,
      message: 'Payment method successfully attached.',
      paymentMethod: dev.paymentMethod
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/dev/billing/payment-method
 * Removes current developer payment method
 */
export const removePaymentMethod = async (req, res, next) => {
  try {
    const dev = await Developer.findById(req.developer._id);
    if (dev.paymentMethodId) {
      await stripeService.detachPaymentMethod(dev.paymentMethodId);
    }
    dev.paymentMethodId = undefined;
    dev.paymentMethod = undefined;
    await dev.save();

    res.status(200).json({
      success: true,
      message: 'Payment method successfully removed.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dev/billing/create-portal-session
 */
export const createPortalSession = async (req, res, next) => {
  try {
    const devId = req.developer._id;
    const dev = await Developer.findById(devId);

    if (!dev.stripeCustomerId) {
      const customerId = await stripeService.createCustomer(dev.email, dev.displayName || dev.company);
      dev.stripeCustomerId = customerId;
      await dev.save();
    }

    const devPortalUrl = process.env.DEV_PORTAL_URL || 'http://localhost:5174';
    const returnUrl = `${devPortalUrl}/billing`;

    const session = await stripeService.createPortalSession(dev.stripeCustomerId, returnUrl);

    res.status(200).json({
      success: true,
      url: session.url
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dev/billing/stripe/webhook
 * Handles dynamic production webhook updates
 */
export const stripeWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = await Configuration.getVal('stripeWebhookSecret', process.env.STRIPE_WEBHOOK_SECRET);

  let event;
  try {
    event = await stripeService.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`[Stripe Webhook] Verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook Event Received] ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const invoiceId = session.metadata?.invoiceId;
        if (invoiceId) {
          await billingService.markInvoicePaid(invoiceId, session.payment_intent || session.id);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoiceId;
        if (invoiceId) {
          await billingService.markInvoicePaid(invoiceId, paymentIntent.id);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const invoiceId = paymentIntent.metadata?.invoiceId;
        if (invoiceId) {
          await billingService.startGracePeriod(invoiceId);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const inv = event.data.object;
        const invoiceId = inv.metadata?.invoiceId || inv.id;
        if (invoiceId) {
          await billingService.markInvoicePaid(invoiceId, inv.payment_intent || inv.id);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        const invoiceId = inv.metadata?.invoiceId || inv.id;
        if (invoiceId) {
          await billingService.startGracePeriod(invoiceId);
        }
        break;
      }
      case 'payment_method.attached': {
        const pm = event.data.object;
        const customerId = pm.customer;
        if (customerId) {
          const dev = await Developer.findOne({ stripeCustomerId: customerId });
          if (dev) {
            const card = pm.card || {};
            dev.paymentMethodId = pm.id;
            dev.paymentMethod = {
              brand: card.brand || 'Card',
              last4: card.last4 || '4242',
              expMonth: card.exp_month || 12,
              expYear: card.exp_year || 2028
            };
            dev.billingStatus = 'active';
            await dev.save();
          }
        }
        break;
      }
      case 'payment_method.detached': {
        const pm = event.data.object;
        const customerId = pm.customer;
        const dev = await Developer.findOne({ stripeCustomerId: customerId });
        if (dev) {
          dev.paymentMethodId = undefined;
          dev.paymentMethod = undefined;
          await dev.save();
        }
        break;
      }
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Processing error for event ${event.type}:`, err.message);
    return res.status(500).send('Webhook Processing Error');
  }

  res.json({ received: true });
};

/**
 * POST /api/dev/billing/stripe/simulate-webhook
 */
export const simulateStripeWebhook = async (req, res, next) => {
  try {
    const { type, invoiceId, paymentIntent } = req.body;

    if (!type || !invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing parameters. type and invoiceId are required.'
      });
    }

    console.log(`[Stripe Simulation Webhook] Triggered event ${type} for invoice ${invoiceId}`);

    switch (type) {
      case 'invoice.payment_succeeded':
        await billingService.markInvoicePaid(invoiceId, paymentIntent || 'pi_simulated_success');
        break;
      case 'invoice.payment_failed':
        await billingService.startGracePeriod(invoiceId);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Simulated event type "${type}" is not supported.`
        });
    }

    res.status(200).json({
      success: true,
      message: `Successfully simulated Stripe event: ${type}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deprecated / Compatible fallbacks
 */
export const payInvoice = async (req, res, next) => {
  res.status(400).json({ success: false, message: 'Direct payment is deprecated. Please attach your card or use billing portal.' });
};

export const createCheckoutSession = async (req, res, next) => {
  res.status(400).json({ success: false, message: 'Checkout redirect is deprecated. Stripe billing portal is enabled.' });
};

export const payInvoiceDirectly = async (req, res, next) => {
  res.status(400).json({ success: false, message: 'Direct payment is deprecated. Stripe charges are handled automatically.' });
};

export const downloadInvoicePdf = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findOne({ invoiceId, developerId: req.developer._id });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoiceId}.pdf`);

    doc.pipe(res);
    doc.fontSize(20).text('DDS DEVELOPER INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice ID: ${invoice.invoiceId}`);
    doc.text(`Billing Period: ${invoice.billingMonth}`);
    doc.text(`Status: ${invoice.status.toUpperCase()}`);
    doc.text(`Issued To: ${req.developer.displayName || req.developer.company || req.developer.email}`);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`);
    if (invoice.paidAt) {
      doc.text(`Paid At: ${new Date(invoice.paidAt).toLocaleDateString()}`);
    }
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(14).text('Usage summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Free requests used: ${invoice.freeRequests}`);
    doc.text(`Paid requests: ${invoice.paidRequests}`);
    doc.text(`Rate per paid request: ₹0.50`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(14).text(`Subtotal: ₹${paiseToDec(invoice.subtotal)}`);
    doc.text(`Tax: ₹${paiseToDec(invoice.tax)}`);
    doc.fontSize(16).text(`Total Amount: ₹${paiseToDec(invoice.total)}`, { bold: true });
    doc.end();
  } catch (error) {
    next(error);
  }
};

export const addOrUpdatePaymentMethod = async (req, res, next) => {
  res.status(400).json({ success: false, message: 'Use attachPaymentMethod' });
};
