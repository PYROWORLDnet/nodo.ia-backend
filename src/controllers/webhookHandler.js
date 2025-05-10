const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Business, Subscription, Transaction } = require('../db/init');

const handleSubscriptionCreated = async (subscription) => {
  try {
    const { customer, metadata, items, current_period_start, current_period_end } = subscription;
    const businessId = metadata.businessId;

    // Create subscription record
    await Subscription.create({
      business_id: businessId,
      stripe_subscription_id: subscription.id,
      tier: metadata.planId,
      status: subscription.status,
      current_period_start: new Date(current_period_start * 1000),
      current_period_end: new Date(current_period_end * 1000)
    });

    // Update business subscription tier
    await Business.update(
      { subscription_tier: metadata.planId },
      { where: { id: businessId } }
    );

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
    console.error('Error handling subscription created:', error);
  }
};

const handleSubscriptionUpdated = async (subscription) => {
  try {
    const { metadata, current_period_start, current_period_end } = subscription;
    
    // Update subscription record
    await Subscription.update({
      status: subscription.status,
      current_period_start: new Date(current_period_start * 1000),
      current_period_end: new Date(current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end
    }, {
      where: { stripe_subscription_id: subscription.id }
    });

    // If plan changed, update business subscription tier
    if (metadata && metadata.planId) {
      await Business.update(
        { subscription_tier: metadata.planId },
        { where: { id: metadata.businessId } }
      );
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
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

      // Update business to free tier
      await Business.update(
        { subscription_tier: 'free' },
        { where: { id: businessId } }
      );

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
    console.error('Error handling subscription deleted:', error);
  }
};

const handleInvoicePaid = async (invoice) => {
  try {
    const subscription = await Subscription.findOne({
      where: { stripe_subscription_id: invoice.subscription }
    });

    if (subscription) {
      // Create transaction record
      await Transaction.create({
        business_id: subscription.business_id,
        subscription_id: subscription.id,
        type: 'subscription_renewal',
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'completed',
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent,
        metadata: {
          invoiceUrl: invoice.hosted_invoice_url
        }
      });
    }
  } catch (error) {
    console.error('Error handling invoice paid:', error);
  }
};

const handleInvoicePaymentFailed = async (invoice) => {
  try {
    const subscription = await Subscription.findOne({
      where: { stripe_subscription_id: invoice.subscription }
    });

    if (subscription) {
      // Update subscription status
      await subscription.update({
        status: 'past_due'
      });

      // Create failed transaction record
      await Transaction.create({
        business_id: subscription.business_id,
        subscription_id: subscription.id,
        type: 'subscription_renewal',
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: 'failed',
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent,
        metadata: {
          failureMessage: invoice.last_payment_error?.message
        }
      });
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

module.exports = {
  handleWebhook
}; 