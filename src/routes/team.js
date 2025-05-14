const express = require('express');
const router = express.Router();
// Placeholder for team controller - will be implemented later
// const teamController = require('../controllers/team');
const { 
  businessAuthMiddleware, 
  requireVerifiedBusiness,
  requireTeamManagement
} = require('../middleware/businessAuth');
const { 
  inviteTeamMember, 
  acceptInvitation, 
  getTeamMembers,
  updateTeamMember,
  removeTeamMember,
  resendInvitation,
  loginTeamMember
} = require('../controllers/teamManagement');

// All routes require authentication
router.use(businessAuthMiddleware);
router.use(requireVerifiedBusiness);

// Team management requires team management permission
router.use(requireTeamManagement);

// Routes for team management - commented out until controller is implemented
// router.get('/', teamController.getTeamMembers);
// router.post('/invite', teamController.inviteTeamMember);
// router.put('/:id', teamController.updateTeamMember);
// router.delete('/:id', teamController.removeTeamMember);
// router.post('/:id/resend-invitation', teamController.resendInvitation);

// Public routes (no auth required)
router.post('/accept-invitation', acceptInvitation);
router.post('/login', loginTeamMember);

// Protected routes (require business auth)
router.post('/invite', inviteTeamMember);
router.get('/', getTeamMembers);
router.put('/:id', updateTeamMember);
router.delete('/:id', removeTeamMember);
router.post('/:id/resend-invitation', resendInvitation);

// Add other team routes as needed
router.get('/', (req, res) => {
  res.status(501).json({ message: 'Team listing not implemented yet' });
});

module.exports = router; 