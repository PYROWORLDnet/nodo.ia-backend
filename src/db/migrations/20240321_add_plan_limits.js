'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Businesses', 'listing_limit', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 3 // Free plan default
    });

    await queryInterface.addColumn('Businesses', 'highlight_credits', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn('Businesses', 'used_listings', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn('Businesses', 'next_credits_reset', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Businesses', 'listing_limit');
    await queryInterface.removeColumn('Businesses', 'highlight_credits');
    await queryInterface.removeColumn('Businesses', 'used_listings');
    await queryInterface.removeColumn('Businesses', 'next_credits_reset');
  }
}; 