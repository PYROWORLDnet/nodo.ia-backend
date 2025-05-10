const { Sequelize } = require('sequelize');
const config = require('../config/database');
require('dotenv').config();

// Set up connection pooling and other performance optimizations
const sequelizeOptions = {
  logging: false,
  pool: {
    max: 20,         // Increased max connections for better concurrency
    min: 5,          // Increased min connections to reduce connection time
    idle: 10000,     // 10 seconds idle time
    acquire: 60000,  // Increased timeout to 1 minute
    evict: 1000      // Run cleanup every second
  },
  retry: {
    max: 3,          // Maximum retry attempts
    timeout: 10000   // Timeout per attempt
  },
  dialectOptions: {
    connectTimeout: 10000, // Connection timeout
    statement_timeout: 60000, // Statement timeout
    idle_in_transaction_session_timeout: 60000 // Transaction timeout
  },
  define: {
    timestamps: true,
    underscored: true, // Use snake_case for all fields
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
};

// Create Sequelize instance with optimized settings
const sequelize = new Sequelize(config.url, {
  ...config.options,
  ...sequelizeOptions,
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Query execution cache
const queryCache = new Map();
const QUERY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Initialize DB connection with retry logic
const initDb = async () => {
  let retries = 0;
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  while (retries < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('Database connection established successfully.');
      
      // Enable the pg_trgm extension for fuzzy text matching if not already enabled
      try {
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
        console.log('PostgreSQL pg_trgm extension enabled for fuzzy text matching');
      } catch (extensionError) {
        console.warn('Could not enable pg_trgm extension:', extensionError.message);
      }
      
      return true;
    } catch (error) {
      retries++;
      console.error(`Database connection attempt ${retries} failed:`, error.message);
      
      if (retries === maxRetries) {
        console.error('Max retries reached, could not connect to database');
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
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
  sequelize,
  clearQueryCache
}; 