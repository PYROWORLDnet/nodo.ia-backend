const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Business = sequelize.define('Business', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Dominican ID for verification
    cedula: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    // ID verification status
    idVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    idVerificationDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Regular business info
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    logo: {
      type: DataTypes.STRING, // URL to logo image
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Subscription info
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    subscriptionTier: {
      type: DataTypes.ENUM('free', 'smart', 'pro'),
      defaultValue: 'free',
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('active', 'inactive', 'past_due', 'canceled', 'trialing'),
      defaultValue: 'inactive',
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Patch color based on subscription tier
    patchColor: {
      type: DataTypes.ENUM('grey', 'blue', 'gold', 'none'),
      defaultValue: 'grey',
    },
    // Promotion credits
    highlightCredits: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Additional limits
    freeListingLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 3, // Free plan gets 3 listings max
    },
    proHighlightQuota: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // Pro plan gets 3 highlights per month
    },
  }, {
    timestamps: true,
  });

  return Business;
};