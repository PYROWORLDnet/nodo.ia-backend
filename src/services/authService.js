const jwt = require('jsonwebtoken');
const { User } = require('../db');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwksClient = require('jwks-rsa');
const { Op } = require('sequelize');

class AuthService {
  constructor() {
    // Initialize Apple OAuth client
    this.appleKeyId = process.env.APPLE_KEY_ID; // From your key filename
    this.appleTeamId = process.env.APPLE_TEAM_ID;
    this.appleClientId = process.env.APPLE_CLIENT_ID;
    this.appleBundleId = process.env.APPLE_BUNDLE_ID;
    
    // JWT secret for our own tokens
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = '1d';
    this.refreshTokenExpiresIn = '7d';

    // Initialize JWKS client for Apple
    this.jwksClient = jwksClient({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5
    });
  }

  async verifyAppleToken(identityToken) {
    try {
      // Decode the token to get the kid (Key ID)
      const decodedToken = jwt.decode(identityToken, { complete: true });
      if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
        throw new Error('Invalid token format');
      }

      // Get the public key from Apple's JWKS endpoint
      const key = await this.jwksClient.getSigningKey(decodedToken.header.kid);
      const publicKey = key.getPublicKey();

      // Verify the token
      const payload = jwt.verify(identityToken, publicKey, {
        algorithms: ['RS256'],
        audience: this.appleClientId, // Your app's client ID
        issuer: 'https://appleid.apple.com'
      });

      return payload;
    } catch (error) {
      console.error('Apple token verification failed:', error);
      throw new Error('Invalid Apple token');
    }
  }

  async handleAppleSignIn(identityToken, userData) {
    try {
      // Verify the Apple token
      const payload = await this.verifyAppleToken(identityToken);
      
      // Log the incoming data for debugging
      console.log('[AuthService] Apple Sign In Data:', {
        payload,
        userData,
        hasName: !!(userData.firstName || userData.lastName)
      });

      // Find or create user
      const [user, created] = await User.findOrCreate({
        where: { apple_id: payload.sub },
        defaults: {
          email: userData.email || payload.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          status: 'active',
          last_login: new Date()
        }
      });

      // Update user data if not created and we have new name data
      if (!created && (userData.firstName || userData.lastName)) {
        await user.update({
          email: userData.email || user.email,
          first_name: userData.firstName || user.first_name,
          last_name: userData.lastName || user.last_name,
          last_login: new Date()
        });
      } else if (!created) {
        // Just update last login if no new data
        await user.update({
          last_login: new Date()
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user);

      // Log the response for debugging
      console.log('[AuthService] User data:', {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('Apple sign in failed:', error);
      throw error;
    }
  }

  async generateTokens(user) {
    // Generate access token
    const accessToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );

    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Save refresh token to user
    await user.update({
      refresh_token: refreshToken,
      refresh_token_expires: refreshTokenExpires
    });

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken) {
    const user = await User.findOne({
      where: {
        refresh_token: refreshToken,
        refresh_token_expires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      throw new Error('Invalid refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  }

  async logout(userId) {
    await User.update(
      {
        refresh_token: null,
        refresh_token_expires: null
      },
      {
        where: { id: userId }
      }
    );
  }
}

module.exports = new AuthService(); 