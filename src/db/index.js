'use strict';

const { Sequelize } = require('sequelize');
const { pool } = require('../config/database');
const UserModel = require('./models/user');

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Initialize models
const User = UserModel(sequelize);

// Force sync in development
const forceSync = process.env.NODE_ENV === 'development' && process.env.FORCE_SYNC === 'true';

// Test the connection and sync models
const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Sequelize database connection established successfully.');

    // Sync all models
    console.log('📦 Syncing database models...');
    if (forceSync) {
      console.log('⚠️ Force syncing database (this will drop existing tables!)');
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync({ alter: true });
    }
    console.log('✅ Database models synced successfully');

    // Verify User model is working
    try {
      await User.findOne({ limit: 1 });
      console.log('✅ User model verified');
    } catch (error) {
      console.error('❌ User model verification failed:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Database helper functions
const db = {
  sequelize,
  User,
  async query(text, params) {
    try {
      const result = await pool.query(text, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  async findOne(text, params) {
    try {
      const result = await pool.query(text, params);
      return result.rows[0];
    } catch (error) {
      console.error('Database findOne error:', error);
      throw error;
    }
  },

  // Category-specific helpers
  vehicles: {
    async search(conditions, params) {
      try {
        const result = await pool.query(`
          SELECT * FROM vehicles 
          WHERE ${conditions}
          ORDER BY created_at DESC
          LIMIT 20
        `, params);
        return result.rows;
      } catch (error) {
        console.error('Vehicle search error:', error);
        throw error;
      }
    }
  },

  products: {
    async search(conditions, params) {
      try {
        const result = await pool.query(`
          SELECT * FROM products 
          WHERE ${conditions}
          ORDER BY created_at DESC
          LIMIT 20
        `, params);
        return result.rows;
      } catch (error) {
        console.error('Product search error:', error);
        throw error;
      }
    }
  },

  real_estate: {
    async search(conditions, params) {
      try {
        const result = await pool.query(`
          SELECT * FROM real_estate 
          WHERE ${conditions}
          ORDER BY created_at DESC
          LIMIT 20
        `, params);
        return result.rows;
      } catch (error) {
        console.error('Real estate search error:', error);
        throw error;
      }
    }
  }
};

// Export database interface
module.exports = {
  db: sequelize,
  User,
  pool,
  initializeDatabase
};