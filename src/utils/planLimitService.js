const { Business } = require('../db/init');
const { SUBSCRIPTION_PLANS } = require('../controllers/subscription');

/**
 * Update business limits based on plan
 * @param {string} businessId - The business ID
 * @param {string} planId - The plan ID (free, smart, pro)
 */
const updatePlanLimits = async (businessId, planId) => {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) {
    throw new Error(`Invalid plan ID: ${planId}`);
  }

  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  // Set next credits reset date to first day of next month
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await business.update({
    listing_limit: plan.limits.listings === -1 ? Number.MAX_SAFE_INTEGER : plan.limits.listings,
    highlight_credits: plan.limits.highlightCredits,
    next_credits_reset: nextMonth
  });
};

/**
 * Reset monthly highlight credits
 * @param {string} businessId - The business ID
 */
const resetMonthlyCredits = async (businessId) => {
  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  const plan = SUBSCRIPTION_PLANS[business.subscription_tier];
  if (!plan) {
    throw new Error(`Invalid plan: ${business.subscription_tier}`);
  }

  // Set next reset date to first day of next month
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await business.update({
    highlight_credits: plan.limits.highlightCredits,
    next_credits_reset: nextMonth
  });
};

/**
 * Check if business can create more listings
 * @param {string} businessId - The business ID
 * @returns {boolean}
 */
const canCreateListing = async (businessId) => {
  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  return business.used_listings < business.listing_limit;
};

/**
 * Check if business can use highlight credits
 * @param {string} businessId - The business ID
 * @param {number} creditsNeeded - Number of credits needed
 * @returns {boolean}
 */
const canUseHighlightCredits = async (businessId, creditsNeeded = 1) => {
  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  return business.highlight_credits >= creditsNeeded;
};

/**
 * Use highlight credits
 * @param {string} businessId - The business ID
 * @param {number} credits - Number of credits to use
 */
const useHighlightCredits = async (businessId, credits = 1) => {
  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  if (business.highlight_credits < credits) {
    throw new Error('Insufficient highlight credits');
  }

  await business.update({
    highlight_credits: business.highlight_credits - credits
  });
};

/**
 * Increment used listings count
 * @param {string} businessId - The business ID
 */
const incrementUsedListings = async (businessId) => {
  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  await business.update({
    used_listings: business.used_listings + 1
  });
};

module.exports = {
  updatePlanLimits,
  resetMonthlyCredits,
  canCreateListing,
  canUseHighlightCredits,
  useHighlightCredits,
  incrementUsedListings
}; 