const express = require('express');
const router = express.Router();
const businessAuthController = require('../controllers/businessAuth');
const { businessAuthMiddleware } = require('../middleware/businessAuth');
const upload = require('../config/multer');

// Public routes
router.post('/register', businessAuthController.register);
router.post('/verify-email', businessAuthController.verifyEmail);
router.post('/login', businessAuthController.login);
router.post('/request-password-reset', businessAuthController.requestPasswordReset);
router.post('/reset-password', businessAuthController.resetPassword);

// Protected routes - require authentication
router.use(businessAuthMiddleware);

router.get('/permissions', businessAuthController.getPermissions);
router.get('/profile', businessAuthController.getProfile);
router.put('/profile', businessAuthController.updateProfile);
router.post('/change-password', businessAuthController.changePassword);
router.post('/logout', businessAuthController.logout);

// Profile picture routes
router.post('/profile/picture', upload.single('picture'), businessAuthController.uploadProfilePicture);
router.get('/profile/picture/:filename', businessAuthController.serveProfilePicture);

module.exports = router; 