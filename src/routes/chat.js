const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// All chat routes require authentication
router.use(authenticate);

// Store a new chat interaction
router.post('/', chatController.storeChat);

// Get user's chat history with pagination and filters
router.get('/', chatController.getUserChats);

// Get chat analytics
router.get('/analytics', chatController.getChatAnalytics);

// Update chat feedback
router.patch('/:chatId/feedback', chatController.updateFeedback);

module.exports = router; 