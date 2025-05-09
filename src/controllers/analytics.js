const { Business, Listing, SearchAnalytics } = require('../db');
const { Op, Sequelize } = require('sequelize');

/**
 * Get dashboard analytics summary
 */
async function getDashboardAnalytics(req, res) {
  try {
    const { business } = req;
    
    // Check subscription tier
    if (business.subscriptionTier === 'free') {
      return res.status(403).json({ 
        error: 'Analytics access requires Smart or Pro subscription',
        upgrade: true
      });
    }

    // Get period from query or default to 30 days
    const period = req.query.period || '30';
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period, 10));

    // Get count of active listings
    const activeListingsCount = await Listing.count({
      where: {
        businessId: business.id,
        status: 'active'
      }
    });

    // Get total views
    const totalViews = await Listing.sum('views', {
      where: {
        businessId: business.id,
        status: 'active'
      }
    }) || 0;

    // Get total clicks
    const totalClicks = await Listing.sum('clicks', {
      where: {
        businessId: business.id,
        status: 'active'
      }
    }) || 0;

    // Get total inquiries
    const totalInquiries = await Listing.sum('inquiries', {
      where: {
        businessId: business.id,
        status: 'active'
      }
    }) || 0;

    // Get highlighted listings count
    const highlightedListingsCount = await Listing.count({
      where: {
        businessId: business.id,
        status: 'active',
        isHighlighted: true,
        highlightExpiresAt: { [Op.gt]: new Date() }
      }
    });

    // Get search analytics count
    const searchCount = await SearchAnalytics.count({
      where: {
        businessId: business.id,
        createdAt: { [Op.gte]: startDate }
      }
    });

    // Return compiled analytics
    const analytics = {
      activeListings: activeListingsCount,
      highlightedListings: highlightedListingsCount,
      period: parseInt(period, 10),
      views: totalViews,
      clicks: totalClicks,
      inquiries: totalInquiries,
      clickThroughRate: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
      conversionRate: totalClicks > 0 ? (totalInquiries / totalClicks) * 100 : 0,
      searchAppearances: searchCount
    };

    return res.status(200).json({ analytics });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    return res.status(500).json({ error: 'Failed to get dashboard analytics' });
  }
}

/**
 * Get listing performance analytics
 */
async function getListingPerformance(req, res) {
  try {
    const { business } = req;
    
    // Check subscription tier
    if (business.subscriptionTier === 'free') {
      return res.status(403).json({ 
        error: 'Analytics access requires Smart or Pro subscription',
        upgrade: true
      });
    }

    // Get period from query or default to 30 days
    const limit = parseInt(req.query.limit || '10', 10);
    
    // Get top performing listings by views
    const topListings = await Listing.findAll({
      where: {
        businessId: business.id,
        status: 'active'
      },
      attributes: [
        'id', 
        'title', 
        'category', 
        'views', 
        'clicks', 
        'inquiries',
        'isHighlighted',
        'highlightExpiresAt',
        [Sequelize.literal('CAST(clicks AS FLOAT) / NULLIF(views, 0)'), 'clickThroughRate'],
        [Sequelize.literal('CAST(inquiries AS FLOAT) / NULLIF(clicks, 0)'), 'conversionRate']
      ],
      order: [['views', 'DESC']],
      limit: limit
    });

    // Format the results
    const formattedListings = topListings.map(listing => ({
      id: listing.id,
      title: listing.title,
      category: listing.category,
      views: listing.views || 0,
      clicks: listing.clicks || 0,
      inquiries: listing.inquiries || 0,
      isHighlighted: listing.isHighlighted,
      highlightActive: listing.isHighlighted && listing.highlightExpiresAt > new Date(),
      clickThroughRate: listing.getDataValue('clickThroughRate') ? 
        parseFloat(listing.getDataValue('clickThroughRate')) * 100 : 0,
      conversionRate: listing.getDataValue('conversionRate') ?
        parseFloat(listing.getDataValue('conversionRate')) * 100 : 0
    }));

    return res.status(200).json({ 
      listings: formattedListings,
      total: await Listing.count({
        where: {
          businessId: business.id,
          status: 'active'
        }
      })
    });
  } catch (error) {
    console.error('Get listing performance error:', error);
    return res.status(500).json({ error: 'Failed to get listing performance analytics' });
  }
}

/**
 * Get search analytics
 */
