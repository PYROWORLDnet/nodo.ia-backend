const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Listing, Business, Subscription } = require('../db/init');
const { Op } = require('sequelize');
const { 
  businessAuthMiddleware, 
  requireProductManagement,
  optionalAuth 
} = require('../middleware/businessAuth');
const { sequelize } = require('../db/init');
const fs = require('fs').promises;
const sharp = require('sharp');

// Ensure upload directory exists
const createUploadDirectories = async () => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  const listingsDir = path.join(uploadDir, 'listings');
  const thumbnailsDir = path.join(listingsDir, 'thumbnails');
  
  for (const dir of [uploadDir, listingsDir, thumbnailsDir]) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
};

// Create upload directories
createUploadDirectories();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await createUploadDirectories();
    cb(null, 'uploads/listings/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedTypes.includes(ext)) {
    return cb(new Error(`Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`));
  }
  
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed.'));
  }
  
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 files
  }
}).array('images', 10);

// Helper function to process images
const processImages = async (files) => {
  const processedImages = [];
  
  for (const file of files) {
    const filename = path.basename(file.path);
    const thumbnailFilename = `thumb_${filename}`;
    const thumbnailPath = path.join(process.cwd(), 'uploads', 'listings', 'thumbnails', thumbnailFilename);
    
    try {
      // Resize and optimize the original image
      await sharp(file.path)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(file.path + '_optimized');
      
      // Create thumbnail
      await sharp(file.path)
        .resize(300, 300, {
          fit: 'cover',
          position: 'centre'
        })
        .jpeg({ quality: 70 })
        .toFile(thumbnailPath);
      
      // Replace original with optimized version
      await fs.unlink(file.path);
      await fs.rename(file.path + '_optimized', file.path);
      
      processedImages.push({
        url: `/uploads/listings/${filename}`,
        thumbnail_url: `/uploads/listings/thumbnails/${thumbnailFilename}`,
        filename: filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      });
    } catch (error) {
      console.error('Error processing image:', error);
      // Clean up on error
      await fs.unlink(file.path).catch(console.error);
      await fs.unlink(thumbnailPath).catch(console.error);
      throw new Error('Failed to process image');
    }
  }
  
  return processedImages;
};

// Helper function to clean up images
const cleanupImages = async (images) => {
  for (const image of images) {
    try {
      const imagePath = path.join(process.cwd(), 'uploads', 'listings', image.filename);
      const thumbnailPath = path.join(process.cwd(), 'uploads', 'listings', 'thumbnails', `thumb_${image.filename}`);
      
      await fs.unlink(imagePath).catch(() => {});
      await fs.unlink(thumbnailPath).catch(() => {});
    } catch (error) {
      console.error('Error cleaning up images:', error);
    }
  }
};

