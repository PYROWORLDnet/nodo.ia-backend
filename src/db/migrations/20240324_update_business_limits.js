const { SUBSCRIPTION_PLANS } = require('../../config/subscriptionPlans');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all businesses
    const businesses = await queryInterface.sequelize.query(
      'SELECT id, subscription_tier FROM businesses',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Update each business with the correct limits based on their subscription tier
    for (const business of businesses) {
      const plan = SUBSCRIPTION_PLANS[business.subscription_tier] || SUBSCRIPTION_PLANS.free;
      await queryInterface.sequelize.query(
        `UPDATE businesses 
         SET listing_limit = ?, highlight_credits = ?
         WHERE id = ?`,
        {
          replacements: [
            plan.listing_limit,
            plan.highlight_credits,
            business.id
          ]
        }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reset all businesses to free plan limits
    await queryInterface.sequelize.query(
      `UPDATE businesses 
       SET listing_limit = ?, highlight_credits = ?`,
      {
        replacements: [
          SUBSCRIPTION_PLANS.free.listing_limit,
          SUBSCRIPTION_PLANS.free.highlight_credits
        ]
      }
    );
  }
}; 