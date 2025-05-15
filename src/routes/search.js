const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const rateLimit = require('express-rate-limit');

// Rate limiting configuration
const searchLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100 // limit each IP to 100 requests per windowMs
});

// Unified search endpoint
router.post('/unified', searchLimiter, searchController.unifiedSearch.bind(searchController));

module.exports = router; 