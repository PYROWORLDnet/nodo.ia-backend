'use strict';

const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  class Business extends Model {
    static associate(models) {
      // Define association with Subscription model
      Business.hasMany(models.Subscription, {
        foreignKey: 'business_id',
        as: 'subscriptions'
      });
      
      Business.hasMany(models.Listing, {
        foreignKey: 'business_id',
        as: 'listings'
      });

      Business.hasMany(models.Invoice, {
        foreignKey: 'business_id',
        as: 'invoices'
      });
    }
  }

  Business.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    owner_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    business_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    identity_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [11, 11],
        isNumeric: true
      }
    },
    business_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    business_category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    business_address: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    business_phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'pending_verification', 'active', 'suspended', 'deleted']]
      }
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    verification_token: {
      type: DataTypes.STRING,
      allowNull: true
    },
    verification_token_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    password_reset_token: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    stripe_customer_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    subscription_tier: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'free',
      validate: {
        isIn: [['free', 'smart', 'pro']]
      }
    },
    listing_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 0
      }
    },
    highlight_credits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    used_listings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    next_credits_reset: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    profile_picture_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'Business',
    tableName: 'businesses',
    underscored: true,
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['identity_number']
      },
      {
        fields: ['stripe_customer_id']
      },
      {
        fields: ['subscription_tier']
      }
    ],
    hooks: {
      beforeCreate: async (business) => {
        if (business.password_hash) {
          business.password_hash = await bcrypt.hash(business.password_hash, 10);
        }
      },
      beforeUpdate: async (business) => {
        if (business.changed('password_hash')) {
          business.password_hash = await bcrypt.hash(business.password_hash, 10);
        }
      }
    }
  });

  return Business;
}; 