const jwt = require('jsonwebtoken');
const { User } = require('../db');

/**
 * Middleware to authenticate user using JWT token
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
    
    // Find user by id
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }
    
    // Update last login time
    await user.update({ lastLogin: new Date() });
    
    // Add user to request object
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

/**
 * Generate a JWT token for the user
 * @param {Object} user - User object
 * @returns {String} - JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email 
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