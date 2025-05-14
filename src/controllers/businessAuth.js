const { Business } = require('../db/init');
const { Op } = require('sequelize');
const axios = require('axios');
const { 
  hashPassword, 
  verifyPassword,
  generateBusinessToken,
  generateVerificationToken,
  generatePasswordResetToken,
  validateCedula,
  generateSessionId
} = require('../utils/businessAuth');
const { sendEmail } = require('../utils/emailService');
const { 
  businessVerificationEmail, 
  welcomeEmail,
  passwordResetEmail
} = require('../utils/emailTemplates');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { TeamMember } = require('../db/init');

/**
 * Register a new business
 */
const register = async (req, res, next) => {
  try {
    const {
      ownerName,
      businessName,
      identityNumber,
      businessType,
      businessCategory,
      businessAddress,
      businessPhone,
      email,
      password
    } = req.body;

    // Validate required fields
    if (!ownerName || !businessName || !identityNumber || !businessType || !businessCategory || !businessAddress || !businessPhone || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide owner name, business name, identity number, business type, business category, business address, business phone, email, and password'
      });
    }

    // Validate identity number format (must be 11 digits)
    const cleanIdentityNumber = identityNumber.replace(/[^0-9]/g, '');
    if (cleanIdentityNumber.length !== 11) {
      return res.status(400).json({
        error: 'Invalid identity number',
        message: 'Identity number must be 11 digits'
      });
    }

    // Validate cedula with government API
    try {
      const response = await axios.get(`https://api.digital.gob.do/v3/cedulas/${cleanIdentityNumber}/validate`);
      if (!response.data.valid) {
        return res.status(400).json({
          error: 'Invalid identity number',
          message: 'The provided identity number is not valid according to government records'
        });
      }
    } catch (error) {
      console.error('Error validating cedula:', error);
      return res.status(500).json({
        error: 'Validation error',
        message: 'Invalid identity number'
      });
    }

    // Check if email already exists
    const existingBusiness = await Business.findOne({ where: { email } });
    if (existingBusiness) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'This email address is already registered'
      });
    }

    // Check if identity number already exists
    const existingIdentity = await Business.findOne({ where: { identity_number: cleanIdentityNumber } });
    if (existingIdentity) {
      return res.status(409).json({
        error: 'Identity number already registered',
        message: 'This identity number is already registered'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new business
    const business = await Business.create({
      owner_name: ownerName,
      business_name: businessName,
      business_type: businessType,
      business_category: businessCategory,
      business_address: businessAddress,
      business_phone: businessPhone,
      identity_number: cleanIdentityNumber,
      email,
      password_hash: hashedPassword,
      subscription_tier: 'free',
      status: 'pending_verification',
      is_verified: false,
      verification_token: verificationToken,
      verification_token_expires: verificationTokenExpires
    });

    // Send verification email
    await sendEmail(email, businessVerificationEmail({
      ownerName,
      businessName,
      verificationToken
    }));

    res.status(201).json({
      message: 'Business registered successfully. Please check your email to verify your account.',
      business: {
        id: business.id,
        owner_name: business.owner_name,
        business_name: business.business_name,
        email: business.email
      }
    });
  } catch (error) {
    console.error('Error in business registration:', error);
    next(error);
  }
};

/**
 * Verify business email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    console.log('Attempting to verify email with token:', token);
    
    // Debug: Check if token exists in database
    const tokenCheck = await Business.findOne({
      where: {
        verification_token: token
      },
      attributes: ['id', 'email', 'verification_token', 'verification_token_expires', 'is_verified', 'status']
    });
    
    console.log('Token check result:', tokenCheck ? {
      found: true,
      id: tokenCheck.id,
      email: tokenCheck.email,
      isVerified: tokenCheck.is_verified,
      status: tokenCheck.status,
      tokenExpires: tokenCheck.verification_token_expires
    } : 'Not found');
    
    // Find business with token and expiry
    const business = await Business.findOne({
      where: {
        verification_token: token,
        verification_token_expires: { [Op.gt]: new Date() }
      }
    });
    
    if (!business) {
      console.log('Business not found or token expired');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or expired verification token'
      });
    }
    
    console.log('Business found, updating verification status for ID:', business.id);
    
    // Update business
    await business.update({
      is_verified: true,
      status: 'active',
      verification_token: null,
      verification_token_expires: null
    });
    
    // Send welcome email
    await sendEmail(business.email, welcomeEmail({
      businessName: business.business_name,
      frontendUrl: process.env.FRONTEND_URL
    }));
    
    // Generate token
    const authToken = generateBusinessToken(business);
    
    console.log('Email verification successful for business:', business.id);
    
    res.json({
      message: 'Email verified successfully',
      token: authToken
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify email'
    });
  }
};

/**
 * Business login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // First try to find a team member
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

    // If team member found, verify their password
    if (teamMember) {
      const isValidPassword = await verifyPassword(password, teamMember.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Generate token with both business and team member info
      const token = generateBusinessToken(teamMember.business, teamMember);
      
      // Update last login
      await teamMember.update({ 
        last_login: new Date(),
        current_session_id: generateSessionId()
      });
      
      return res.json({
        message: 'Login successful',
        token,
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
        }
      });
    }
    
    // If no team member found, try to find a business
    const business = await Business.findOne({ where: { email } });
    
    if (!business) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }
    
    // Check password
    const isValidPassword = await verifyPassword(password, business.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }
    
    // Check status
    if (business.status !== 'active') {
      // If pending verification, send message
      if (business.status === 'pending_verification') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Email verification required',
          verificationRequired: true
        });
      }
      
      // Other statuses (suspended, etc.)
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is not active'
      });
    }
    
    // Generate token
    const token = generateBusinessToken(business);
    
    // Update last login
    await business.update({ last_login: new Date() });
    
    res.json({
      message: 'Login successful',
      token,
      business: {
        id: business.id,
        name: business.business_name,
        email: business.email,
        subscription_tier: business.subscription_tier
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
};

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find business
    const business = await Business.findOne({ where: { email } });
    
    // Always return success even if email not found (security)
    if (!business) {
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }
    
    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Update business
    await business.update({
      password_reset_token: resetToken,
      password_reset_token_expiry: resetTokenExpiry
    });
    
    // Send email
    await sendEmail(email, passwordResetEmail({
      businessName: business.business_name,
      resetToken,
      frontendUrl: process.env.FRONTEND_URL
    }));
    
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Find business with token
    const business = await Business.findOne({
      where: {
        password_reset_token: token,
        password_reset_token_expiry: { [Op.gt]: new Date() }
      }
    });
    
    if (!business) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or expired reset token'
      });
    }
    
    // Update password
    await business.update({
      password_hash: await hashPassword(password),
      password_reset_token: null,
      password_reset_token_expiry: null
    });
    
    res.json({
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset password'
    });
  }
};

/**
 * Get business profile
 */
const getProfile = async (req, res) => {
  try {
    const business = req.business;
    console.log('Business:', business);
    
    res.json({
      id: business.id,
      owner_name: business.owner_name,
      business_name: business.business_name,
      identity_number: business.identity_number,
      email: business.email,
      phone: business.business_phone,
      address: business.business_address,
      cedula: business.cedula, // Read-only field
      idVerified: business.idVerified,
      idVerificationDate: business.idVerificationDate,
      logo: business.logo,
      website: business.website,
      description: business.description,
      industry: business.industry,
      subscription_tier: business.subscription_tier,
      subscriptionStatus: business.subscriptionStatus,
      subscriptionExpiresAt: business.subscriptionExpiresAt,
      patchColor: business.patchColor,
      highlightCredits: business.highlightCredits,
      freeListingLimit: business.freeListingLimit,
      proHighlightQuota: business.proHighlightQuota,
      status: business.status,
      isVerified: business.is_verified,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
      lastLogin: business.last_login
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get profile'
    });
  }
};

/**
 * Update business profile
 */
const updateProfile = async (req, res) => {
  try {
    const business = req.business;
    const {
      ownerName,
      businessName,
      phone,
      address,
      logo,
      website,
      description,
      industry,
      patchColor
    } = req.body;
    
    // Update fields
    await business.update({
      owner_name: ownerName || business.owner_name,
      business_name: businessName || business.business_name,
      business_phone: phone || business.business_phone,
      business_address: address || business.business_address,
      logo: logo || business.logo,
      website: website || business.website,
      description: description || business.description,
      industry: industry || business.industry,
      patchColor: patchColor || business.patchColor
    });
    
    // Get updated business data
    const updatedBusiness = await Business.findByPk(business.id);
    
    res.json({
      message: 'Profile updated successfully',
      business: {
        id: updatedBusiness.id,
        owner_name: updatedBusiness.owner_name,
        business_name: updatedBusiness.business_name,
        identity_number: updatedBusiness.identity_number,
        email: updatedBusiness.email,
        phone: updatedBusiness.business_phone,
        address: updatedBusiness.business_address,
        cedula: updatedBusiness.cedula, // Read-only field
        idVerified: updatedBusiness.idVerified,
        idVerificationDate: updatedBusiness.idVerificationDate,
        logo: updatedBusiness.logo,
        website: updatedBusiness.website,
        description: updatedBusiness.description,
        industry: updatedBusiness.industry,
        subscription_tier: updatedBusiness.subscription_tier,
        subscriptionStatus: updatedBusiness.subscriptionStatus,
        subscriptionExpiresAt: updatedBusiness.subscriptionExpiresAt,
        patchColor: updatedBusiness.patchColor,
        highlightCredits: updatedBusiness.highlightCredits,
        freeListingLimit: updatedBusiness.freeListingLimit,
        proHighlightQuota: updatedBusiness.proHighlightQuota,
        status: updatedBusiness.status,
        isVerified: updatedBusiness.is_verified,
        createdAt: updatedBusiness.createdAt,
        updatedAt: updatedBusiness.updatedAt,
        lastLogin: updatedBusiness.last_login
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const business = req.business;
    const { currentPassword, newPassword } = req.body;
    
    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, business.password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    await business.update({
      password_hash: await hashPassword(newPassword)
    });
    
    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
};

/**
 * Logout
 */
const logout = async (req, res) => {
  try {
    // No server-side logout needed for JWT, just clear on client
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout'
    });
  }
};

/**
 * Upload profile picture
 */
const uploadProfilePicture = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }

    // Ensure upload directories exist
    const uploadDir = path.join(__dirname, '../../uploads');
    const profilePicturesDir = path.join(uploadDir, 'profile_pictures');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    if (!fs.existsSync(profilePicturesDir)) {
      fs.mkdirSync(profilePicturesDir);
    }

    const business = req.business;
    
    // Generate the URL for the uploaded file
    const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/api/auth/business/profile/picture/${req.file.filename}`;
    
    // Move file to correct location if needed
    const finalPath = path.join(profilePicturesDir, req.file.filename);
    if (req.file.path !== finalPath) {
      fs.renameSync(req.file.path, finalPath);
    }

    // Update business profile with new logo URL
    await business.update({
      logo: fileUrl
    });
    
    res.json({
      message: 'Profile picture uploaded successfully',
      logo: fileUrl
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload profile picture'
    });
  }
};

/**
 * Serve profile picture
 */
const serveProfilePicture = (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads/profile_pictures', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Set content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    }

    // Read and send file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Error serving file');
  }
};

/**
 * Get user permissions
 */
const getPermissions = async (req, res) => {
  try {
    const { business, teamMember, permissions, isTeamMember } = req;

    // Get subscription-based permissions
    const subscriptionPermissions = {
      canAccessSmartFeatures: business.subscription_tier !== 'free',
      canAccessProFeatures: business.subscription_tier === 'pro',
      hasUnlimitedListings: business.subscription_tier !== 'free',
      listingLimit: business.listing_limit || 5,
      highlightCredits: business.highlight_credits || 0
    };

    res.json({
      isBusinessOwner: !isTeamMember,
      isTeamMember,
      role: teamMember ? teamMember.role : 'owner',
      permissions: {
        // Team/role based permissions
        canManageTeam: permissions.canManageTeam,
        canManageSubscription: permissions.canManageSubscription,
        canManageProducts: permissions.canManageProducts,
        canViewAnalytics: permissions.canViewAnalytics,
        
        // Subscription based permissions
        ...subscriptionPermissions,

        // Business status permissions
        isVerified: business.is_verified,
        isActive: business.status === 'active'
      },
      business: {
        id: business.id,
        name: business.business_name,
        subscription: business.subscription_tier,
        status: business.status
      },
      teamMember: teamMember ? {
        id: teamMember.id,
        firstName: teamMember.first_name,
        lastName: teamMember.last_name,
        email: teamMember.email,
        role: teamMember.role
      } : null
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get permissions'
    });
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  uploadProfilePicture,
  serveProfilePicture,
  getPermissions
}; 