// Public routes with optional auth
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10
    } = req.query;

    const where = { status: 'active' };
    if (category) where.category = category;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    // If authenticated, include private listings for the business
    if (req.business) {
      where.business_id = req.business.id;
      delete where.status; // Show all statuses for own listings
    }

    const listings = await Listing.findAndCountAll({
      where,
      include: [{
        model: Business,
        as: 'business',
        attributes: ['business_name', 'business_category', 'profile_picture_url']
      }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: listings.rows,
      pagination: {
        total: listings.count,
        pages: Math.ceil(listings.count / limit),
        currentPage: parseInt(page),
        perPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get listings error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const where = { id: req.params.id };
    
    // If not authenticated, only show active listings
    if (!req.business) {
      where.status = 'active';
    }
    // If authenticated as business owner/team member, show all own listings
    else if (req.business) {
      where.business_id = req.business.id;
    }

    const listing = await Listing.findOne({
      where,
      include: [{
        model: Business,
        as: 'business',
        attributes: ['business_name', 'business_category', 'profile_picture_url']
      }]
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Get single listing error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/business/:businessId', optionalAuth, async (req, res) => {
  try {
    const { businessId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // First verify the business exists
    const business = await Business.findByPk(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }

    // Set up where clause based on authentication
    const where = { 
      business_id: businessId,
    };

    // If not authenticated or different business, only show active listings
    if (!req.business || req.business.id !== businessId) {
      where.status = 'active';
    }

    const { rows, count } = await Listing.findAndCountAll({
      where,
      include: [{
        model: Business,
        as: 'business',
        required: true,
        attributes: ['business_name', 'business_category', 'profile_picture_url', 'email', 'business_phone']
      }],
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    const transformedListings = rows.map(listing => {
      const plainListing = listing.get({ plain: true });
      return {
        id: plainListing.id,
        title: plainListing.title,
        description: plainListing.description,
        price: plainListing.price,
        category: plainListing.category,
        images: plainListing.images,
        tags: plainListing.tags,
        status: plainListing.status,
        category_specific_fields: plainListing.category_specific_fields,
        location: plainListing.location,
        contact_info: plainListing.contact_info,
        business_name: plainListing.business?.business_name,
        business_category: plainListing.business?.business_category,
        business_logo: plainListing.business?.profile_picture_url,
        business_email: plainListing.business?.email,
        business_phone: plainListing.business?.business_phone,
        created_at: plainListing.created_at
      };
    });

    res.json({
      success: true,
      data: transformedListings,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit
      }
    });
  } catch (error) {
    console.error('Get business listings error:', error);
    console.error('Error details:', error.stack);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Protected routes
router.use(businessAuthMiddleware);

// Routes that require product management permission
router.use(requireProductManagement);

// Create new listing
router.post('/', (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        error: err.code === 'LIMIT_FILE_SIZE' 
          ? 'File size too large. Maximum size is 5MB.'
          : err.code === 'LIMIT_FILE_COUNT'
          ? 'Too many files. Maximum is 10 images.'
          : err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Check if images were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one image is required'
        });
      }

      // Get form data
      const {
        title,
        description,
        price,
        currency = 'USD',
        category,
        location,
        contact_info,
        tags: rawTags,
        status = 'active'
      } = req.body;

      // Parse contact_info if it's a string
      let parsedContactInfo;
      try {
        parsedContactInfo = typeof contact_info === 'string' ? JSON.parse(contact_info) : contact_info;
      } catch (e) {
        await cleanupImages(req.files);
        return res.status(400).json({
          success: false,
          error: 'Invalid contact_info format'
        });
      }

      // Parse tags if it's a string
      let parsedTags;
      try {
        parsedTags = typeof rawTags === 'string' ? JSON.parse(rawTags) : rawTags;
        // Ensure tags is an array and has valid items
        if (!Array.isArray(parsedTags)) {
          throw new Error('Tags must be an array');
        }
        // Validate and clean tags
        parsedTags = parsedTags
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0 && tag.length <= 30)
          .slice(0, 10); // Limit to 10 tags
      } catch (e) {
        await cleanupImages(req.files);
        return res.status(400).json({
          success: false,
          error: 'Invalid tags format'
        });
      }

      // Basic validation
      if (!title || !description || !price || !category || !location) {
        await cleanupImages(req.files);
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, description, price, category, and location'
        });
      }

      // Validate contact info
      if (!parsedContactInfo || (
        !parsedContactInfo.phone && 
        !parsedContactInfo.email && 
        !parsedContactInfo.whatsapp
      )) {
        await cleanupImages(req.files);
        return res.status(400).json({
          success: false,
          error: 'At least one contact method (phone, email, or whatsapp) is required'
        });
      }

      // Check business credits
      const business = await Business.findByPk(req.business.id);
      
      if (!business) {
        await cleanupImages(req.files);
        return res.status(404).json({
          success: false,
          error: 'Business not found'
        });
      }

      // Check if business has available credits
      if (business.used_listings >= business.listing_limit) {
        await cleanupImages(req.files);
        return res.status(403).json({
          success: false,
          error: 'No listing credits available. Please upgrade your plan.',
          creditsUsed: business.used_listings,
          creditsTotal: business.listing_limit
        });
      }

      // Process images
      const processedImages = await processImages(req.files);

      // Create listing
      const listing = await Listing.create({
        business_id: req.business.id,
        title,
        description,
        price: parseFloat(price),
        currency,
        category,
        status,
        location,
        contact_info: parsedContactInfo,
        tags: parsedTags,
        images: processedImages,
        thumbnail: processedImages[0].thumbnail_url
      }, { transaction });

      // Update business used_listings count
      await business.increment('used_listings', { transaction });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: 'Listing created successfully',
        data: listing,
        credits: {
          used: business.used_listings + 1,
          total: business.listing_limit
        }
      });
    } catch (error) {
      await transaction.rollback();
      await cleanupImages(req.files);
      console.error('Create listing error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create listing'
      });
    }
  });
});

// Update listing
router.put('/:id', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    try {
      const listing = await Listing.findOne({
        where: {
          id: req.params.id,
          business_id: req.business.id
        }
      });

      if (!listing) {
        if (req.files) {
          await cleanupImages(req.files);
        }
        return res.status(404).json({
          success: false,
          error: 'Listing not found or unauthorized'
        });
      }

      const updateData = { ...req.body };

      // Process tags if provided
      if (updateData.tags) {
        updateData.tags = Array.isArray(updateData.tags) ? 
          updateData.tags : 
          updateData.tags.split(',')
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0)
            .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
            .slice(0, 10); // Limit to 10 tags
      }

      // Validate status if provided
      if (updateData.status && !['active', 'inactive'].includes(updateData.status)) {
        delete updateData.status;
      }

      // Process new images if uploaded
      if (req.files && req.files.length > 0) {
        const processedImages = await processImages(req.files);
        
        // If replacing all images
        if (updateData.replaceImages === 'true') {
          // Clean up old images
          await cleanupImages(listing.images);
          updateData.images = processedImages;
          updateData.thumbnail = processedImages[0].thumbnail_url;
        } else {
          // Append new images
          updateData.images = [...listing.images, ...processedImages];
          // Keep existing thumbnail if it exists
          if (!listing.thumbnail) {
            updateData.thumbnail = processedImages[0].thumbnail_url;
          }
        }
      }

      const updatedListing = await listing.update(updateData);

      res.json({
        success: true,
        data: updatedListing
      });
    } catch (error) {
      if (req.files) {
        await cleanupImages(req.files);
      }
      console.error('Update listing error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
});

// Delete listing
router.delete('/:id', async (req, res) => {
  try {
    const listing = await Listing.findOne({
      where: {
        id: req.params.id,
        business_id: req.business.id
      }
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found or unauthorized'
      });
    }

    // Clean up images
    await cleanupImages(listing.images);

    // Hard delete the listing
    await listing.destroy();

    // Decrement used listings count
    await req.business.decrement('used_listings');

    res.json({
      success: true,
      message: 'Listing deleted successfully',
      credits: {
        used: req.business.used_listings - 1,
        total: req.business.listing_credits,
        remaining: req.business.listing_credits - (req.business.used_listings - 1),
        nextReset: req.business.next_credits_reset
      }
    });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 