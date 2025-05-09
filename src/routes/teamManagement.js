const express = require('express');
const router = express.Router();
const teamManagementController = require('../controllers/teamManagement');
const { 
  businessAuthMiddleware, 
  requireVerifiedBusiness,
  requireTeamManagement
} = require('../middleware/businessAuth');

// Public route for accepting invitation
router.post('/accept-invitation', teamManagementController.acceptInvitation);

// Protected routes (require authentication and verification)
router.use(businessAuthMiddleware);
router.use(requireVerifiedBusiness);

// Team management routes (require team management permission)
router.post('/invite', requireTeamManagement, teamManagementController.inviteTeamMember);
router.get('/', requireTeamManagement, teamManagementController.getTeamMembers);
router.put('/:id', requireTeamManagement, teamManagementController.updateTeamMember);
router.delete('/:id', requireTeamManagement, teamManagementController.removeTeamMember);
router.post('/:id/resend-invitation', requireTeamManagement, teamManagementController.resendInvitation);

module.exports = router; 