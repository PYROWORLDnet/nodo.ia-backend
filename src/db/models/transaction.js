const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Businesses',
        key: 'id',
      },
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stripeInvoiceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Subscriptions',
        key: 'id',
      },
    },
    type: {
      type: DataTypes.ENUM(
        'subscription_new', 
        'subscription_renewal', 
        'subscription_change',
        'credit_purchase', 
        'refund', 
        'other'
      ),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
      defaultValue: 'pending',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    receiptUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    highlightCredits: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    discountApplied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    discountPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    originalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    isBulkPurchase: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['businessId']
      },
      {
        fields: ['subscriptionId']
      },
      {
        fields: ['type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['stripePaymentIntentId']
      }
    ]
  });

  return Transaction;
}; 