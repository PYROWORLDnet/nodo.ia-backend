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
        business_id: existingBusiness.id, 
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
      business_id: existingBusiness.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      can_manage_team: canManageTeam,
      can_manage_subscription: canManageSubscription,
      can_manage_products: canManageProducts,
      can_view_analytics: canViewAnalytics,
      invitation_token: invitationToken,
      invitation_expires: invitationExpires,
      status: 'invited',
      password_hash: temporaryPasswordHash // Set temporary password hash
    });

    // Log successful creation
    console.log('Team member created:', {
      id: teamMember.id,
      email: teamMember.email,
      businessId: teamMember.business_id
    });

    // Send invitation email
    await sendEmail(email, teamMemberInvitationEmail({
      businessName: existingBusiness.business_name,
      teamMemberName: `${firstName} ${lastName}`,
      inviterName: existingBusiness.owner_name,
      role,
      invitationUrl: `${process.env.FRONTEND_URL}/team/accept-invitation?token=${invitationToken}`
    }));

    return res.status(201).json({
      message: 'Team member invited successfully',
      teamMember: {
        id: teamMember.id,
        email: teamMember.email,
        firstName: teamMember.first_name,
        lastName: teamMember.last_name,
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

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Find team member with this token
    const teamMember = await TeamMember.findOne({
      where: {
        invitation_token: token,
        invitation_expires: { [Op.gt]: new Date() },
        status: 'invited'
      },
      include: [{ 
        model: Business,
        as: 'business',
        attributes: ['id', 'business_name', 'owner_name', 'email']
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
      password_hash: hashedPassword,
      invitation_token: null,
      invitation_expires: null,
      status: 'active',
      current_session_id: sessionId
    });

    // Generate token with team member info
    const authToken = generateBusinessToken(teamMember.business, teamMember);

    return res.status(200).json({
      message: 'Invitation accepted successfully',
      token: authToken,
      business: {
        id: teamMember.business.id,
        name: teamMember.business.business_name,
        ownerName: teamMember.business.owner_name
      },
      teamMember: {
        id: teamMember.id,
        firstName: teamMember.first_name,
        lastName: teamMember.last_name,
        email: teamMember.email,
        role: teamMember.role,
        permissions: {
          canManageTeam: teamMember.can_manage_team,
          canManageSubscription: teamMember.can_manage_subscription,
          canManageProducts: teamMember.can_manage_products,
          canViewAnalytics: teamMember.can_view_analytics
        }
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
        business_id: business.id,
        status: { [Op.in]: ['active', 'invited'] }
      }
    });

    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    // Update team member
    await teamMember.update({
      role: role || teamMember.role,
      can_manage_team: canManageTeam !== undefined ? canManageTeam : teamMember.can_manage_team,
      can_manage_subscription: canManageSubscription !== undefined ? canManageSubscription : teamMember.can_manage_subscription,
      can_manage_products: canManageProducts !== undefined ? canManageProducts : teamMember.can_manage_products,
      can_view_analytics: canViewAnalytics !== undefined ? canViewAnalytics : teamMember.can_view_analytics
    });

    return res.status(200).json({
      message: 'Team member updated successfully',
      teamMember: {
        id: teamMember.id,
        name: teamMember.name,
        email: teamMember.email,
        role: teamMember.role,
        status: teamMember.status,
        canManageTeam: teamMember.can_manage_team,
        canManageSubscription: teamMember.can_manage_subscription,
        canManageProducts: teamMember.can_manage_products,
        canViewAnalytics: teamMember.can_view_analytics
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
        business_id: business.id,
        status: { [Op.in]: ['active', 'invited', 'pending'] }
      }
    });

    if (!teamMember) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    // Update team member status to inactive instead of removed
    await teamMember.update({
      status: 'inactive',
      invitation_token: null,
      invitation_expires: null,
      current_session_id: null
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
        business_id: business.id,
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
      invitation_token: invitationToken,
      invitation_expires: invitationTokenExpires
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

/**
 * Login team member
 */
async function loginTeamMember(req, res) {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find team member
    const teamMember = await TeamMember.findOne({
      where: {
        email,
        status: 'active'
      },
      include: [{
        model: Business,
        as: 'business',
        attributes: ['id', 'business_name', 'owner_name', 'email', 'status'],
        where: {
          status: 'active'
        }
      }]
    });

    if (!teamMember) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, teamMember.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate session ID
    const sessionId = generateSessionId();

    // Update last login and session
    await teamMember.update({
      last_login: new Date(),
      current_session_id: sessionId
    });

    // Generate token with team member info
    const authToken = generateBusinessToken(teamMember.business, teamMember);

    return res.status(200).json({
      message: 'Login successful',
      token: authToken,
      business: {
        id: teamMember.business.id,
        name: teamMember.business.business_name,
        ownerName: teamMember.business.owner_name
      },
      teamMember: {
        id: teamMember.id,
        firstName: teamMember.first_name,
        lastName: teamMember.last_name,
        email: teamMember.email,
        role: teamMember.role,
        permissions: {
          canManageTeam: teamMember.can_manage_team,
          canManageSubscription: teamMember.can_manage_subscription,
          canManageProducts: teamMember.can_manage_products,
          canViewAnalytics: teamMember.can_view_analytics
        }
      },
      sessionId
    });
  } catch (error) {
    console.error('Team member login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
}

module.exports = {
  inviteTeamMember,
  acceptInvitation,
  getTeamMembers,
  updateTeamMember,
  removeTeamMember,
  resendInvitation,
  loginTeamMember
}; 