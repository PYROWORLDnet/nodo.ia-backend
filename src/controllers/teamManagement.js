const { Business, TeamMember } = require('../db');
const { 
  generateTeamInvitationToken, 
  hashPassword, 
  generateSessionId, 
  generateBusinessToken
} = require('../utils/businessAuth');
const { teamMemberInvitationEmail } = require('../utils/emailTemplates');
const { sendEmail } = require('../utils/emailService');
const { Op } = require('sequelize');

/**
 * Invite a team member
 */
async function inviteTeamMember(req, res) {
  try {
    const { business } = req;
    const { 
      email, 
      name, 
      role, 
      canManageTeam = false, 
      canManageSubscription = false, 
      canManageProducts = false, 
      canViewAnalytics = false 
    } = req.body;

    // Validate required fields
    if (!email || !name || !role) {
      return res.status(400).json({ error: 'Email, name and role are required' });
    }

    // Check if email is already a team member
    const existingMember = await TeamMember.findOne({ 
      where: { 
        businessId: business.id, 
        email,
        status: { [Op.ne]: 'removed' }
      } 
    });

    if (existingMember) {
      return res.status(409).json({ error: 'Email is already associated with a team member' });
    }

    // Generate invitation token
    const invitationToken = generateTeamInvitationToken();
    const invitationTokenExpires = new Date();
    invitationTokenExpires.setDate(invitationTokenExpires.getDate() + 7); // 7 days

    // Create team member
    const teamMember = await TeamMember.create({
      businessId: business.id,
      email,
      name,
      role,
      canManageTeam,
      canManageSubscription,
      canManageProducts,
      canViewAnalytics,
      invitationToken,
      invitationTokenExpires,
      status: 'invited'
    });

    // Send invitation email
    await sendEmail(email, teamMemberInvitationEmail({
      businessName: business.name,
      teamMemberName: name,
      inviterName: business.ownerName,
      role,
      invitationUrl: `${process.env.FRONTEND_URL}/team/accept-invitation?token=${invitationToken}`
    }));

    return res.status(201).json({
      message: 'Team member invited successfully',
      teamMember: {
        id: teamMember.id,
        email: teamMember.email,
        name: teamMember.name,
        role: teamMember.role,
        status: teamMember.status,
        createdAt: teamMember.createdAt
      }
    });
  } catch (error) {
    console.error('Invite team member error:', error);
    return res.status(500).json({ error: 'Failed to invite team member' });
  }
}

/**
 * Accept team member invitation
 */
async function acceptInvitation(req, res) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Invitation token and password are required' });
    }

    // Find team member with this token
    const teamMember = await TeamMember.findOne({
      where: {
        invitationToken: token,
        invitationTokenExpires: { [Op.gt]: new Date() },
        status: 'invited'
      },
      include: [{ model: Business }]
    });

    if (!teamMember) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate session ID
    const sessionId = generateSessionId();

    // Update team member
    await teamMember.update({
      password: hashedPassword,
      invitationToken: null,
      invitationTokenExpires: null,
      status: 'active',
      currentSessionId: sessionId
    });

    // Generate token with team member info
    const authToken = generateBusinessToken(teamMember.Business, teamMember);

    return res.status(200).json({
      message: 'Invitation accepted successfully',
      token: authToken,
      business: {
        id: teamMember.Business.id,
        name: teamMember.Business.name
      },
      teamMember: {
        id: teamMember.id,
        name: teamMember.name,
        email: teamMember.email,
        role: teamMember.role
      },
      sessionId
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return res.status(500).json({ error: 'Failed to accept invitation' });
  }
}

/**
 * Get all team members
 */
