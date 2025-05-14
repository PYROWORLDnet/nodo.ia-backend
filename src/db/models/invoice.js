const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Invoice extends Model {
    static associate(models) {
      // Define associations
      Invoice.belongsTo(models.Business, {
        foreignKey: 'business_id',
        as: 'business'
      });
      Invoice.belongsTo(models.Subscription, {
        foreignKey: 'subscription_id',
        as: 'subscription'
      });
    }
  }

  Invoice.init({
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
      allowNull: false,
      references: {
        model: 'subscriptions',
        key: 'id'
      }
    },
    stripe_invoice_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    stripe_payment_intent_id: {
      type: DataTypes.STRING,
      allowNull: true
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
        isIn: [['draft', 'open', 'paid', 'uncollectible', 'void']]
      }
    },
    billing_reason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    invoice_pdf: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hosted_invoice_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    payment_status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unpaid',
      validate: {
        isIn: [['paid', 'unpaid', 'no_payment_required']]
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    period_start: {
      type: DataTypes.DATE,
      allowNull: false
    },
    period_end: {
      type: DataTypes.DATE,
      allowNull: false
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'Invoice',
    tableName: 'invoices',
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
        fields: ['stripe_invoice_id'],
        unique: true
      },
      {
        fields: ['stripe_payment_intent_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['payment_status']
      }
    ]
  });

  return Invoice;
}; 