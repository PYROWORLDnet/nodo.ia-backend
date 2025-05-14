const express = require('express');

const stripeWebhookMiddleware = express.raw({ type: 'application/json' });

module.exports = { stripeWebhookMiddleware }; 