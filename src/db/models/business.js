const { DataTypes } = require('sequelize');
const { sequelize } = require('../index');

const Business = sequelize.define('Business', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  owner_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  business_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  identity_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  verification_token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  verification_token_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reset_token: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reset_token_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  subscription_tier: {
    type: DataTypes.ENUM('free', 'smart', 'pro'),
    allowNull: false,
    defaultValue: 'free'
  },
  stripe_customer_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
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
  cedula: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  idVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  idVerificationDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
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
  patchColor: {
    type: DataTypes.ENUM('grey', 'blue', 'gold', 'none'),
    defaultValue: 'grey',
    field: 'patch_color'
  },
  highlightCredits: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'highlight_credits'
  },
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
  status: {
    type: DataTypes.ENUM('pending_verification', 'active', 'suspended', 'cancelled'),
    defaultValue: 'pending_verification'
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
}, {
  tableName: 'businesses',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Business;