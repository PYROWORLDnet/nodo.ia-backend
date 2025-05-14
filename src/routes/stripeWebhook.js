const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookHandler');
const stripeWebhookMiddleware = require('../middleware/stripeWebhookMiddleware');

// Handle Stripe webhooks with raw body middleware
router.post('/', stripeWebhookMiddleware, handleWebhook);

module.exports = router; 