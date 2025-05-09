const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
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
    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    planType: {
      type: DataTypes.ENUM('free', 'smart', 'pro'),
      defaultValue: 'free',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'past_due', 'canceled', 'trialing'),
      defaultValue: 'inactive',
    },
    currentPeriodStart: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    currentPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelAtPeriodEnd: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    priceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD',
    },
    interval: {
      type: DataTypes.ENUM('day', 'week', 'month', 'year'),
      defaultValue: 'month',
    },
    listingLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    includesAnalytics: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    monthlyHighlightQuota: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    remainingHighlights: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    promoCreditsDiscount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    patchColor: {
      type: DataTypes.ENUM('grey', 'blue', 'gold', 'none'),
      defaultValue: 'grey',
    },
    displayPriority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
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
        fields: ['stripeSubscriptionId']
      },
      {
        fields: ['planType']
      },
      {
        fields: ['status']
      }
    ]
  });

  return Subscription;
}; 