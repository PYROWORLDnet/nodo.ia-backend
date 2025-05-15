const express = require('express');
const router = express.Router();

// Import route modules
const businessAuthRoutes = require('./businessAuth');
const teamRoutes = require('./teamManagement');
const subscriptionRoutes = require('./subscription');
const promotionCreditRoutes = require('./promotionCredit');
const analyticsRoutes = require('./analytics');
const webhookRoutes = require('./webhook');
const listingRoutes = require('./listing');
const searchRoutes = require('./search');
// Mount routes
router.use('/auth/business', businessAuthRoutes);
router.use('/team', teamRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/credits', promotionCreditRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/listings', listingRoutes);
router.use('/search', searchRoutes);

// Base route for API version info
router.get('/', (req, res) => {
  res.json({
    name: 'Nodo.ia API',
    version: '1.0.0',
    status: 'active'
  });
});

module.exports = router; 