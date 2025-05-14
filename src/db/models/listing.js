'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Listing extends Model {
    static associate(models) {
      // Define association with Business model
      Listing.belongsTo(models.Business, {
        foreignKey: 'business_id',
        as: 'business',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }
  }

  Listing.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    business_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'businesses',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 100]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 5000]
      }
    },
    short_description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        isIn: [['USD', 'DOP', 'EUR']]
      }
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['automotive', 'real_estate', 'electronics', 'furniture', 'services', 'other']]
      }
    },
    subcategory: {
      type: DataTypes.STRING,
      allowNull: true
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidImageArray(value) {
          if (!Array.isArray(value)) {
            throw new Error('Images must be an array');
          }
          if (value.length === 0) {
            throw new Error('At least one image is required');
          }
          if (value.length > 10) {
            throw new Error('Maximum 10 images allowed');
          }
          // Validate each image object
          value.forEach(img => {
            if (!img.url || !img.filename || !img.originalname) {
              throw new Error('Each image must have url, filename, and originalname');
            }
            // Validate image URL format
            if (!img.url.startsWith('/uploads/listings/')) {
              throw new Error('Invalid image URL format');
            }
          });
        }
      }
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isValidThumbnail(value) {
          if (!value.startsWith('/uploads/listings/')) {
            throw new Error('Invalid thumbnail URL format');
          }
        }
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive']]
      }
    },
    is_highlighted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    highlight_expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    featured_expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    views: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    likes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    shares: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 255]
      }
    },
    coordinates: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidCoordinates(value) {
          if (value && (!value.latitude || !value.longitude)) {
            throw new Error('Both latitude and longitude are required');
          }
        }
      }
    },
    contact_info: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      validate: {
        isValidContactInfo(value) {
          if (!value.phone && !value.email && !value.whatsapp) {
            throw new Error('At least one contact method is required');
          }
        }
      }
    },
    category_specific_fields: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      validate: {
        isValidCategoryFields(value) {
          // Validation will be done in the route based on category
        }
      }
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      validate: {
        isValidTagArray(value) {
          if (!value) return;
          if (!Array.isArray(value)) {
            value = value.split(',').map(tag => tag.trim());
          }
          if (value.length > 10) {
            throw new Error('Maximum 10 tags allowed');
          }
          // Validate individual tags
          value.forEach(tag => {
            if (tag.length > 30) {
              throw new Error('Each tag must be 30 characters or less');
            }
            if (!/^[a-zA-Z0-9-_]+$/.test(tag)) {
              throw new Error('Tags can only contain letters, numbers, hyphens, and underscores');
            }
          });
        }
      }
    },
    seo_metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        meta_title: '',
        meta_description: '',
        meta_keywords: []
      }
    },
    publish_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    expiry_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'Listing',
    tableName: 'listings',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['business_id']
      },
      {
        fields: ['category']
      },
      {
        fields: ['status']
      },
      {
        fields: ['is_highlighted']
      },
      {
        fields: ['is_featured']
      },
      {
        fields: ['publish_date']
      },
      {
        fields: ['expiry_date']
      },
      {
        fields: ['price']
      },
      {
        using: 'gin',
        fields: ['tags']
      },
      {
        using: 'gin',
        fields: ['category_specific_fields']
      }
    ]
  });

  return Listing;
}; 