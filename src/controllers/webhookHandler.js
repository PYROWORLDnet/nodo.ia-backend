const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Business, Subscription, Transaction, Invoice } = require('../db/init');
const { SUBSCRIPTION_PLANS } = require('../config/subscriptionPlans');
const logger = require('../utils/logger');

const updateBusinessLimits = async (business, planId) => {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    logger.error(`Invalid plan ID: ${planId}`);
    return;
  }

  logger.info(`Updating business ${business.id} limits for plan ${planId}:`, {
    listing_limit: plan.listing_limit,
    highlight_credits: plan.highlight_credits
  });

  await business.update({
    subscription_tier: planId,
    listing_limit: plan.listing_limit,
    highlight_credits: plan.highlight_credits,
    stripe_customer_id: business.stripe_customer_id // Preserve the customer ID
  });
};

const handleSubscriptionCreated = async (subscription) => {
  try {
    const { customer, metadata, items, current_period_start, current_period_end } = subscription;
    const businessId = metadata.businessId;
    const planId = metadata.planId || 'smart'; // Default to smart if not specified

    const business = await Business.findByPk(businessId);
    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    // Create subscription record
    await Subscription.create({
      business_id: businessId,
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      status: subscription.status,
      current_period_start: new Date(current_period_start * 1000),
      current_period_end: new Date(current_period_end * 1000),
      amount: items.data[0].price.unit_amount / 100,
      currency: items.data[0].price.currency,
      interval: items.data[0].price.recurring.interval
    });

    // Update business subscription tier and limits
    await updateBusinessLimits(business, planId);

    // Create transaction record
    await Transaction.create({
      business_id: businessId,
      type: 'subscription_new',
      amount: items.data[0].price.unit_amount / 100,
      currency: items.data[0].price.currency,
      status: 'completed',
      stripe_payment_intent_id: subscription.latest_invoice,
      metadata: {
        planId: metadata.planId,
        customerId: customer
      }
    });
  } catch (error) {
    logger.error('Error handling subscription created:', error);
    throw error; // Rethrow to be caught by main handler
  }
};

