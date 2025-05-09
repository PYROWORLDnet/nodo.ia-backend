const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../db');
const { verifyAppleToken, exchangeAppleCodeForTokens } = require('../utils/appleAuth');
const { generateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/**
 * Apple Sign In endpoint using ID token
 * POST /auth/apple/token
 */
router.post('/apple/token', async (req, res) => {
  try {
    const { idToken, user: userInfo } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }
    
    // Verify the ID token from Apple
    const appleUserInfo = await verifyAppleToken(idToken);
    
    if (!appleUserInfo.sub) {
      return res.status(400).json({ error: 'Invalid Apple ID token' });
    }
    
    // Find or create user by Apple ID
    let user = await User.findOne({ where: { appleId: appleUserInfo.sub } });
    
    if (!user) {
      // Create new user from Apple data
      const email = appleUserInfo.email || null;
      let firstName = null, lastName = null, fullName = null;
      
      // Extract user info if provided
      if (userInfo && userInfo.name) {
        firstName = userInfo.name.firstName || null;
        lastName = userInfo.name.lastName || null;
        if (firstName && lastName) {
          fullName = `${firstName} ${lastName}`;
        }
      }
      
      user = await User.create({
        appleId: appleUserInfo.sub,
        email,
        firstName,
        lastName,
        fullName,
        lastLogin: new Date(),
      });
    } else {
      // Update user's last login
      await user.update({ lastLogin: new Date() });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      }
    });
  } catch (error) {
    console.error('Apple Sign In error:', error);
    res.status(500).json({ error: `Authentication failed: ${error.message}` });
  }
});

/**
 * Apple Sign In endpoint using authorization code
 * POST /auth/apple/code
 */
router.post('/apple/code', async (req, res) => {
  try {
    const { code, user: userInfo } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Exchange the code for tokens
    const tokens = await exchangeAppleCodeForTokens(code);
    
    if (!tokens.id_token) {
      return res.status(400).json({ error: 'Failed to get ID token from Apple' });
    }
    
    // Verify the ID token
    const appleUserInfo = await verifyAppleToken(tokens.id_token);
    
    if (!appleUserInfo.sub) {
      return res.status(400).json({ error: 'Invalid Apple ID token' });
    }
    
    // Find or create user by Apple ID
    let user = await User.findOne({ where: { appleId: appleUserInfo.sub } });
    
    if (!user) {
      // Create new user from Apple data
      const email = appleUserInfo.email || null;
      let firstName = null, lastName = null, fullName = null;
      
      // Extract user info if provided
      if (userInfo && userInfo.name) {
        firstName = userInfo.name.firstName || null;
        lastName = userInfo.name.lastName || null;
        if (firstName && lastName) {
          fullName = `${firstName} ${lastName}`;
        }
      }
      
      user = await User.create({
        appleId: appleUserInfo.sub,
        email,
        firstName,
        lastName,
        fullName,
        lastLogin: new Date(),
      });
    } else {
      // Update user's last login
      await user.update({ lastLogin: new Date() });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      }
    });
  } catch (error) {
    console.error('Apple Sign In with code error:', error);
    res.status(500).json({ error: `Authentication failed: ${error.message}` });
  }
});

/**
 * DEVELOPMENT ONLY: Dummy Apple Sign In endpoint for testing
 * POST /auth/dummy/apple
 */
router.post('/dummy/apple', async (req, res) => {
  try {
    // In a real scenario, these would come from Apple
    const { email = 'dummy@example.com', firstName = 'John', lastName = 'Doe' } = req.body;
    
    // Create a fake Apple ID (in reality this is a complex string from Apple)
    const fakeAppleId = `dummy-apple-id-${uuidv4()}`;
    
    // Find or create user by fake Apple ID or email
    let user = null;
    
    if (email) {
      user = await User.findOne({ where: { email } });
    }
    
    if (!user) {
      // Calculate full name
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : null;
      
      // Create new user
      user = await User.create({
        appleId: fakeAppleId,
        email,
        firstName,
        lastName,
        fullName,
        lastLogin: new Date(),
      });
      
      console.log(`Created dummy user: ${email} with ID: ${user.id}`);
    } else {
      // Update existing user
      await user.update({ 
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        fullName: firstName && lastName ? `${firstName} ${lastName}` : user.fullName,
        lastLogin: new Date() 
      });
      
      console.log(`Updated existing user: ${email} with ID: ${user.id}`);
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      message: "DUMMY LOGIN - FOR DEVELOPMENT ONLY"
    });
  } catch (error) {
    console.error('Dummy Apple Sign In error:', error);
    res.status(500).json({ error: `Authentication failed: ${error.message}` });
  }
});

/**
 * Verify token endpoint
 * GET /auth/verify
 */
router.get('/verify', async (req, res) => {
  try {
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
    
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
});

module.exports = { router }; 