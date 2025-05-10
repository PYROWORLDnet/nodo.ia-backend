const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookHandler');

// Stripe webhook endpoint
router.post('/stripe', handleWebhook);

module.exports = router; 