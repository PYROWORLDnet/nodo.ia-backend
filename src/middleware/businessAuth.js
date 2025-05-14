const jwt = require('jsonwebtoken');
const { Business, TeamMember } = require('../db/init');

/**
 * Middleware to authenticate business requests using JWT
 */
const businessAuthMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get business ID from token
    const businessId = decoded.businessId || decoded.id;
    if (!businessId) {
      return res.status(401).json({ error: 'Invalid token: no business ID found' });
    }

    // Get business from database
    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(401).json({ error: 'Business not found' });
    }

    // Check if business is active
    if (business.status !== 'active' && business.status !== 'pending') {
      return res.status(403).json({ error: 'Business account is not active' });
    }

    // Initialize permissions
    let permissions = {
      canManageTeam: false,
      canManageSubscription: false,
      canManageProducts: false,
      canViewAnalytics: false
    };

    // Check if this is a team member login
    let teamMember = null;
    if (decoded.teamMember && decoded.teamMember.id) {
      teamMember = await TeamMember.findOne({
        where: {
          id: decoded.teamMember.id,
          business_id: business.id,
          status: 'active'
        }
      });
      
      if (!teamMember) {
        return res.status(401).json({ error: 'Team member not found or inactive' });
      }

      // Set team member permissions
      permissions = {
        canManageTeam: teamMember.can_manage_team || false,
        canManageSubscription: teamMember.can_manage_subscription || false,
        canManageProducts: teamMember.can_manage_products || false,
        canViewAnalytics: teamMember.can_view_analytics || false
      };
    } else {
      // Business owner has all permissions
      permissions = {
        canManageTeam: true,
        canManageSubscription: true,
        canManageProducts: true,
        canViewAnalytics: true
      };
    }
    
    // Update last login time
    if (teamMember) {
      await teamMember.update({ last_login: new Date() });
    } else {
      await business.update({ last_login: new Date() });
    }
    
    // Attach business, team member info, and permissions to request
    req.business = business;
    req.teamMember = teamMember;
    req.isTeamMember = !!teamMember;
    req.permissions = permissions;
    req.user = teamMember || business; // For compatibility with both types
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to verify business is verified
 */
const requireVerifiedBusiness = (req, res, next) => {
  // Skip verification check if business is already active and verified
  if (req.business.status === 'active' && req.business.is_verified) {
    return next();
  }

  // Check if verification is required
  if (!req.business.is_verified) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Email verification required',
      verificationRequired: true
    });
  }

  next();
};

/**
 * Middleware to check subscription tier access
 */
const requireSubscriptionTier = (minimumTier) => {
  return (req, res, next) => {
    const tierValues = {
      'free': 0,
      'smart': 1,
      'pro': 2
    };
    
    const businessTier = req.business.subscription_tier || 'free';
    
    if (tierValues[businessTier] < tierValues[minimumTier]) {
      return res.status(403).json({
        error: 'Subscription Required',
        message: `This feature requires a ${minimumTier} subscription or higher`,
        requiredTier: minimumTier
      });
    }
    
    next();
  };
};

/**
 * Middleware to check team member permissions
 */
const requireTeamPermission = (permission) => {
  return async (req, res, next) => {
    // If it's a business owner, they have all permissions
    if (!req.isTeamMember) {
      return next();
    }
    
    // For team members, check specific permission
    if (!req.permissions[permission]) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `You don't have the required permission: ${permission}`
      });
    }
    
    next();
  };
};

/**
 * Middleware to check permission: can manage team
 */
const requireTeamManagement = (req, res, next) => {
  if (!req.permissions.canManageTeam) {
    return res.status(403).json({ error: 'Insufficient permissions to manage team' });
  }
  next();
};

/**
 * Middleware to check permission: can manage subscription
 */
const requireSubscriptionManagement = (req, res, next) => {
  if (!req.permissions.canManageSubscription) {
    return res.status(403).json({ error: 'Insufficient permissions to manage subscription' });
  }
  next();
};

/**
 * Middleware to check permission: can manage products/listings
 */
const requireProductManagement = (req, res, next) => {
  if (!req.permissions.canManageProducts) {
    return res.status(403).json({ error: 'Insufficient permissions to manage products' });
  }
  next();
};

/**
 * Middleware to check for listing limit
 */
async function checkListingLimit(req, res, next) {
  try {
    // Skip check for Smart or Pro plans (unlimited listings)
    if (req.business.subscriptionTier !== 'free') {
      return next();
    }
    
    // Count active listings
    const count = await req.business.countListings({
      where: { status: 'active' }
    });
    
    if (count >= req.business.freeListingLimit) {
      return res.status(403).json({ 
        error: `Listing limit reached (${req.business.freeListingLimit}). Upgrade your plan for unlimited listings.`,
        upgrade: true,
        currentCount: count,
        limit: req.business.freeListingLimit
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking listing limit:', error);
    return res.status(500).json({ error: 'Failed to check listing limit' });
  }
}

const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const business = await Business.findByPk(decoded.id);
    if (!business) {
      throw new Error('Business not found');
    }
    return business;
  } catch (error) {
    throw error;
  }
};

/**
 * Optional authentication middleware
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const businessId = decoded.businessId || decoded.id;
    if (!businessId) {
      return next();
    }

    const business = await Business.findByPk(businessId);
    if (!business || (business.status !== 'active' && business.status !== 'pending')) {
      return next();
    }

    let teamMember = null;
    let permissions = {
      canManageTeam: true,
      canManageSubscription: true,
      canManageProducts: true,
      canViewAnalytics: true
    };

    if (decoded.teamMember && decoded.teamMember.id) {
      teamMember = await TeamMember.findOne({
        where: {
          id: decoded.teamMember.id,
          business_id: business.id,
          status: 'active'
        }
      });

      if (teamMember) {
        permissions = {
          canManageTeam: teamMember.can_manage_team || false,
          canManageSubscription: teamMember.can_manage_subscription || false,
          canManageProducts: teamMember.can_manage_products || false,
          canViewAnalytics: teamMember.can_view_analytics || false
        };
      }
    }

    req.business = business;
    req.teamMember = teamMember;
    req.isTeamMember = !!teamMember;
    req.permissions = permissions;
    req.user = teamMember || business;
    
    next();
  } catch (error) {
    // For optional auth, we just continue without setting req.business
    next();
  }
};

/**
 * Middleware to check permission: can view analytics
 */
const requireAnalyticsAccess = (req, res, next) => {
  if (!req.permissions.canViewAnalytics) {
    return res.status(403).json({ error: 'Insufficient permissions to view analytics' });
  }
  next();
};

module.exports = {
  businessAuthMiddleware,
  requireVerifiedBusiness,
  requireSubscriptionTier,
  requireTeamPermission,
  requireTeamManagement,
  requireSubscriptionManagement,
  requireProductManagement,
  requireAnalyticsAccess,
  checkListingLimit,
  optionalAuth
}; 