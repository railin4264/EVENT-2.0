const stripe = require('stripe');

class StripeConfig {
  constructor() {
    this.stripe = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        this.stripe = stripe(process.env.STRIPE_SECRET_KEY);
        this.isConfigured = true;
        console.log('✅ Stripe configured successfully');
      } else {
        console.log('⚠️  Stripe not configured - STRIPE_SECRET_KEY not found');
      }
    } catch (error) {
      console.error('❌ Error configuring Stripe:', error.message);
    }
  }

  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        }
      };
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async confirmPaymentIntent(paymentIntentId) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntent: {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            metadata: paymentIntent.metadata,
          }
        };
      } else {
        return {
          success: false,
          error: `Payment not succeeded. Status: ${paymentIntent.status}`
        };
      }
    } catch (error) {
      console.error('Stripe confirm payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured');
    }

    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await this.stripe.refunds.create(refundData);

      return {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason,
        }
      };
    } catch (error) {
      console.error('Stripe refund error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createCustomer(email, name, metadata = {}) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured');
    }

    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });

      return {
        success: true,
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
        }
      };
    } catch (error) {
      console.error('Stripe create customer error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createSetupIntent(customerId) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured');
    }

    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });

      return {
        success: true,
        setupIntent: {
          id: setupIntent.id,
          clientSecret: setupIntent.client_secret,
          status: setupIntent.status,
        }
      };
    } catch (error) {
      console.error('Stripe setup intent error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listPaymentMethods(customerId) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return {
        success: true,
        paymentMethods: paymentMethods.data.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        }))
      };
    } catch (error) {
      console.error('Stripe list payment methods error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async detachPaymentMethod(paymentMethodId) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured');
    }

    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return { success: true };
    } catch (error) {
      console.error('Stripe detach payment method error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Webhook signature verification
  verifyWebhookSignature(payload, signature) {
    if (!this.isConfigured) {
      throw new Error('Stripe is not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return { success: true, event };
    } catch (error) {
      console.error('Stripe webhook verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  isStripeConfigured() {
    return this.isConfigured;
  }
}

module.exports = new StripeConfig();
















