const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PromotionCredit = sequelize.define('PromotionCredit', {
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
    // Associated transaction if purchased directly
    transactionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Transactions',
        key: 'id',
      },
    },
    // Credit source
    source: {
      type: DataTypes.ENUM('purchase', 'subscription', 'admin', 'promo', 'referral'),
      allowNull: false,
      defaultValue: 'purchase',
    },
    // Credits added or removed (negative for usage)
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Balance after this transaction
    balanceAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Expiration of credits if applicable
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Note about the credit transaction
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // If credits were used on a listing
    listingId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Listings',
        key: 'id',
      },
    },
    // Status of the credit transaction
    status: {
      type: DataTypes.ENUM('active', 'used', 'expired', 'refunded'),
      defaultValue: 'active',
    },
    // Additional information
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['businessId']
      },
      {
        fields: ['transactionId']
      },
      {
        fields: ['listingId']
      },
      {
        fields: ['expiresAt']
      },
      {
        fields: ['status']
      }
    ]
  });

  return PromotionCredit;
}; 