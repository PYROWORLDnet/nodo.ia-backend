const express = require('express');

const stripeWebhookMiddleware = express.raw({
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf;  // Store the raw buffer directly
  }
});

module.exports = stripeWebhookMiddleware; 