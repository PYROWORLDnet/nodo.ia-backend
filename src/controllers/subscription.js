const { Business, Subscription, Transaction, Invoice } = require('../db/init');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Op } = require('sequelize');
const { SUBSCRIPTION_PLANS } = require('../config/stripe');
const { subscriptionConfirmationEmail } = require('../utils/emailTemplates');
const { sendEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * Get available subscription plans
 */
const getPlans = async (req, res) => {
  try {
    // If user is authenticated, get their current plan
    let currentPlan = null;
    if (req.business) {
      const business = await Business.findByPk(req.business.id);
      currentPlan = business.subscription_tier;
    }

    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => ({
      id,
      ...plan,
      is_current: id === currentPlan
    }));

    res.json(plans);
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({ error: 'Failed to get subscription plans' });
  }
};

/**
 * Get current subscription
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const businessId = req.business.id;

    // Get the current subscription
    const subscription = await Subscription.findOne({
      where: {
        business_id: businessId,
        status: ['active', 'trialing'],
      },
      order: [['created_at', 'DESC']]
    });

    // Get the business details
    const business = await Business.findByPk(businessId);

    // Get the plan details
    const currentPlan = SUBSCRIPTION_PLANS[business.subscription_tier];

    const response = {
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        plan_id: subscription.plan_id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        amount: subscription.amount,
        currency: subscription.currency,
        interval: subscription.interval
      } : null,
      current_plan: {
        tier: business.subscription_tier,
        name: currentPlan.name,
        listing_limit: business.listing_limit,
        highlight_credits: business.highlight_credits,
        used_listings: business.used_listings,
        features: currentPlan.features
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting current subscription:', error);
    res.status(500).json({ error: 'Failed to get current subscription' });
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
      return res.status(400).json({ 
        success: false,
        error: 'Invalid plan selected' 
      });
    }

    const plan = SUBSCRIPTION_PLANS[planId];

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

    return res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error('Create subscription checkout error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to create subscription checkout'
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

    if (!subscription || !subscription.stripe_subscription_id) {
      return res.status(404).json({ 
        success: false,
        error: 'No active subscription found' 
      });
    }

    // Cancel at period end in Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true
    });

    // Update local subscription status
    await subscription.update({
      status: 'canceled',
      cancel_at_period_end: true
    });

    // Update business to free tier at end of period
    await req.business.update({
      subscription_tier: 'free'
    });

    return res.json({ 
      success: true,
      message: 'Subscription cancelled successfully' 
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to cancel subscription'
    });
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

/**
 * Get all transactions with pagination and filtering
 */
const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {
      business_id: req.business.id
    };

    // Add type filter
    if (type) {
      where.type = type;
    }

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get transactions with pagination
    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where,
      include: [{
        model: Subscription,
        as: 'subscription',
        attributes: ['plan_id', 'status', 'current_period_start', 'current_period_end']
      }],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return res.json({
      transactions,
      pagination: {
        total: count,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
        hasNextPage,
        hasPreviousPage
      },
      filters: {
        type,
        status,
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Get all transactions error:', error);
    return res.status(500).json({ error: 'Failed to get transactions' });
  }
};

const getInvoiceHistory = async (req, res) => {
  try {
    const businessId = req.business.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: { business_id: businessId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [{
        model: Subscription,
        as: 'subscription',
        attributes: ['plan_id', 'status']
      }]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        invoices: invoices.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount,
          currency: invoice.currency,
          status: invoice.status,
          payment_status: invoice.payment_status,
          billing_reason: invoice.billing_reason,
          invoice_pdf: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url,
          period_start: invoice.period_start,
          period_end: invoice.period_end,
          created_at: invoice.created_at,
          paid_at: invoice.paid_at,
          plan: invoice.subscription?.plan_id || 'unknown',
          subscription_status: invoice.subscription?.status
        })),
        pagination: {
          total: count,
          totalPages,
          currentPage: page,
          limit
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching invoice history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice history'
    });
  }
};

module.exports = {
  getPlans,
  getCurrentSubscription,
  getSubscriptionHistory,
  createSubscriptionCheckout,
  cancelCurrentSubscription,
  reactivateCancelledSubscription,
  changePlan,
  getAllTransactions,
  getInvoiceHistory
}; 