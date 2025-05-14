const jwt = require('jsonwebtoken');
const { Business } = require('../db/init');

/**
 * Middleware to authenticate business using JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authMiddleware(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find business by id
    const business = await Business.findByPk(decoded.id);
    
    if (!business) {
      return res.status(401).json({ error: 'Unauthorized: Business not found' });
    }

    if (business.status !== 'active') {
      return res.status(401).json({ error: 'Unauthorized: Business account is not active' });
    }
    
    // Update last login time
    await business.update({ lastLogin: new Date() });
    
    // Add business to request object
    req.user = business;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

/**
 * Generate a JWT token for the business
 * @param {Object} business - Business object
 * @returns {String} - JWT token
 */
function generateToken(business) {
  return jwt.sign(
    { 
      id: business.id,
      email: business.email,
      type: 'business'
    }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn: '30d' 
    }
  );
}

module.exports = { 
  authMiddleware, 
  generateToken 
}; 