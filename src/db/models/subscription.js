'use strict';

const { Model, DataTypes } = require('sequelize');
const { SUBSCRIPTION_PLANS } = require('../../config/stripe');

module.exports = (sequelize) => {
  class Subscription extends Model {
    static associate(models) {
      // Define association with Business model
      Subscription.belongsTo(models.Business, {
        foreignKey: 'business_id',
        as: 'business'
      });
    }
  }

  Subscription.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    business_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'businesses',
        key: 'id'
      }
    },
    stripe_subscription_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    plan_id: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['free', 'smart', 'pro']]
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid']]
      }
    },
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: false
    },
    canceled_at: {
      type: DataTypes.DATE
    },
    cancel_at_period_end: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'usd',
      validate: {
        isIn: [['usd']]
      }
    },
    interval: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'month',
      validate: {
        isIn: [['month', 'year']]
      }
    },
    trial_end: {
      type: DataTypes.DATE
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    tableName: 'subscriptions',
    paranoid: true,
    indexes: [
      {
        fields: ['business_id']
      },
      {
        fields: ['stripe_subscription_id']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Subscription;
}; 