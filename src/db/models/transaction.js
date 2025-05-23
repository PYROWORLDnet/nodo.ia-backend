const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Transaction extends Model {
    static associate(models) {
      // Define associations
      Transaction.belongsTo(models.Business, {
        foreignKey: 'business_id',
        as: 'business'
      });
      Transaction.belongsTo(models.Subscription, {
        foreignKey: 'subscription_id',
        as: 'subscription'
      });
    }
  }

  Transaction.init({
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
    subscription_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['subscription_new', 'subscription_renewal', 'subscription_cancel', 'subscription_update', 'subscription_payment_failed']]
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'usd'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['pending', 'completed', 'failed', 'refunded']]
      }
    },
    stripe_payment_intent_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stripe_invoice_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
    underscored: true,
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        fields: ['business_id']
      },
      {
        fields: ['subscription_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['stripe_payment_intent_id']
      },
      {
        fields: ['stripe_invoice_id']
      }
    ]
  });

  return Transaction;
}; 