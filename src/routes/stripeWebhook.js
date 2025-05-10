const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookHandler');
// Raw body middleware for Stripe webhooks
router.post('/', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router; 