const { Business } = require('../db/init');
const { Op } = require('sequelize');
const { 
  hashPassword, 
  verifyPassword,
  generateBusinessToken,
  generateVerificationToken,
  generatePasswordResetToken,
  validateCedula
} = require('../utils/businessAuth');
const { sendEmail } = require('../utils/emailService');
const { 
  businessVerificationEmail, 
  welcomeEmail,
  passwordResetEmail
} = require('../utils/emailTemplates');

/**
 * Register a new business
 */
const register = async (req, res, next) => {
  try {
    const {
      ownerName,
      businessName,
      identityNumber,
      email,
      password
    } = req.body;

    // Validate required fields
    if (!ownerName || !businessName || !identityNumber || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide owner name, business name, identity number, email, and password'
      });
    }

    // Validate identity number (Dominican Republic cedula)
    console.log('Identity number:', identityNumber);

    // Check if email already exists
    const existingBusiness = await Business.findOne({ where: { email } });
    if (existingBusiness) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'This email address is already registered'
      });
    }

    // Check if identity number already exists
    const existingIdentity = await Business.findOne({ where: { identityNumber } });
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
      ownerName,
      businessName,
      identityNumber,
      email,
      passwordHash: hashedPassword,
      subscriptionTier: 'free',
      status: 'pending_verification',
      isVerified: false,
      verificationToken,
      verificationTokenExpires
    });

    // Log token for debugging
    console.log('Generated verification token:', verificationToken);

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
        ownerName: business.ownerName,
        businessName: business.businessName,
        email: business.email,
        verificationToken // Include token in response for testing
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
        verificationToken: token
      },
      attributes: ['id', 'email', 'verificationToken', 'verificationTokenExpires', 'isVerified', 'status']
    });
    
    console.log('Token check result:', tokenCheck ? {
      found: true,
      id: tokenCheck.id,
      email: tokenCheck.email,
      isVerified: tokenCheck.isVerified,
      status: tokenCheck.status,
      tokenExpires: tokenCheck.verificationTokenExpires
    } : 'Not found');
    
    // Find business with token and expiry
    const business = await Business.findOne({
      where: {
        verificationToken: token,
        verificationTokenExpires: { [Op.gt]: new Date() }
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
      isVerified: true,
      status: 'active',
      verificationToken: null,
      verificationTokenExpires: null
    });
    
    // Send welcome email
    await sendEmail(business.email, welcomeEmail({
      businessName: business.businessName,
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
    
    // Find business
    const business = await Business.findOne({ where: { email } });
    
    if (!business) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }
    
    // Check password
    const isValidPassword = await verifyPassword(password, business.passwordHash);
    
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
    await business.update({ lastLogin: new Date() });
    
    res.json({
      message: 'Login successful',
      token,
      business: {
        id: business.id,
        name: business.businessName,
        email: business.email,
        subscriptionTier: business.subscriptionTier
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
      passwordResetToken: resetToken,
      passwordResetTokenExpiry: resetTokenExpiry
    });
    
    // Send email
    await sendEmail(email, passwordResetEmail({
      businessName: business.businessName,
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
        passwordResetToken: token,
        passwordResetTokenExpiry: { [Op.gt]: new Date() }
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
      passwordHash: await hashPassword(password),
      passwordResetToken: null,
      passwordResetTokenExpiry: null
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
    
    res.json({
      id: business.id,
      name: business.businessName,
      email: business.email,
      phone: business.phone,
      owner: business.ownerName,
      address: business.address,
      subscriptionTier: business.subscriptionTier,
      status: business.status,
      isVerified: business.isVerified,
      createdAt: business.createdAt,
      lastLogin: business.lastLogin
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
    const { name, phone, owner, address } = req.body;
    
    // Update fields
    await business.update({
      name: name || business.businessName,
      phone: phone || business.phone,
      owner: owner || business.ownerName,
      address: address || business.address
    });
    
    res.json({
      message: 'Profile updated successfully',
      business: {
        id: business.id,
        name: business.businessName,
        email: business.email,
        phone: business.phone,
        owner: business.ownerName,
        address: business.address
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
    const isValidPassword = await verifyPassword(currentPassword, business.passwordHash);
    
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    await business.update({
      passwordHash: await hashPassword(newPassword)
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

module.exports = {
  register,
  verifyEmail,
  login,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  logout
}; 