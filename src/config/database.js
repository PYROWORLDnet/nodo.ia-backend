require('dotenv').config();

const isDevelopment = process.env.NODE_ENV === 'development';

// Base Sequelize options
const baseOptions = {
  dialect: 'postgres',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: false
  }
};

// SSL configuration for production
const sslConfig = {
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

// Configuration object
const config = {
  url: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  options: {
    ...baseOptions,
    ...(isDevelopment ? {} : sslConfig)
  }
};

module.exports = config; 