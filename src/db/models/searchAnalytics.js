const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SearchAnalytics = sequelize.define('SearchAnalytics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Can be null for anonymous searches
    businessId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Businesses',
        key: 'id',
      },
    },
    // Search query text
    query: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    // Category searched
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Location searched
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Search filters used as JSON
    filters: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    // Number of results returned
    resultCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Device information
    deviceType: {
      type: DataTypes.ENUM('mobile', 'tablet', 'desktop', 'unknown'),
      defaultValue: 'unknown',
    },
    // Browser info
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // IP address (hashed/anonymized)
    ipHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Session ID to track user journey
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // User behavior
    clickedResults: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    // How long the search took in ms
    responseTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // If the search led to a contact/inquiry
    leadToInquiry: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    // Geographic coordinates (if available)
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
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
        fields: ['location']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['query']
      },
      {
        fields: ['deviceType']
      }
    ]
  });

  return SearchAnalytics;
}; 