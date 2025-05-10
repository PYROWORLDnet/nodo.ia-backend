const { sequelize } = require('./index');
const { DataTypes } = require('sequelize');

// Define models
const Business = sequelize.define('Business', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash'
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
  }
}, {
  tableName: 'businesses',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const SearchHistory = sequelize.define('SearchHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  searchQuery: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'search_query'
  },
  searchDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'search_date'
  }
}, {
  tableName: 'search_histories',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'business_id',
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  tier: {
    type: DataTypes.ENUM('free', 'smart', 'pro'),
    defaultValue: 'free'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'past_due', 'canceled', 'trialing'),
    defaultValue: 'inactive'
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripe_customer_id'
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'stripe_subscription_id'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
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
    defaultValue: 3,
    field: 'free_listing_limit'
  },
  proHighlightQuota: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'pro_highlight_quota'
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const TeamMember = sequelize.define('TeamMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'business_id',
    references: {
      model: 'businesses',
      key: 'id'
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'last_name'
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'editor', 'viewer'),
    defaultValue: 'viewer'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending', 'blocked', 'removed', 'invited'),
    defaultValue: 'pending'
  },
  invitationToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'invitation_token'
  },
  invitationExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'invitation_expires'
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reset_password_token'
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_password_expires'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },
  canManageTeam: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_manage_team'
  },
  canManageSubscription: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_manage_subscription'
  },
  canManageProducts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_manage_products'
  },
  canViewAnalytics: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'can_view_analytics'
  },
  currentSessionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'current_session_id'
  }
}, {
  tableName: 'team_members',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define relationships
Business.hasOne(Subscription, { 
  foreignKey: 'business_id',
  as: 'subscription',
  onDelete: 'CASCADE'
});
Subscription.belongsTo(Business, { 
  foreignKey: 'business_id',
  as: 'business'
});

Business.hasMany(TeamMember, { 
  foreignKey: 'business_id',
  as: 'teamMembers',
  onDelete: 'CASCADE'
});
TeamMember.belongsTo(Business, { 
  foreignKey: 'business_id',
  as: 'business'
});

User.hasMany(SearchHistory, {
  foreignKey: 'user_id',
  as: 'searchHistories',
  onDelete: 'CASCADE'
});
SearchHistory.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Function to initialize database
async function initializeDatabase() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Force sync all models with the database in development
    const syncOptions = {
      force: process.env.NODE_ENV === 'development',
      alter: process.env.NODE_ENV !== 'development'
    };
    
    // Sync models in order
    await User.sync(syncOptions);
    await Business.sync(syncOptions);
    await SearchHistory.sync(syncOptions);
    await Subscription.sync(syncOptions);
    await TeamMember.sync(syncOptions);
    
    console.log('Database models synchronized successfully.');

    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

module.exports = {
  Business,
  User,
  SearchHistory,
  Subscription,
  TeamMember,
  initializeDatabase
}; 