async function getSearchAnalytics(req, res) {
  try {
    const { business } = req;
    
    // Check subscription tier
    if (business.subscriptionTier === 'free') {
      return res.status(403).json({ 
        error: 'Analytics access requires Smart or Pro subscription',
        upgrade: true
      });
    }

    // Get period from query or default to 30 days
    const period = req.query.period || '30';
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period, 10));

    // Get search terms frequency
    const searchTerms = await SearchAnalytics.findAll({
      attributes: [
        'query',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        businessId: business.id,
        createdAt: { [Op.gte]: startDate }
      },
      group: ['query'],
      order: [[Sequelize.literal('count'), 'DESC']],
      limit: 10
    });

    // Get category frequency
    const categories = await SearchAnalytics.findAll({
      attributes: [
        'category',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        businessId: business.id,
        createdAt: { [Op.gte]: startDate },
        category: { [Op.ne]: null }
      },
      group: ['category'],
      order: [[Sequelize.literal('count'), 'DESC']],
      limit: 5
    });

    // Get location frequency
    const locations = await SearchAnalytics.findAll({
      attributes: [
        'location',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        businessId: business.id,
        createdAt: { [Op.gte]: startDate },
        location: { [Op.ne]: null }
      },
      group: ['location'],
      order: [[Sequelize.literal('count'), 'DESC']],
      limit: 5
    });

    // Get device type distribution
    const deviceTypes = await SearchAnalytics.findAll({
      attributes: [
        'deviceType',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        businessId: business.id,
        createdAt: { [Op.gte]: startDate }
      },
      group: ['deviceType'],
      order: [[Sequelize.literal('count'), 'DESC']]
    });

    // Format the results
    const formatResults = (items) => {
      return items.map(item => ({
        label: item.getDataValue('query') || item.getDataValue('category') || 
               item.getDataValue('location') || item.getDataValue('deviceType'),
        count: parseInt(item.getDataValue('count'), 10)
      }));
    };

    return res.status(200).json({
      period: parseInt(period, 10),
      searchTerms: formatResults(searchTerms),
      categories: formatResults(categories),
      locations: formatResults(locations),
      deviceTypes: formatResults(deviceTypes),
      totalSearches: await SearchAnalytics.count({
        where: {
          businessId: business.id,
          createdAt: { [Op.gte]: startDate }
        }
      })
    });
  } catch (error) {
    console.error('Get search analytics error:', error);
    return res.status(500).json({ error: 'Failed to get search analytics' });
  }
}

/**
 * Get geographic analytics
 */
async function getGeographicAnalytics(req, res) {
  try {
    const { business } = req;
    
    // Check subscription tier - Pro only for geographic data
    if (business.subscriptionTier !== 'pro') {
      return res.status(403).json({ 
        error: 'Geographic analytics requires Pro subscription',
        upgrade: true
      });
    }

    // Get period from query or default to 30 days
    const period = req.query.period || '30';
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period, 10));

    // Get geographic points for heatmap
    const geoPoints = await SearchAnalytics.findAll({
      attributes: [
        'latitude',
        'longitude',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      where: {
        businessId: business.id,
        createdAt: { [Op.gte]: startDate },
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null }
      },
      group: ['latitude', 'longitude'],
      order: [[Sequelize.literal('count'), 'DESC']],
      limit: 100
    });

    // Format the results
    const heatmapData = geoPoints.map(point => ({
      lat: parseFloat(point.latitude),
      lng: parseFloat(point.longitude),
      weight: parseInt(point.getDataValue('count'), 10)
    }));

    return res.status(200).json({
      period: parseInt(period, 10),
      heatmapData,
      totalPoints: heatmapData.length
    });
  } catch (error) {
    console.error('Get geographic analytics error:', error);
    return res.status(500).json({ error: 'Failed to get geographic analytics' });
  }
}

/**
 * Record listing view/click event
 * This endpoint would be called from the frontend when a user views or clicks a listing
 */
async function recordListingEvent(req, res) {
  try {
    const { id, eventType } = req.params;

    if (!['view', 'click', 'inquiry'].includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    // Find listing
    const listing = await Listing.findByPk(id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Update the appropriate counter
    const updateData = {};
    if (eventType === 'view') {
      updateData.views = Sequelize.literal('views + 1');
    } else if (eventType === 'click') {
      updateData.clicks = Sequelize.literal('clicks + 1');
    } else if (eventType === 'inquiry') {
      updateData.inquiries = Sequelize.literal('inquiries + 1');
    }

    await listing.update(updateData);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Record listing event error:', error);
    return res.status(500).json({ error: 'Failed to record listing event' });
  }
}

module.exports = {
  getDashboardAnalytics,
  getListingPerformance,
  getSearchAnalytics,
  getGeographicAnalytics,
  recordListingEvent
}; 