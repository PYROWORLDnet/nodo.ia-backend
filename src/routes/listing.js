const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listing');
const { 
  businessAuthMiddleware, 
  requireVerifiedBusiness,
  requireProductManagement,
  checkListingLimit,
  requireAnalyticsAccess
} = require('../middleware/businessAuth');

// All routes require authentication and verification
router.use(businessAuthMiddleware);
router.use(requireVerifiedBusiness);

// Routes for listing management
router.get('/', listingController.getListings);
router.get('/:id', listingController.getListing);
router.post('/', requireProductManagement, checkListingLimit, listingController.createListing);
router.put('/:id', requireProductManagement, listingController.updateListing);
router.delete('/:id', requireProductManagement, listingController.deleteListing);

// Promotion routes
router.post('/:id/promote', requireProductManagement, listingController.promoteListing);

// Analytics routes (require analytics access)
router.get('/:id/analytics', requireAnalyticsAccess, listingController.getListingAnalytics);

module.exports = router; 