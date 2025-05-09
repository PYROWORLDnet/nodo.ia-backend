const express = require('express');
const router = express.Router();

// Import route modules
const businessAuthRoutes = require('./businessAuth');
const teamRoutes = require('./team');
const subscriptionRoutes = require('./subscription');
const listingRoutes = require('./listing');
const promotionCreditRoutes = require('./promotionCredit');
const analyticsRoutes = require('./analytics');
const webhookRoutes = require('./webhook');

// Mount routes
router.use('/auth/business', businessAuthRoutes);
router.use('/team', teamRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/listings', listingRoutes);
router.use('/credits', promotionCreditRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks', webhookRoutes);

// Base route for API version info
router.get('/', (req, res) => {
  res.json({
    name: 'Nodo.ia API',
    version: '1.0.0',
    status: 'active'
  });
});

module.exports = router; 