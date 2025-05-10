const jwt = require('jsonwebtoken');
const { Business, TeamMember } = require('../db/init');

/**
 * Middleware to authenticate business requests using JWT
 */
const businessAuthMiddleware = async (req, res, next) => {
  try {
    // Get the token from authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication token is required' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if business exists and is active
    const business = await Business.findByPk(decoded.id);
    
    if (!business) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Business not found' 
      });
    }
    
    if (business.status !== 'active') {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Business account is not active' 
      });
    }
    
    // If this is a team member login
    let teamMember = null;
    if (decoded.teamMember && decoded.teamMember.id) {
      teamMember = await TeamMember.findOne({
        where: {
          id: decoded.teamMember.id,
          businessId: business.id,
          status: 'active'
        }
      });
      
      if (!teamMember) {
        return res.status(401).json({ error: 'Unauthorized: Team member not found or inactive' });
      }
    }
    
    // Update last login time
    await business.update({ lastLogin: new Date() });
    
    // Attach business to request
    req.business = business;
    req.teamMember = teamMember;
    req.isTeamMember = !!teamMember;
    
    // Add permissions to request based on role
    if (teamMember) {
      req.permissions = {
        canManageTeam: teamMember.canManageTeam,
        canManageSubscription: teamMember.canManageSubscription,
        canManageProducts: teamMember.canManageProducts,
        canViewAnalytics: teamMember.canViewAnalytics,
      };
    } else {
      // Business owner has all permissions
      req.permissions = {
        canManageTeam: true,
        canManageSubscription: true,
        canManageProducts: true,
        canViewAnalytics: true,
      };
    }
    
    req.user = { id: business.id, email: business.email, role: 'business' };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Token expired' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid token' 
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Failed to authenticate' 
    });
  }
};

/**
 * Middleware to verify business is verified
 */
const requireVerifiedBusiness = (req, res, next) => {
  if (!req.business.isVerified) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Email verification required' 
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
    
    const businessTier = req.business.subscriptionTier || 'free';
    
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
 * Middleware to check analytics access
 */
const requireAnalyticsAccess = (req, res, next) => {
  // All tiers have access to basic analytics
  next();
};

/**
 * Middleware to check team member permissions
 */
const requireTeamPermission = (permission) => {
  return async (req, res, next) => {
    // If it's a business owner, they have all permissions
    if (req.business) {
      return next();
    }
    
    // For team members, check specific permission
    if (!req.teamMember || !req.teamMember.permissions.includes(permission)) {
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
function requireTeamManagement(req, res, next) {
  if (!req.permissions.canManageTeam) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to manage team' });
  }
  next();
}

/**
 * Middleware to check permission: can manage subscription
 */
function requireSubscriptionManagement(req, res, next) {
  if (!req.permissions.canManageSubscription) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to manage subscription' });
  }
  next();
}

/**
 * Middleware to check permission: can manage products/listings
 */
function requireProductManagement(req, res, next) {
  if (!req.permissions.canManageProducts) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to manage products' });
  }
  next();
}

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

module.exports = {
  businessAuthMiddleware,
  requireVerifiedBusiness,
  requireSubscriptionTier,
  requireAnalyticsAccess,
  requireTeamPermission,
  requireTeamManagement,
  requireSubscriptionManagement,
  requireProductManagement,
  checkListingLimit
}; 