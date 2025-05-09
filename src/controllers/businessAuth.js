const { Business } = require('../db');
const { Op } = require('sequelize');
const { 
  hashPassword, 
  verifyPassword,
  generateBusinessToken,
  generateVerificationToken,
  generatePasswordResetToken
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
const register = async (req, res) => {
  try {
    const { name, email, password, phone, owner } = req.body;
    
    // Check if business with email already exists
    const existingBusiness = await Business.findOne({ where: { email } });
    if (existingBusiness) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A business with this email already exists'
      });
    }
    
    // Create new business
    const business = await Business.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      phone,
      owner: owner || {},
      subscriptionTier: 'free',
      status: 'pending_verification',
      isVerified: false,
      verificationToken: generateVerificationToken(),
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    
    // Send verification email
    await sendEmail(email, businessVerificationEmail({
      businessName: name,
      verificationToken: business.verificationToken,
      frontendUrl: process.env.FRONTEND_URL
    }));
    
    res.status(201).json({
      message: 'Business registered successfully. Please check your email to verify your account.',
      businessId: business.id
    });
  } catch (error) {
    console.error('Business registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register business'
    });
  }
};

/**
 * Verify business email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Find business with token
    const business = await Business.findOne({
      where: {
        verificationToken: token,
        verificationTokenExpiry: { [Op.gt]: new Date() }
      }
    });
    
    if (!business) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid or expired verification token'
      });
    }
    
    // Update business
    await business.update({
      isVerified: true,
      status: 'active',
      verificationToken: null,
      verificationTokenExpiry: null
    });
    
    // Send welcome email
    await sendEmail(business.email, welcomeEmail({
      businessName: business.name,
      frontendUrl: process.env.FRONTEND_URL
    }));
    
    // Generate token
    const authToken = generateBusinessToken(business);
    
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
        name: business.name,
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
      businessName: business.name,
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
      name: business.name,
      email: business.email,
      phone: business.phone,
      owner: business.owner,
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
      name: name || business.name,
      phone: phone || business.phone,
      owner: owner || business.owner,
      address: address || business.address
    });
    
    res.json({
      message: 'Profile updated successfully',
      business: {
        id: business.id,
        name: business.name,
        email: business.email,
        phone: business.phone,
        owner: business.owner,
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