const { Business, Subscription, Transaction } = require('../db');
const { 
  createCheckoutSession, 
  cancelSubscription, 
  reactivateSubscription: reactivateStripeSubscription,
  changeSubscriptionPlan,
  getSubscriptionPlans
} = require('../utils/stripeService');
const { subscriptionConfirmationEmail } = require('../utils/emailTemplates');
const { sendEmail } = require('../utils/emailService');

/**
 * Get available subscription plans
 */
async function getPlans(req, res) {
  try {
    const plans = getSubscriptionPlans();
    return res.status(200).json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({ error: 'Failed to get subscription plans' });
  }
}

/**
 * Get current subscription
 */
async function getCurrentSubscription(req, res) {
  try {
    const { business } = req;

    // Get active subscription
    const subscription = await Subscription.findOne({
      where: {
        businessId: business.id,
        status: 'active'
      },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      subscription: subscription || null,
      currentTier: business.subscriptionTier
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    return res.status(500).json({ error: 'Failed to get current subscription' });
  }
}

/**
 * Get subscription history
 */
async function getSubscriptionHistory(req, res) {
  try {
    const { business } = req;

    // Get all subscriptions
    const subscriptions = await Subscription.findAll({
      where: {
        businessId: business.id
      },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ subscriptions });
  } catch (error) {
    console.error('Get subscription history error:', error);
    return res.status(500).json({ error: 'Failed to get subscription history' });
  }
}

/**
 * Create checkout session for subscription
 */
async function createSubscriptionCheckout(req, res) {
  try {
    const { business } = req;
    const { planId, successUrl, cancelUrl } = req.body;

    if (!planId || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Plan ID, success URL, and cancel URL are required' });
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customer: business.stripeCustomerId,
      planId,
      businessId: business.id,
      successUrl,
      cancelUrl,
      type: 'subscription'
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Create subscription checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

/**
 * Cancel subscription
 */
async function cancelCurrentSubscription(req, res) {
  try {
    const { business } = req;
    const { reason } = req.body;

    // Get active subscription
    const subscription = await Subscription.findOne({
      where: {
        businessId: business.id,
        status: 'active'
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel subscription in Stripe
    await cancelSubscription(subscription.stripeSubscriptionId);

    // Update subscription
    await subscription.update({
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date()
    });

    // Update business tier to free
    await business.update({
      subscriptionTier: 'free'
    });

    return res.status(200).json({
      message: 'Subscription cancelled successfully',
      effectiveDate: subscription.currentPeriodEnd
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({ error: 'Failed to cancel subscription' });
  }
}

/**
 * Reactivate cancelled subscription
 */
async function reactivateCancelledSubscription(req, res) {
  try {
    const { business } = req;

    // Get most recent cancelled subscription
    const subscription = await Subscription.findOne({
      where: {
        businessId: business.id,
        status: 'cancelled'
      },
      order: [['cancelledAt', 'DESC']]
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No cancelled subscription found' });
    }

    // Check if subscription is still within current period
    if (new Date() > new Date(subscription.currentPeriodEnd)) {
      return res.status(400).json({ 
        error: 'Subscription period has ended. Please purchase a new subscription.' 
      });
    }

    // Reactivate subscription in Stripe
    await reactivateStripeSubscription(subscription.stripeSubscriptionId);

    // Update subscription
    await subscription.update({
      status: 'active',
      cancellationReason: null,
      cancelledAt: null
    });

    // Update business tier
    await business.update({
      subscriptionTier: subscription.planId
    });

    return res.status(200).json({
      message: 'Subscription reactivated successfully',
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        status: 'active',
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
}

/**
 * Change subscription plan
 */
async function changePlan(req, res) {
  try {
    const { business } = req;
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({ error: 'New plan ID is required' });
    }

    // Get active subscription
    const subscription = await Subscription.findOne({
      where: {
        businessId: business.id,
        status: 'active'
      }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Change subscription plan in Stripe
    const result = await changeSubscriptionPlan(
      subscription.stripeSubscriptionId, 
      newPlanId
    );

    // Update subscription
    await subscription.update({
      planId: newPlanId,
      amount: result.amount,
      currentPeriodEnd: new Date(result.currentPeriodEnd * 1000) // Convert from Unix timestamp
    });

    // Update business tier
    await business.update({
      subscriptionTier: newPlanId
    });

    // Record transaction
    await Transaction.create({
      businessId: business.id,
      type: 'subscription_change',
      status: 'completed',
      amount: result.prorationAmount || 0,
      currency: 'usd',
      stripePaymentIntentId: result.paymentIntentId,
      metadata: {
        oldPlanId: subscription.planId,
        newPlanId
      }
    });

    // Send confirmation email
    await sendEmail(business.email, subscriptionConfirmationEmail({
      businessName: business.name,
      planName: newPlanId.charAt(0).toUpperCase() + newPlanId.slice(1) + ' Plan',
      amount: (result.amount / 100).toFixed(2),
      startDate: new Date().toLocaleDateString(),
      nextBillingDate: new Date(result.currentPeriodEnd * 1000).toLocaleDateString()
    }));

    return res.status(200).json({
      message: 'Subscription plan changed successfully',
      subscription: {
        id: subscription.id,
        planId: newPlanId,
        amount: result.amount,
        currentPeriodEnd: new Date(result.currentPeriodEnd * 1000)
      }
    });
  } catch (error) {
    console.error('Change subscription plan error:', error);
    return res.status(500).json({ error: 'Failed to change subscription plan' });
  }
}

module.exports = {
  getPlans,
  getCurrentSubscription,
  getSubscriptionHistory,
  createSubscriptionCheckout,
  cancelCurrentSubscription,
  reactivateCancelledSubscription,
  changePlan
}; 