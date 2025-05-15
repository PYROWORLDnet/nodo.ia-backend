'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/sequelize')[env];

const db = {};

let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...config,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

// Import models
const Business = require('./models/business')(sequelize, Sequelize.DataTypes);
const Subscription = require('./models/subscription')(sequelize, Sequelize.DataTypes);
const Listing = require('./models/listing')(sequelize, Sequelize.DataTypes);
const Transaction = require('./models/transaction')(sequelize, Sequelize.DataTypes);
const Invoice = require('./models/invoice')(sequelize, Sequelize.DataTypes);
const TeamMember = require('./models/teamMember')(sequelize, Sequelize.DataTypes);

// Add models to db object
db.Business = Business;
db.Subscription = Subscription;
db.Listing = Listing;
db.Transaction = Transaction;
db.Invoice = Invoice;
db.TeamMember = TeamMember;

// Set up associations
Object.values(db).forEach(model => {
  if (model.associate) {
    model.associate(db);
  }
});

// Initialize database
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Business database connection established successfully.');

    // In development, force sync to recreate all tables
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ force: true });
      console.log('Business database tables dropped and recreated.');
    } else {
      // In production, just sync without forcing
      await sequelize.sync();
      console.log('Business database models synchronized.');
    }

    return true;
  } catch (error) {
    console.error('Business database initialization error:', error);
    throw error;
  }
};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = {
  ...db,
  initializeDatabase
}; 