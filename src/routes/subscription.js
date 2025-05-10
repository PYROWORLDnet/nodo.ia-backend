const express = require('express');
const router = express.Router();
const { businessAuthMiddleware, optionalAuth } = require('../middleware/businessAuth');
const {
  getPlans,
  getCurrentSubscription,
  getSubscriptionHistory,
  createSubscriptionCheckout,
  cancelCurrentSubscription,
  reactivateCancelledSubscription,
  changePlan
} = require('../controllers/subscription');

// Public routes with optional authentication
router.get('/plans', optionalAuth, getPlans);

// Protected routes
router.use(businessAuthMiddleware);
router.get('/current', getCurrentSubscription);
router.get('/history', getSubscriptionHistory);
router.post('/checkout', createSubscriptionCheckout);
router.post('/cancel', cancelCurrentSubscription);
router.post('/reactivate', reactivateCancelledSubscription);
router.post('/change-plan', changePlan);

module.exports = router; 