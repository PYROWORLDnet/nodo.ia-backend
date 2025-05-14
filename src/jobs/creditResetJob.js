const cron = require('node-cron');
const { Op } = require('sequelize');
const { Business } = require('../db/init');
const { resetMonthlyCredits } = require('../utils/planLimitService');

/**
 * Reset highlight credits for all businesses on the first day of each month
 */
const resetCreditsJob = cron.schedule('0 0 1 * *', async () => {
  try {
    console.log('Starting monthly credit reset job');

    // Get all businesses with active subscriptions
    const businesses = await Business.findAll({
      where: {
        subscription_tier: ['smart', 'pro'],
        next_credits_reset: {
          [Op.lte]: new Date()
        }
      }
    });

    console.log(`Found ${businesses.length} businesses to reset credits`);

    // Reset credits for each business
    for (const business of businesses) {
      try {
        await resetMonthlyCredits(business.id);
        console.log(`Reset credits for business ${business.id}`);
      } catch (error) {
        console.error(`Error resetting credits for business ${business.id}:`, error);
      }
    }

    console.log('Completed monthly credit reset job');
  } catch (error) {
    console.error('Error in credit reset job:', error);
  }
}, {
  timezone: 'UTC'
});

module.exports = resetCreditsJob; 