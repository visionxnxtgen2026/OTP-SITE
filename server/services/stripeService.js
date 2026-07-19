import Stripe from 'stripe';
import Configuration from '../models/configModel.js';
import dotenv from 'dotenv';
dotenv.config();

export const getStripeInstance = async () => {
  const dbKey = await Configuration.getVal('stripeSecretKey', '');
  const key = dbKey || process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
  return {
    stripe: new Stripe(key, { apiVersion: '2023-10-16' }),
    isMock: key === 'sk_test_mock'
  };
};

export const stripeService = {
  /**
   * Create a new Stripe Customer
   */
  createCustomer: async (email, name) => {
    try {
      const { stripe, isMock } = await getStripeInstance();
      if (isMock) {
        return `cus_mock_${Math.random().toString(36).substring(2, 11)}`;
      }
      const customer = await stripe.customers.create({
        email,
        name
      });
      return customer.id;
    } catch (error) {
      console.error('[Stripe Service] Error creating customer:', error.message);
      throw error;
    }
  },

  /**
   * Create a Stripe SetupIntent for developer card onboarding
   */
  createSetupIntent: async (customerId) => {
    try {
      const { stripe, isMock } = await getStripeInstance();
      if (isMock) {
        return {
          id: `seti_mock_${Math.random().toString(36).substring(2, 11)}`,
          client_secret: `seti_mock_secret_${Math.random().toString(36).substring(2, 11)}`
        };
      }
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card']
      });
      return setupIntent;
    } catch (error) {
      console.error('[Stripe Service] Error creating SetupIntent:', error.message);
      throw error;
    }
  },

  /**
   * Attach a payment method to a customer and set it as default
   */
  attachPaymentMethod: async (customerId, paymentMethodId) => {
    try {
      const { stripe, isMock } = await getStripeInstance();
      if (isMock) {
        return {
          id: paymentMethodId,
          card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2028 }
        };
      }
      
      // Attach to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });

      // Update customer invoice default settings
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      return pm;
    } catch (error) {
      console.error('[Stripe Service] Error attaching payment method:', error.message);
      throw error;
    }
  },

  /**
   * Detach a payment method from Stripe
   */
  detachPaymentMethod: async (paymentMethodId) => {
    try {
      const { stripe, isMock } = await getStripeInstance();
      if (isMock) return { success: true };
      await stripe.paymentMethods.detach(paymentMethodId);
      return { success: true };
    } catch (error) {
      console.error('[Stripe Service] Error detaching payment method:', error.message);
      throw error;
    }
  },

  /**
   * Create an invoice item for metered billing usage
   */
  createInvoiceItem: async (customerId, amountPaise, currency = 'inr', description = '') => {
    try {
      const { stripe, isMock } = await getStripeInstance();
      if (isMock) {
        return {
          id: `ii_mock_${Math.random().toString(36).substring(2, 11)}`,
          amount: amountPaise
        };
      }
      const item = await stripe.invoiceItems.create({
        customer: customerId,
        amount: amountPaise,
        currency: currency.toLowerCase(),
        description
      });
      return item;
    } catch (error) {
      console.error('[Stripe Service] Error creating invoice item:', error.message);
      throw error;
    }
  },

  /**
   * Create a Stripe invoice with auto-advance and automatic charge
   */
  createStripeInvoice: async (customerId, metadata = {}) => {
    try {
      const { stripe, isMock } = await getStripeInstance();
      if (isMock) {
        return {
          id: `in_mock_${Math.random().toString(36).substring(2, 11)}`,
          status: 'paid'
        };
      }
      const invoice = await stripe.invoices.create({
        customer: customerId,
        auto_advance: true,
        collection_method: 'charge_automatically',
        metadata
      });
      return invoice;
    } catch (error) {
      console.error('[Stripe Service] Error creating invoice:', error.message);
      throw error;
    }
  },

  /**
   * Create a Stripe Customer Portal session redirect
   */
  createPortalSession: async (customerId, returnUrl) => {
    try {
      const { stripe, isMock } = await getStripeInstance();
      if (isMock) {
        return {
          id: `bps_mock_${Math.random().toString(36).substring(2, 11)}`,
          url: `${returnUrl}?portal_mock=true`
        };
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });
      return session;
    } catch (error) {
      console.error('[Stripe Service] Error creating billing portal session:', error.message);
      throw error;
    }
  },

  /**
   * Verify webhook signatures
   */
  constructEvent: async (rawBody, signature, webhookSecret) => {
    const { stripe, isMock } = await getStripeInstance();
    if (isMock || !webhookSecret) {
      return JSON.parse(rawBody.toString());
    }
    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
};

export default stripeService;
