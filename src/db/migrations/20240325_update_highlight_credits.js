const { SUBSCRIPTION_PLANS } = require('../../config/subscriptionPlans');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all businesses
    const businesses = await queryInterface.sequelize.query(
      'SELECT id, subscription_tier FROM businesses',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Update each business with the correct highlight credits based on their subscription tier
    for (const business of businesses) {
      const plan = SUBSCRIPTION_PLANS[business.subscription_tier] || SUBSCRIPTION_PLANS.free;
      await queryInterface.sequelize.query(
        `UPDATE businesses 
         SET highlight_credits = ?
         WHERE id = ? AND highlight_credits < ?`,
        {
          replacements: [
            plan.highlight_credits,
            business.id,
            plan.highlight_credits
          ]
        }
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reset all businesses to free plan highlight credits
    await queryInterface.sequelize.query(
      `UPDATE businesses 
       SET highlight_credits = ?`,
      {
        replacements: [
          SUBSCRIPTION_PLANS.free.highlight_credits
        ]
      }
    );
  }
}; 