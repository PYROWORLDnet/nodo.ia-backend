const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics');
const { 
  businessAuthMiddleware, 
  requireVerifiedBusiness,
  requireAnalyticsAccess 
} = require('../middleware/businessAuth');

// Public route for recording listing events (no authentication required)
router.post('/record/:id/:eventType', analyticsController.recordListingEvent);

// Protected routes require authentication and analytics access
router.use(businessAuthMiddleware);
router.use(requireVerifiedBusiness);
router.use(requireAnalyticsAccess);

// Analytics dashboard routes
router.get('/dashboard', analyticsController.getDashboardAnalytics);
router.get('/listings/performance', analyticsController.getListingPerformance);
router.get('/search', analyticsController.getSearchAnalytics);
router.get('/geographic', analyticsController.getGeographicAnalytics);

module.exports = router; 