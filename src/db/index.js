const { Sequelize } = require('sequelize');
require('dotenv').config();

// Set up connection pooling and other performance optimizations
const sequelizeOptions = {
  logging: false,
  pool: {
    max: 10,         // Maximum number of connection in pool
    min: 2,          // Minimum number of connection in pool
    idle: 10000,     // The maximum time, in milliseconds, that a connection can be idle before being released
    acquire: 30000,  // The maximum time, in milliseconds, that pool will try to get connection before throwing error
    evict: 10000     // The time interval, in milliseconds, after which sequelize-pool will remove idle connections
  },
  define: {
    timestamps: false, // Don't expect createdAt and updatedAt fields
  }
};

// Connection with SSL for remote databases
const sslOptions = {
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

// Create Sequelize instance - use DATABASE_URL if available, otherwise use individual credentials
const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      ...sequelizeOptions,
      ...sslOptions
    }) 
  : new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ...sequelizeOptions
    });

// Define vehicle model to match the existing database schema
const Vehicle = sequelize.define('vehicle', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  hid: {
    type: Sequelize.STRING,
    unique: true
  },
  brand: {
    type: Sequelize.STRING,
  },
  model: {
    type: Sequelize.STRING,
  },
  engine: {
    type: Sequelize.STRING,
  },
  year: {
    type: Sequelize.STRING, // VARCHAR in the database
  },
  condition: {
    type: Sequelize.STRING,
  },
  use: {
    type: Sequelize.STRING,
  },
  exterior: {
    type: Sequelize.STRING,
  },
  interior: {
    type: Sequelize.STRING,
  },
  price: {
    type: Sequelize.STRING, // VARCHAR in the database
  },
  price_value: {
    type: Sequelize.STRING,
  },
  transmission: {
    type: Sequelize.STRING,
  },
  traction: {
    type: Sequelize.STRING,
  },
  fuel: {
    type: Sequelize.STRING,
  },
  passengers: {
    type: Sequelize.STRING, // VARCHAR in the database
  },
  dealer: {
    type: Sequelize.STRING,
  },
  dealer_telephone: {
    type: Sequelize.TEXT,
  },
  location: {
    type: Sequelize.TEXT,
  },
  address: {
    type: Sequelize.STRING,
  },
  accessories: {
    type: Sequelize.TEXT,
  },
  coordinates: {
    type: Sequelize.STRING,
  },
  detail_url: {
    type: Sequelize.TEXT,
  },
  images_url: {
    type: Sequelize.TEXT,
  },
}, {
  timestamps: false, // Don't expect createdAt and updatedAt fields
  tableName: 'vehicles',
  // Disable model name pluralization - use exactly 'vehicles' as the table name
  freezeTableName: true
});

// Import our models
const UserModel = require('./models/user');
const SearchHistoryModel = require('./models/searchHistory');
const BusinessModel = require('./models/business');
const TeamMemberModel = require('./models/teamMember');
const SubscriptionModel = require('./models/subscription');
const TransactionModel = require('./models/transaction');
const ListingModel = require('./models/listing');
const PromotionCreditModel = require('./models/promotionCredit');
const SearchAnalyticsModel = require('./models/searchAnalytics');

// Initialize models
const User = UserModel(sequelize);
const SearchHistory = SearchHistoryModel(sequelize);
const Business = BusinessModel(sequelize);
const TeamMember = TeamMemberModel(sequelize);
const Subscription = SubscriptionModel(sequelize);
const Transaction = TransactionModel(sequelize);
const Listing = ListingModel(sequelize);
const PromotionCredit = PromotionCreditModel(sequelize);
const SearchAnalytics = SearchAnalyticsModel(sequelize);

// Define relationships
User.hasMany(SearchHistory, { foreignKey: 'userId', as: 'searches' });
SearchHistory.belongsTo(User, { foreignKey: 'userId' });

// Business relationships
Business.hasMany(TeamMember, { foreignKey: 'businessId', as: 'teamMembers' });
TeamMember.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Subscription, { foreignKey: 'businessId', as: 'subscriptions' });
Subscription.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Transaction, { foreignKey: 'businessId', as: 'transactions' });
Transaction.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Listing, { foreignKey: 'businessId', as: 'listings' });
Listing.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(PromotionCredit, { foreignKey: 'businessId', as: 'promotionCredits' });
PromotionCredit.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(SearchAnalytics, { foreignKey: 'businessId', as: 'searchAnalytics' });
SearchAnalytics.belongsTo(Business, { foreignKey: 'businessId' });

// Subscription and Transaction relationship
Subscription.hasMany(Transaction, { foreignKey: 'subscriptionId', as: 'transactions' });
Transaction.belongsTo(Subscription, { foreignKey: 'subscriptionId' });

// Transaction and PromotionCredit relationship
Transaction.hasMany(PromotionCredit, { foreignKey: 'transactionId', as: 'promotionCredits' });
PromotionCredit.belongsTo(Transaction, { foreignKey: 'transactionId' });

// Listing and PromotionCredit relationship
Listing.hasMany(PromotionCredit, { foreignKey: 'listingId', as: 'promotionCredits' });
PromotionCredit.belongsTo(Listing, { foreignKey: 'listingId' });

// Query execution cache
const queryCache = new Map();
const QUERY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Initialize DB connection
const initDb = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Enable the pg_trgm extension for fuzzy text matching if not already enabled
    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      console.log('PostgreSQL pg_trgm extension enabled for fuzzy text matching');
    } catch (extensionError) {
      console.warn('Could not enable pg_trgm extension:', extensionError.message);
      console.warn('Fuzzy text matching will not be available');
    }

    // Sync models with database
    await sequelize.sync({ alter: true });
    console.log('Models synchronized with database');
    
    return { 
      sequelize, 
      Vehicle, 
      User, 
      SearchHistory,
      Business,
      TeamMember,
      Subscription,
      Transaction,
      Listing,
      PromotionCredit,
      SearchAnalytics
    };
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Execute raw SQL queries with caching
const executeRawQuery = async (query, replacements = {}) => {
  // Create a cache key from the query and replacements
  const cacheKey = `${query}_${JSON.stringify(replacements)}`;
  
  // Check cache first
  const cached = queryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < QUERY_CACHE_TTL)) {
    console.log('Query cache hit');
    return cached.results;
  }
  
  try {
    console.time('rawQueryExecution');
    // Add error handling around the query for debugging
    console.log('Executing SQL query:', query);
    
    // Add a query timeout to prevent long-running queries
    const queryPromise = sequelize.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });
    
    // Set a timeout of 5 seconds for the query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout after 5000ms')), 5000);
    });
    
    // Race the promises to implement a timeout
    const results = await Promise.race([queryPromise, timeoutPromise]);
    
    console.log(`Query returned ${results.length} results`);
    console.timeEnd('rawQueryExecution');
    
    // Cache the results
    queryCache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
    
    return results;
  } catch (error) {
    console.error('Error executing raw query:', error);
    // Log the SQL that caused the error
    console.error('Failed SQL:', query);
    throw error;
  }
};

// Clear the query cache
const clearQueryCache = () => {
  const cacheSize = queryCache.size;
  queryCache.clear();
  console.log(`Cleared query cache (${cacheSize} entries)`);
};

module.exports = {
  initDb,
  executeRawQuery,
  Vehicle,
  User,
  SearchHistory,
  Business,
  TeamMember,
  Subscription,
  Transaction,
  Listing,
  PromotionCredit,
  SearchAnalytics,
  sequelize,
  clearQueryCache
}; 