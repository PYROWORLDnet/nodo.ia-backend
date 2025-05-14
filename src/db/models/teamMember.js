const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class TeamMember extends Model {
    static associate(models) {
      // Define association with Business model
      TeamMember.belongsTo(models.Business, {
        foreignKey: 'business_id',
        as: 'business'
      });
    }
  }

  TeamMember.init({
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'invited',
      validate: {
        isIn: [['invited', 'active', 'inactive']]
      }
    },
    invitation_token: {
      type: DataTypes.STRING,
      allowNull: true
    },
    invitation_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_session_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    can_manage_team: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    can_manage_subscription: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    can_manage_products: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    can_view_analytics: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'TeamMember',
    tableName: 'team_members',
    underscored: true,
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        fields: ['business_id']
      },
      {
        fields: ['email']
      },
      {
        fields: ['status']
      },
      {
        fields: ['invitation_token']
      }
    ]
  });

  return TeamMember;
}; 