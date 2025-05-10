const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Password hashing
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Password verification
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token for businesses
const generateBusinessToken = (business, teamMember = null) => {
  const payload = {
    id: business.id,
    email: business.email,
    name: business.name,
    type: 'business',
    // If this is a team member login
    teamMember: teamMember ? {
      id: teamMember.id,
      role: teamMember.role,
      permissions: {
        canManageTeam: teamMember.canManageTeam,
        canManageSubscription: teamMember.canManageSubscription,
        canManageProducts: teamMember.canManageProducts,
        canViewAnalytics: teamMember.canViewAnalytics,
      }
    } : null,
    subscriptionTier: business.subscriptionTier,
  };

  // Set expiration based on environment - shorter for dev, longer for prod
  const expiresIn = process.env.NODE_ENV === 'production' ? '7d' : '30d';

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate password reset token
const generateResetPasswordToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate team invitation token
const generateTeamInvitationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Validate Dominican ID (Cédula)
const validateCedula = (cedula) => {
  // Remove any non-numeric characters
  const cleanCedula = cedula.replace(/[^0-9]/g, '');

  // Basic format check (11 digits)
  if (cleanCedula.length !== 11) {
    return false;
  }

  try {
    // Algorithm validation (simplified version)
    const digits = cleanCedula.split('').map(Number);
    const checkDigit = digits.pop();
    
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      const weight = (i % 2 === 0) ? 1 : 2;
      let value = digits[i] * weight;
      if (value > 9) value = Math.floor(value / 10) + (value % 10);
      sum += value;
    }
    
    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    
    return calculatedCheckDigit === checkDigit;
  } catch (error) {
    console.error('Error validating cédula:', error);
    return false;
  }
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateBusinessToken,
  generateVerificationToken,
  generateResetPasswordToken,
  generateTeamInvitationToken,
  generateSessionId,
  validateCedula
}; 