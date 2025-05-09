const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Listing = sequelize.define('Listing', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Businesses',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'DOP', // Dominican Peso
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subcategory: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // For geographic searches
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    // Main image URL
    mainImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Additional images as JSON array of URLs
    images: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    // For search features
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    // Listing status
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending', 'sold', 'expired'),
      defaultValue: 'active',
    },
    // Promotion status
    isHighlighted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    highlightExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isPriority: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Display priority based on subscription (higher = shown first)
    displayPriority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Analytics for the listing
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    clicks: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    inquiries: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Contact information
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Metadata for additional properties specific to the category
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Indicates if this is a scraped listing (not created by a business user)
    isScraped: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Source of scraped listing, if applicable
    scrapedSource: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // External URL for scraped listings
    externalUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['businessId']
      },
      {
        fields: ['category']
      },
      {
        fields: ['status']
      },
      {
        fields: ['displayPriority']
      },
      {
        fields: ['isHighlighted']
      },
      {
        fields: ['location']
      },
      // For geospatial queries 
      {
        fields: ['latitude', 'longitude']
      }
    ]
  });

  return Listing;
}; 