const express = require('express');
const router = express.Router();

// Raw body middleware for Stripe webhooks
router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  // Placeholder for actual webhook handling - will be implemented later
  res.status(501).json({ message: 'Stripe webhook handling not implemented yet' });
});

module.exports = router; 