const { Business, Subscription, Transaction } = require('../db/init');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Op } = require('sequelize');
const { 
  createCheckoutSession, 
  cancelSubscription, 
  reactivateSubscription: reactivateStripeSubscription,
  changeSubscriptionPlan,
  getSubscriptionPlans
} = require('../utils/stripeService');
const { subscriptionConfirmationEmail } = require('../utils/emailTemplates');
const { sendEmail } = require('../utils/emailService');

// Subscription plan configurations
const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free Plan',
    price: 0,
    features: [
      'Basic business profile',
      'Up to 3 listings',
      'Basic analytics'
    ],
    limits: {
      listings: 3,
      highlightCredits: 0,
      patchColor: 'grey'
    }
  },
  smart: {
    name: 'Smart Plan',
    price: 29.99,
    stripePriceId: process.env.STRIPE_SMART_PRICE_ID,
    features: [
      'Everything in Free',
      'Up to 10 listings',
      'Advanced analytics',
      '5 highlight credits/month',
      'Priority support'
    ],
    limits: {
      listings: 10,
      highlightCredits: 5,
      patchColor: 'blue'
    }
  },
  pro: {
    name: 'Pro Plan',
    price: 99.99,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Everything in Smart',
      'Unlimited listings',
      'Full analytics suite',
      '20 highlight credits/month',
      'Premium support',
      'Custom branding'
    ],
    limits: {
      listings: -1, // unlimited
      highlightCredits: 20,
      patchColor: 'gold'
    }
  }
};

/**
 * Get available subscription plans
 */
const getPlans = async (req, res) => {
  try {
    // If user is authenticated, include their current plan
    const currentPlan = req.business ? req.business.subscription_tier : 'free';
    
    return res.json({
      plans: SUBSCRIPTION_PLANS,
      currentPlan
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({ error: 'Failed to get subscription plans' });
  }
};

/**
 * Get current subscription
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: {
        business_id: req.business.id,
        status: { [Op.in]: ['active', 'trialing', 'past_due'] }
      }
    });

    if (!subscription) {
      return res.json({
        subscription: {
          tier: 'free',
          status: 'active',
          features: SUBSCRIPTION_PLANS.free.features,
          limits: SUBSCRIPTION_PLANS.free.limits
        }
      });
    }

    // If subscription exists in Stripe, get additional details
    let stripeSubscription = null;
    if (subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      } catch (stripeError) {
        console.error('Stripe subscription retrieval error:', stripeError);
      }
    }

    return res.json({
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        features: SUBSCRIPTION_PLANS[subscription.tier].features,
        limits: SUBSCRIPTION_PLANS[subscription.tier].limits,
        stripeDetails: stripeSubscription ? {
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
        } : null
      }
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    return res.status(500).json({ error: 'Failed to get current subscription' });
  }
};

/**
 * Get subscription history
 */
const getSubscriptionHistory = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      where: {
        business_id: req.business.id
      },
      order: [['created_at', 'DESC']],
      include: [{
        model: Subscription,
        as: 'subscription'
      }]
    });

    return res.json({ transactions });
  } catch (error) {
    console.error('Get subscription history error:', error);
    return res.status(500).json({ error: 'Failed to get subscription history' });
  }
};

/**
 * Create subscription checkout session
 */
const createSubscriptionCheckout = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!['smart', 'pro'].includes(planId)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const plan = SUBSCRIPTION_PLANS[planId];

    // Validate price ID exists
    if (!plan.stripePriceId) {
      console.error(`Missing Stripe Price ID for plan: ${planId}`);
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'Subscription plans are not properly configured. Please contact support.'
      });
    }

    // Validate price ID format
    if (!plan.stripePriceId.startsWith('price_')) {
      console.error(`Invalid Stripe Price ID format for plan: ${planId}`);
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'Invalid price configuration. Please contact support.'
      });
    }

    // Create or get Stripe customer
    let stripeCustomerId = req.business.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.business.email,
        metadata: {
          businessId: req.business.id
        }
      });
      stripeCustomerId = customer.id;
      await req.business.update({ stripe_customer_id: stripeCustomerId });
    }

    console.log(`Creating checkout session for plan ${planId} with price ID ${plan.stripePriceId}`);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{
        price: plan.stripePriceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/subscription/cancel`,
      metadata: {
        businessId: req.business.id,
        planId: planId
      }
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Create subscription checkout error:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Could not create subscription. Please check plan configuration.',
        details: error.message
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: 'An error occurred while setting up the subscription.'
    });
  }
};

/**
 * Cancel current subscription
 */
const cancelCurrentSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: {
        business_id: req.business.id,
        status: 'active'
      }
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel at period end in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    // Update local subscription status
    await subscription.update({
      status: 'canceled'
    });

    return res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

/**
 * Reactivate cancelled subscription
 */
const reactivateCancelledSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: {
        business_id: req.business.id,
        status: 'canceled'
      }
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No cancelled subscription found' });
    }

    // Reactivate in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    });

    // Update local subscription status
    await subscription.update({
      status: 'active'
    });

    return res.json({ message: 'Subscription reactivated successfully' });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
};

/**
 * Change subscription plan
 */
const changePlan = async (req, res) => {
  try {
    const { newPlanId } = req.body;

    if (!['smart', 'pro'].includes(newPlanId)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const subscription = await Subscription.findOne({
      where: {
        business_id: req.business.id,
        status: 'active'
      }
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Update subscription in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{
        id: subscription.stripeSubscriptionId,
        price: SUBSCRIPTION_PLANS[newPlanId].stripePriceId
      }],
      proration_behavior: 'always_invoice'
    });

    // Update local subscription
    await subscription.update({
      tier: newPlanId
    });

    return res.json({ 
      message: 'Subscription plan updated successfully',
      newPlan: SUBSCRIPTION_PLANS[newPlanId]
    });
  } catch (error) {
    console.error('Change plan error:', error);
    return res.status(500).json({ error: 'Failed to change subscription plan' });
  }
};

module.exports = {
  getPlans,
  getCurrentSubscription,
  getSubscriptionHistory,
  createSubscriptionCheckout,
  cancelCurrentSubscription,
  reactivateCancelledSubscription,
  changePlan
}; 