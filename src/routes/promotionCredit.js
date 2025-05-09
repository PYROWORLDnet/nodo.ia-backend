const express = require('express');
const router = express.Router();
// Placeholder for promotion credit controller - will be implemented later
// const promotionCreditController = require('../controllers/promotionCredit');
const { 
  businessAuthMiddleware, 
  requireVerifiedBusiness,
  requireSubscriptionManagement
} = require('../middleware/businessAuth');

// All routes require authentication
router.use(businessAuthMiddleware);
router.use(requireVerifiedBusiness);

// Routes for promotion credits
router.get('/pricing', (req, res) => {
  res.status(501).json({ message: 'Getting credit pricing not implemented yet' });
});

router.get('/balance', (req, res) => {
  res.status(501).json({ message: 'Getting credit balance not implemented yet' });
});

router.get('/history', (req, res) => {
  res.status(501).json({ message: 'Getting credit history not implemented yet' });
});

// Routes that require subscription management permission
router.use(requireSubscriptionManagement);

router.post('/checkout', (req, res) => {
  res.status(501).json({ message: 'Creating credit checkout session not implemented yet' });
});

// Apply credits to a listing is handled in listing routes

module.exports = router; 