'use strict';

const { SUBSCRIPTION_PLANS } = require('../../config/subscriptionPlans');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create businesses table
    await queryInterface.createTable('businesses', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      owner_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      business_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      identity_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      business_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      business_category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      business_address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      business_phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending_verification'
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      verification_token: {
        type: Sequelize.STRING,
        allowNull: true
      },
      verification_token_expires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      password_reset_token: {
        type: Sequelize.STRING,
        allowNull: true
      },
      password_reset_expires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      stripe_customer_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      subscription_tier: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'free'
      },
      listing_limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: SUBSCRIPTION_PLANS.free.listing_limit
      },
      highlight_credits: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      used_listings: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      next_credits_reset: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      profile_picture_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create subscriptions table
    await queryInterface.createTable('subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'businesses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      stripe_subscription_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      plan_id: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'free'
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active'
      },
      current_period_start: {
        type: Sequelize.DATE,
        allowNull: true
      },
      current_period_end: {
        type: Sequelize.DATE,
        allowNull: true
      },
      canceled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancel_at_period_end: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'usd'
      },
      interval: {
        type: Sequelize.STRING,
        allowNull: true
      },
      trial_end: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Create listings table
    await queryInterface.createTable('listings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'businesses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD'
      },
      category: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      images: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      thumbnail: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      contact_info: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
        defaultValue: []
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('listings', ['business_id']);
    await queryInterface.addIndex('listings', ['category']);
    await queryInterface.addIndex('listings', ['status']);
    await queryInterface.addIndex('listings', ['price']);
    await queryInterface.addIndex('listings', ['tags'], {
      using: 'gin'
    });

    // Businesses indexes
    await queryInterface.addIndex('businesses', ['email'], {
      unique: true,
      name: 'businesses_email_key'
    });
    await queryInterface.addIndex('businesses', ['identity_number'], {
      unique: true,
      name: 'businesses_identity_number_key'
    });
    await queryInterface.addIndex('businesses', ['stripe_customer_id'], {
      unique: true,
      name: 'businesses_stripe_customer_id_key'
    });
    await queryInterface.addIndex('businesses', ['subscription_tier'], {
      name: 'businesses_subscription_tier_idx'
    });
    await queryInterface.addIndex('businesses', ['status'], {
      name: 'businesses_status_idx'
    });
    await queryInterface.addIndex('businesses', ['verification_token'], {
      name: 'businesses_verification_token_idx'
    });

    // Subscriptions indexes
    await queryInterface.addIndex('subscriptions', ['business_id'], {
      name: 'subscriptions_business_id_idx'
    });
    await queryInterface.addIndex('subscriptions', ['stripe_subscription_id'], {
      unique: true,
      name: 'subscriptions_stripe_subscription_id_key'
    });
    await queryInterface.addIndex('subscriptions', ['status'], {
      name: 'subscriptions_status_idx'
    });
    await queryInterface.addIndex('subscriptions', ['plan_id'], {
      name: 'subscriptions_plan_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('listings');
    await queryInterface.dropTable('subscriptions');
    await queryInterface.dropTable('businesses');
  }
}; 