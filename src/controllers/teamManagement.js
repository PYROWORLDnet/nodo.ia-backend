const { Business, TeamMember } = require('../db/init');
const { 
  generateTeamInvitationToken, 
  hashPassword, 
  generateSessionId, 
  generateBusinessToken,
  comparePassword
} = require('../utils/businessAuth');
const { teamMemberInvitationEmail } = require('../utils/emailTemplates');
const { sendEmail } = require('../utils/emailService');
const { Op } = require('sequelize');

/**
 * Invite a team member
 */
async function inviteTeamMember(req, res) {
  try {
    // Log the incoming request data
    console.log('Invite team member request:', {
      businessFromReq: req.business,
      body: req.body
    });

    if (!req.business || !req.business.id) {
      return res.status(401).json({ error: 'Business authentication required' });
    }

    const { 
      email, 
      firstName,
      lastName,
      role, 
      canManageTeam = false, 
      canManageSubscription = false, 
      canManageProducts = false, 
      canViewAnalytics = false 
    } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'Email, firstName, lastName and role are required' });
    }

    // Verify business exists
    const existingBusiness = await Business.findOne({
      where: { 
        id: req.business.id,
        status: 'active' // Only allow active businesses to invite team members
      }
    });

    if (!existingBusiness) {
      console.error('Business not found or not active:', req.business.id);
      return res.status(404).json({ error: 'Business not found or not active' });
    }

    // Check if email is already a team member (active or invited)
    const existingMember = await TeamMember.findOne({ 
      where: { 
        businessId: existingBusiness.id, 
        email,
        status: { [Op.in]: ['active', 'invited', 'pending'] }
      } 
    });

    if (existingMember) {
      return res.status(409).json({ error: 'Email is already associated with a team member' });
    }

    // Generate invitation token
    const invitationToken = generateTeamInvitationToken();
    const invitationExpires = new Date();
    invitationExpires.setDate(invitationExpires.getDate() + 7); // 7 days

    // Generate a temporary password hash (will be replaced when user accepts invitation)
    const temporaryPassword = generateTeamInvitationToken(); // Using this to generate a random string
    const temporaryPasswordHash = await hashPassword(temporaryPassword);

    // Create team member
    const teamMember = await TeamMember.create({
      businessId: existingBusiness.id,
      email,
      firstName,
      lastName,
      role,
      canManageTeam,
      canManageSubscription,
      canManageProducts,
      canViewAnalytics,
      invitationToken,
      invitationExpires,
      status: 'invited',
      passwordHash: temporaryPasswordHash // Set temporary password hash
    });

    // Log successful creation
    console.log('Team member created:', {
      id: teamMember.id,
      email: teamMember.email,
      businessId: teamMember.businessId
    });

    // Send invitation email
    await sendEmail(email, teamMemberInvitationEmail({
      businessName: existingBusiness.name,
      teamMemberName: `${firstName} ${lastName}`,
      inviterName: existingBusiness.ownerName,
      role,
      invitationUrl: `${process.env.FRONTEND_URL}/team/accept-invitation?token=${invitationToken}`
    }));

    return res.status(201).json({
      message: 'Team member invited successfully',
      teamMember: {
        id: teamMember.id,
        email: teamMember.email,
        firstName: teamMember.firstName,
        lastName: teamMember.lastName,
        role: teamMember.role,
        status: teamMember.status,
        createdAt: teamMember.createdAt
      }
    });
  } catch (error) {
    console.error('Invite team member error:', {
      error: error.message,
      stack: error.stack,
      details: error.parent?.detail,
      sql: error.sql,
      parameters: error.parameters
    });
    return res.status(500).json({ error: 'Failed to invite team member. Please try again.' });
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
        invitationExpires: { [Op.gt]: new Date() },
        status: 'invited'
      },
      include: [{ 
        model: Business,
        as: 'business'
      }]
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
      passwordHash: hashedPassword,
      invitationToken: null,
      invitationExpires: null,
      status: 'active',
      currentSessionId: sessionId
    });

    // Generate token with team member info
    const authToken = generateBusinessToken(teamMember.business, teamMember);

    return res.status(200).json({
      message: 'Invitation accepted successfully',
      token: authToken,
      business: {
        id: teamMember.business.id,
        name: teamMember.business.businessName
      },
      teamMember: {
        id: teamMember.id,
        firstName: teamMember.firstName,
        lastName: teamMember.lastName,
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
        business_id: business.id,
        status: { [Op.in]: ['active', 'invited'] }
      },
      attributes: [
        'id', 
        ['first_name', 'firstName'],
        ['last_name', 'lastName'], 
        'email', 
        'role', 
        'status', 
        ['can_manage_team', 'canManageTeam'], 
        ['can_manage_subscription', 'canManageSubscription'], 
        ['can_manage_products', 'canManageProducts'], 
        ['can_view_analytics', 'canViewAnalytics'],
        ['last_login', 'lastLogin'], 
        ['created_at', 'createdAt']
      ],
      order: [['created_at', 'DESC']]
    });

    // Format response to include full name
    const formattedTeamMembers = teamMembers.map(member => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      fullName: `${member.firstName} ${member.lastName}`,
      email: member.email,
      role: member.role,
      status: member.status,
      canManageTeam: member.canManageTeam,
      canManageSubscription: member.canManageSubscription,
      canManageProducts: member.canManageProducts,
      canViewAnalytics: member.canViewAnalytics,
      lastLogin: member.lastLogin,
      createdAt: member.createdAt
    }));

    return res.status(200).json({ teamMembers: formattedTeamMembers });
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
        status: { [Op.in]: ['active', 'invited', 'pending'] }
      }
    });

    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    // Update team member status to inactive instead of removed
    await teamMember.update({
      status: 'inactive',
      invitationToken: null,
      invitationExpires: null,
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