async function getTeamMembers(req, res) {
  try {
    const { business } = req;

    // Get all active and invited team members
    const teamMembers = await TeamMember.findAll({
      where: {
        businessId: business.id,
        status: { [Op.in]: ['active', 'invited'] }
      },
      attributes: [
        'id', 'name', 'email', 'role', 'status', 
        'canManageTeam', 'canManageSubscription', 'canManageProducts', 'canViewAnalytics',
        'lastLogin', 'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ teamMembers });
  } catch (error) {
    console.error('Get team members error:', error);
    return res.status(500).json({ error: 'Failed to get team members' });
  }
}

/**
 * Update team member permissions
 */
async function updateTeamMember(req, res) {
  try {
    const { business } = req;
    const { id } = req.params;
    const { 
      role, 
      canManageTeam, 
      canManageSubscription, 
      canManageProducts, 
      canViewAnalytics 
    } = req.body;

    // Find team member
    const teamMember = await TeamMember.findOne({
      where: {
        id,
        businessId: business.id,
        status: { [Op.in]: ['active', 'invited'] }
      }
    });

    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    // Update team member
    await teamMember.update({
      role: role || teamMember.role,
      canManageTeam: canManageTeam !== undefined ? canManageTeam : teamMember.canManageTeam,
      canManageSubscription: canManageSubscription !== undefined ? canManageSubscription : teamMember.canManageSubscription,
      canManageProducts: canManageProducts !== undefined ? canManageProducts : teamMember.canManageProducts,
      canViewAnalytics: canViewAnalytics !== undefined ? canViewAnalytics : teamMember.canViewAnalytics
    });

    return res.status(200).json({
      message: 'Team member updated successfully',
      teamMember: {
        id: teamMember.id,
        name: teamMember.name,
        email: teamMember.email,
        role: teamMember.role,
        status: teamMember.status,
        canManageTeam: teamMember.canManageTeam,
        canManageSubscription: teamMember.canManageSubscription,
        canManageProducts: teamMember.canManageProducts,
        canViewAnalytics: teamMember.canViewAnalytics
      }
    });
  } catch (error) {
    console.error('Update team member error:', error);
    return res.status(500).json({ error: 'Failed to update team member' });
  }
}

/**
 * Remove team member
 */
async function removeTeamMember(req, res) {
  try {
    const { business } = req;
    const { id } = req.params;

    // Find team member
    const teamMember = await TeamMember.findOne({
      where: {
        id,
        businessId: business.id,
        status: { [Op.in]: ['active', 'invited'] }
      }
    });

    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    // Update team member status to removed
    await teamMember.update({
      status: 'removed',
      invitationToken: null,
      invitationTokenExpires: null,
      currentSessionId: null
    });

    return res.status(200).json({
      message: 'Team member removed successfully'
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    return res.status(500).json({ error: 'Failed to remove team member' });
  }
}

/**
 * Resend invitation
 */
async function resendInvitation(req, res) {
  try {
    const { business } = req;
    const { id } = req.params;

    // Find team member
    const teamMember = await TeamMember.findOne({
      where: {
        id,
        businessId: business.id,
        status: 'invited'
      }
    });

    if (!teamMember) {
      return res.status(404).json({ error: 'Invited team member not found' });
    }

    // Generate new invitation token
    const invitationToken = generateTeamInvitationToken();
    const invitationTokenExpires = new Date();
    invitationTokenExpires.setDate(invitationTokenExpires.getDate() + 7); // 7 days

    // Update team member
    await teamMember.update({
      invitationToken,
      invitationTokenExpires
    });

    // Send invitation email
    await sendEmail(teamMember.email, teamMemberInvitationEmail({
      businessName: business.name,
      teamMemberName: teamMember.name,
      inviterName: business.ownerName,
      role: teamMember.role,
      invitationUrl: `${process.env.FRONTEND_URL}/team/accept-invitation?token=${invitationToken}`
    }));

    return res.status(200).json({
      message: 'Invitation resent successfully'
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    return res.status(500).json({ error: 'Failed to resend invitation' });
  }
}

module.exports = {
  inviteTeamMember,
  acceptInvitation,
  getTeamMembers,
  updateTeamMember,
  removeTeamMember,
  resendInvitation
}; 