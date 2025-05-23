const jwt = require('jsonwebtoken');
const User  = require('../db/models/user');

const jwtSecret = process.env.JWT_SECRET;

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);
    
    // Check if user exists and is active
    const user = await User.findOne({
      where: {
        id: decoded.userId,
        status: 'active'
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Add user info to request
    req.user = {
      userId: user.id,
      email: user.email
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = {
  authenticateToken
}; 