const handleSubscriptionUpdated = async (subscription) => {
  try {
    const { metadata, current_period_start, current_period_end, items } = subscription;
    const planId = metadata?.planId || 'smart';
    
    // Update subscription record
    await Subscription.update({
      plan_id: planId,
      status: subscription.status,
      current_period_start: new Date(current_period_start * 1000),
      current_period_end: new Date(current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      amount: items.data[0].price.unit_amount / 100,
      currency: items.data[0].price.currency,
      interval: items.data[0].price.recurring.interval
    }, {
      where: { stripe_subscription_id: subscription.id }
    });

    // If plan changed, update business subscription tier and limits
    if (metadata && metadata.businessId) {
      const business = await Business.findByPk(metadata.businessId);
      if (business) {
        await updateBusinessLimits(business, planId);
      }
    }
  } catch (error) {
    logger.error('Error handling subscription updated:', error);
    throw error;
  }
};

const handleSubscriptionDeleted = async (subscription) => {
  try {
    const sub = await Subscription.findOne({
      where: { stripe_subscription_id: subscription.id }
    });

    if (sub) {
      const businessId = sub.business_id;

      // Update subscription status
      await sub.update({
        status: 'canceled',
        canceled_at: new Date()
      });

      // Update business to free tier with corresponding limits
      const business = await Business.findByPk(businessId);
      if (business) {
        await updateBusinessLimits(business, 'free');
      }

      // Create transaction record
      await Transaction.create({
        business_id: businessId,
        subscription_id: sub.id,
        type: 'subscription_cancel',
        amount: 0,
        currency: 'usd',
        status: 'completed',
        metadata: {
          reason: 'subscription_deleted'
        }
      });
    }
  } catch (error) {
    logger.error('Error handling subscription deleted:', error);
    throw error;
  }
};

const handleInvoiceCreated = async (invoice) => {
  try {
    const subscription = await Subscription.findOne({
      where: { stripe_subscription_id: invoice.subscription }
    });

    if (!subscription) {
      logger.error('No subscription found for invoice:', invoice.id);
      return;
    }

    await Invoice.create({
      business_id: subscription.business_id,
      subscription_id: subscription.id,
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      status: invoice.status,
      billing_reason: invoice.billing_reason,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      payment_status: invoice.payment_status,
      subtotal: invoice.subtotal / 100,
      tax: invoice.tax / 100,
      total: invoice.total / 100,
      period_start: new Date(invoice.period_start * 1000),
      period_end: new Date(invoice.period_end * 1000),
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      metadata: invoice.metadata || {}
    });
  } catch (error) {
    logger.error('Error handling invoice created:', error);
    throw error;
  }
};

const handleInvoicePaid = async (invoice) => {
  try {
    const existingInvoice = await Invoice.findOne({
      where: { stripe_invoice_id: invoice.id }
    });

    if (existingInvoice) {
      await existingInvoice.update({
        status: 'paid',
        payment_status: 'paid',
        paid_at: new Date(),
        stripe_payment_intent_id: invoice.payment_intent
      });
    } else {
      // Create new invoice if it doesn't exist
      await handleInvoiceCreated(invoice);
      const newInvoice = await Invoice.findOne({
        where: { stripe_invoice_id: invoice.id }
      });
      if (newInvoice) {
        await newInvoice.update({
          status: 'paid',
          payment_status: 'paid',
          paid_at: new Date()
        });
      }
    }
  } catch (error) {
    logger.error('Error handling invoice paid:', error);
    throw error;
  }
};

const handleInvoicePaymentFailed = async (invoice) => {
  try {
    const existingInvoice = await Invoice.findOne({
      where: { stripe_invoice_id: invoice.id }
    });

    if (existingInvoice) {
      await existingInvoice.update({
        payment_status: 'unpaid',
        metadata: {
          ...existingInvoice.metadata,
          last_payment_error: invoice.last_payment_error?.message
        }
      });
    }

    // Update subscription status
    const subscription = await Subscription.findOne({
      where: { stripe_subscription_id: invoice.subscription }
    });

    if (subscription) {
      await subscription.update({
        status: 'past_due'
      });
    }
  } catch (error) {
    logger.error('Error handling invoice payment failed:', error);
    throw error;
  }
};

const handleCustomerCreated = async (customer) => {
  try {
    const { metadata } = customer;
    if (metadata && metadata.businessId) {
      await Business.update(
        { stripe_customer_id: customer.id },
        { where: { id: metadata.businessId } }
      );
    }
  } catch (error) {
    logger.error('Error handling customer created:', error);
    throw error;
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    // Debug information
    logger.debug('Webhook Debug Info:', {
      hasSecret: !!webhookSecret,
      hasSignature: !!sig,
      rawBodyLength: req.rawBody ? req.rawBody.length : 'No raw body',
      contentType: req.headers['content-type']
    });
    
    if (!webhookSecret) {
      throw new Error('Webhook secret is not configured');
    }

    // Verify signature
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      webhookSecret
    );
    
    logger.info('Webhook event verified successfully:', event.type);
  } catch (err) {
    logger.error('Webhook Error:', err);
    if (!webhookSecret) {
      logger.error('STRIPE_WEBHOOK_SECRET is not set in environment variables');
    }
    if (!sig) {
      logger.error('No stripe-signature header found');
    }
    if (!req.rawBody) {
      logger.error('No raw body available');
    }
    return res.status(400).json({ 
      success: false, 
      error: err.message,
      debug: {
        hasSecret: !!webhookSecret,
        hasSignature: !!sig,
        hasRawBody: !!req.rawBody,
        contentType: req.headers['content-type']
      }
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;

      // Log but don't process these events
      case 'charge.succeeded':
      case 'payment_method.attached':
      case 'payment_intent.succeeded':
      case 'payment_intent.created':
      case 'invoice.finalized':
      case 'invoice.updated':
      case 'invoice.payment_succeeded':
        logger.info(`Received ${event.type} event:`, event.data.object.id);
        break;

      default:
        logger.info('Unhandled event type:', event.type);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

async function handleCheckoutComplete(session) {
  logger.info('Processing checkout.session.completed');
  const businessId = session.metadata.businessId;
  const planId = session.metadata.planId || 'smart'; // Default to smart if not specified
  
  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  logger.info(`Updating subscription for business ${businessId} to plan ${planId}`);

  // Create or update subscription
  const subscription = await Subscription.upsert({
    business_id: businessId,
    stripe_subscription_id: session.subscription,
    plan_id: planId,
    status: 'active',
    current_period_start: new Date(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    amount: session.amount_total / 100, // Convert from cents
    currency: session.currency
  });

  // Update business subscription tier and limits
  await updateBusinessLimits(business, planId);

  logger.info(`Successfully updated subscription for business ${businessId}`);
  return subscription;
}

module.exports = {
  handleWebhook
}; 