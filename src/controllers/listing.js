const { Business, Listing, PromotionCredit } = require('../db');
const { Op } = require('sequelize');

/**
 * Get all listings for a business
 */
async function getListings(req, res) {
  try {
    const { business } = req;
    const { status, limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

    // Build query conditions
    const where = { businessId: business.id };
    
    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Get listings
    const listings = await Listing.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [[sortBy, sortOrder]],
    });

    return res.status(200).json({
      listings: listings.rows,
      total: listings.count,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (error) {
    console.error('Get listings error:', error);
    return res.status(500).json({ error: 'Failed to get listings' });
  }
}

/**
 * Get a single listing
 */
async function getListing(req, res) {
  try {
    const { business } = req;
    const { id } = req.params;

    // Find listing
    const listing = await Listing.findOne({
      where: {
        id,
        businessId: business.id
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    return res.status(200).json({ listing });
  } catch (error) {
    console.error('Get listing error:', error);
    return res.status(500).json({ error: 'Failed to get listing' });
  }
}

/**
 * Create a new listing
 */
async function createListing(req, res) {
  try {
    const { business } = req;
    const {
      title,
      description,
      price,
      category,
      subcategory,
      location,
      latitude,
      longitude,
      mainImage,
      images,
      tags,
      contactPhone,
      contactEmail,
      metadata
    } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description and category are required' });
    }

    // Create listing
    const listing = await Listing.create({
      businessId: business.id,
      title,
      description,
      price: price || null,
      currency: 'DOP', // Default currency for Dominican Republic
      category,
      subcategory: subcategory || null,
      location: location || null,
      latitude: latitude || null,
      longitude: longitude || null,
      mainImage: mainImage || null,
      images: images || [],
      tags: tags || [],
      status: 'active',
      displayPriority: getPriorityFromSubscription(business.subscriptionTier),
      contactPhone: contactPhone || business.phone,
      contactEmail: contactEmail || business.email,
      metadata: metadata || null
    });

    return res.status(201).json({
      message: 'Listing created successfully',
      listing
    });
  } catch (error) {
    console.error('Create listing error:', error);
    return res.status(500).json({ error: 'Failed to create listing' });
  }
}

/**
 * Update a listing
 */
async function updateListing(req, res) {
  try {
    const { business } = req;
    const { id } = req.params;
    const {
      title,
      description,
      price,
      category,
      subcategory,
      location,
      latitude,
      longitude,
      mainImage,
      images,
      tags,
      status,
      contactPhone,
      contactEmail,
      metadata
    } = req.body;

    // Find listing
    const listing = await Listing.findOne({
      where: {
        id,
        businessId: business.id
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Update listing
    await listing.update({
      title: title || listing.title,
      description: description || listing.description,
      price: price !== undefined ? price : listing.price,
      category: category || listing.category,
      subcategory: subcategory !== undefined ? subcategory : listing.subcategory,
      location: location !== undefined ? location : listing.location,
      latitude: latitude !== undefined ? latitude : listing.latitude,
      longitude: longitude !== undefined ? longitude : listing.longitude,
      mainImage: mainImage !== undefined ? mainImage : listing.mainImage,
      images: images || listing.images,
      tags: tags || listing.tags,
      status: status || listing.status,
      contactPhone: contactPhone !== undefined ? contactPhone : listing.contactPhone,
      contactEmail: contactEmail !== undefined ? contactEmail : listing.contactEmail,
      metadata: metadata !== undefined ? metadata : listing.metadata
    });

    return res.status(200).json({
      message: 'Listing updated successfully',
      listing: listing
    });
  } catch (error) {
    console.error('Update listing error:', error);
    return res.status(500).json({ error: 'Failed to update listing' });
  }
}

/**
 * Delete a listing
 */
async function deleteListing(req, res) {
  try {
    const { business } = req;
    const { id } = req.params;

    // Find listing
    const listing = await Listing.findOne({
      where: {
        id,
        businessId: business.id
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if listing has active promotions
    if (listing.isHighlighted && listing.highlightExpiresAt > new Date()) {
      return res.status(400).json({ 
        error: 'Cannot delete a listing with active promotion. Please wait until the promotion expires or contact support.' 
      });
    }

    // Instead of hard delete, change status to deleted
    await listing.update({ status: 'deleted' });

    return res.status(200).json({
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    console.error('Delete listing error:', error);
    return res.status(500).json({ error: 'Failed to delete listing' });
  }
}

/**
 * Apply promotion to a listing
 */
async function promoteListing(req, res) {
  try {
    const { business } = req;
    const { id } = req.params;
    const { days } = req.body;

    if (!days || days <= 0) {
      return res.status(400).json({ error: 'Days (positive number) is required' });
    }

    // Find listing
    const listing = await Listing.findOne({
      where: {
        id,
        businessId: business.id,
        status: 'active'
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Active listing not found' });
    }

    // Check if business has enough promotion credits
    if (business.promotionCreditBalance < days) {
      return res.status(400).json({ 
        error: 'Insufficient promotion credit balance',
        balance: business.promotionCreditBalance,
        required: days
      });
    }

    // Calculate new expiration date
    let expiresAt;
    
    if (listing.isHighlighted && listing.highlightExpiresAt > new Date()) {
      // Extend current promotion
      expiresAt = new Date(listing.highlightExpiresAt);
      expiresAt.setDate(expiresAt.getDate() + days);
    } else {
      // New promotion
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    }

    // Start a transaction
    const result = await Listing.sequelize.transaction(async (t) => {
      // Update listing promotion status
      await listing.update({
        isHighlighted: true,
        highlightExpiresAt: expiresAt
      }, { transaction: t });

      // Deduct credits from business
      await business.update({
        promotionCreditBalance: business.promotionCreditBalance - days
      }, { transaction: t });

      // Record credit usage
      const creditTransaction = await PromotionCredit.create({
        businessId: business.id,
        type: 'used',
        amount: days,
        listingId: listing.id,
        status: 'completed',
        metadata: {
          previousBalance: business.promotionCreditBalance,
          newBalance: business.promotionCreditBalance - days,
          highlightExpiresAt: expiresAt
        }
      }, { transaction: t });

      return { listing, creditTransaction };
    });

    return res.status(200).json({
      message: 'Listing promotion applied successfully',
      listing: {
        id: result.listing.id,
        title: result.listing.title,
        isHighlighted: true,
        highlightExpiresAt: result.listing.highlightExpiresAt
      },
      transaction: {
        id: result.creditTransaction.id,
        type: result.creditTransaction.type,
        amount: result.creditTransaction.amount,
        createdAt: result.creditTransaction.createdAt
      },
      newBalance: business.promotionCreditBalance - days
    });
  } catch (error) {
    console.error('Promote listing error:', error);
    return res.status(500).json({ error: 'Failed to promote listing' });
  }
}

/**
 * Get listing analytics
 */
async function getListingAnalytics(req, res) {
  try {
    const { business } = req;
    const { id } = req.params;
    const { period = '30' } = req.query; // Default 30 days

    // Find listing
    const listing = await Listing.findOne({
      where: {
        id,
        businessId: business.id
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Check if business has analytics access
    if (business.subscriptionTier === 'free') {
      return res.status(403).json({ 
        error: 'Analytics access requires Smart or Pro subscription',
        upgrade: true
      });
    }

    // Calculate start date for period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period, 10));

    // Get analytics data
    // In a real application, you would query analytics tables
    // This is a placeholder that returns basic statistics

    // Sample analytics data
    const analytics = {
      views: listing.views || 0,
      clicks: listing.clicks || 0,
      inquiries: listing.inquiries || 0,
      period: parseInt(period, 10),
      clickThroughRate: listing.views > 0 ? (listing.clicks / listing.views) * 100 : 0,
      conversionRate: listing.clicks > 0 ? (listing.inquiries / listing.clicks) * 100 : 0
    };

    return res.status(200).json({ analytics });
  } catch (error) {
    console.error('Get listing analytics error:', error);
    return res.status(500).json({ error: 'Failed to get listing analytics' });
  }
}

// Helper function to get display priority based on subscription tier
function getPriorityFromSubscription(tier) {
  switch (tier) {
    case 'pro':
      return 3;
    case 'smart':
      return 2;
    default:
      return 1;
  }
}

module.exports = {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  promoteListing,
  getListingAnalytics
}; 