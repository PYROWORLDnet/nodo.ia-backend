const express = require('express');
const router = express.Router();
// Raw body middleware for Stripe webhooks

// This route should not use the JSON body parser middleware
// It should be registered in app.js before the JSON body parser
router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(501).json({ message: 'Stripe webhook handling not implemented yet' });
});

module.exports = router; 