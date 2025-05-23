const authService = require('../services/authService');

class AuthController {
  async appleSignIn(req, res) {
    try {
      // Handle both formats: identityToken/userData and idToken/user
      const identityToken = req.body.identityToken || req.body.idToken;
      const userData = req.body.userData || {
        email: req.body.email,
        firstName: req.body.user?.name?.firstName,
        lastName: req.body.user?.name?.lastName
      };

      if (!identityToken) {
        return res.status(400).json({
          success: false,
          message: 'Identity token is required'
        });
      }

      const result = await authService.handleAppleSignIn(identityToken, userData);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Apple sign in error:', error);
      return res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const tokens = await authService.refreshAccessToken(refreshToken);

      return res.status(200).json({
        success: true,
        data: tokens
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed'
      });
    }
  }

  async logout(req, res) {
    try {
      const userId = req.user.userId; // From JWT token
      await authService.logout(userId);

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
}

module.exports = new AuthController(); 