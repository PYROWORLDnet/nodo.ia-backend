'use strict';

const { pool } = require('../config/database');

// Database helper functions
const db = {
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

// Initialize tables if they don't exist (only in development)
const initializeTables = async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('📦 Creating database tables if they don\'t exist...');

      // Create vehicles table
      await db.query(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id SERIAL PRIMARY KEY,
          hid VARCHAR(32) UNIQUE,
          brand VARCHAR(255),
          model VARCHAR(255),
          engine VARCHAR(255),
          year VARCHAR(255),
          condition VARCHAR(255),
          price VARCHAR(255),
          price_value INTEGER,
          transmission VARCHAR(255),
          fuel VARCHAR(255),
          dealer VARCHAR(255),
          dealer_telephone TEXT,
          location TEXT,
          address TEXT,
          accessories TEXT,
          coordinates TEXT,
          detail_url TEXT,
          images_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Vehicles table ready');

      // Create products table
      await db.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          hid VARCHAR(32) UNIQUE,
          category VARCHAR(255),
          title VARCHAR(255),
          description_text TEXT,
          availability VARCHAR(255),
          price VARCHAR(255),
          price_value INTEGER,
          availability_in_clubs TEXT,
          delivery_options TEXT,
          specifications TEXT,
          detail_url TEXT,
          images_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Products table ready');

      // Create real_estate table
      await db.query(`
        CREATE TABLE IF NOT EXISTS real_estate (
          id SERIAL PRIMARY KEY,
          hid VARCHAR(32) UNIQUE,
          title TEXT,
          price TEXT,
          price_value INTEGER,
          bedroom TEXT,
          bathroom TEXT,
          area TEXT,
          parking TEXT,
          agent TEXT,
          agent_telephone TEXT,
          broker TEXT,
          broker_telephone TEXT,
          location TEXT,
          specifications TEXT,
          description_text TEXT,
          images_url TEXT,
          detail_url TEXT,
          source VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Real Estate table ready');

      console.log('✅ All database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing tables:', error);
      // Log error but don't throw to prevent app crash
    }
  }
};

// Export database interface
module.exports = {
  db,
  pool,
  initializeTables
};