const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Business = sequelize.define('Business', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'owner_name'
    },
    businessName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'business_name'
    },
    identityNumber: {
      type: DataTypes.STRING(11),
      allowNull: false,
      unique: true,
      field: 'identity_number'
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
      field: 'password'
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
    subscriptionTier: {
      type: DataTypes.ENUM('free', 'smart', 'pro'),
      defaultValue: 'free',
      field: 'subscription_tier'
    },
    status: {
      type: DataTypes.ENUM('pending_verification', 'active', 'suspended', 'cancelled'),
      defaultValue: 'pending_verification'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified'
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'verification_token'
    },
    verificationTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verification_token_expires'
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'password_reset_token'
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'password_reset_expires'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    },
    // Subscription info
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'stripe_customer_id'
    },
    subscriptionStatus: {
      type: DataTypes.ENUM('active', 'inactive', 'past_due', 'canceled', 'trialing'),
      defaultValue: 'inactive',
      field: 'subscription_status'
    },
    subscriptionExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'subscription_expires_at'
    },
    // Patch color based on subscription tier
    patchColor: {
      type: DataTypes.ENUM('grey', 'blue', 'gold', 'none'),
      defaultValue: 'grey',
      field: 'patch_color'
    },
    // Promotion credits
    highlightCredits: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'highlight_credits'
    },
    // Additional limits
    freeListingLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 3, // Free plan gets 3 listings max
      field: 'free_listing_limit'
    },
    proHighlightQuota: {
      type: DataTypes.INTEGER,
      defaultValue: 0, // Pro plan gets 3 highlights per month
      field: 'pro_highlight_quota'
    },
  }, {
    tableName: 'businesses',
    timestamps: true,
    underscored: true
  });

  return Business;
};