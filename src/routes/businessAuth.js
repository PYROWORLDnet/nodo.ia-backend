const express = require('express');
const router = express.Router();
const businessAuthController = require('../controllers/businessAuth');
const { businessAuthMiddleware } = require('../middleware/businessAuth');

// Public routes
router.post('/register', businessAuthController.register);
router.post('/verify-email', businessAuthController.verifyEmail);
router.post('/login', businessAuthController.login);
router.post('/request-password-reset', businessAuthController.requestPasswordReset);
router.post('/reset-password', businessAuthController.resetPassword);

// Protected routes
router.get('/profile', businessAuthMiddleware, businessAuthController.getProfile);
router.put('/profile', businessAuthMiddleware, businessAuthController.updateProfile);
router.post('/change-password', businessAuthMiddleware, businessAuthController.changePassword);
router.post('/logout', businessAuthMiddleware, businessAuthController.logout);

module.exports = router; 