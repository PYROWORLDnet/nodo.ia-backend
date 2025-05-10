const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeamMember = sequelize.define('TeamMember', {
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'editor', 'viewer'),
      defaultValue: 'viewer',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending', 'blocked', 'removed', 'invited'),
      defaultValue: 'pending',
    },
    invitationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invitationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Permissions
    canManageTeam: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canManageSubscription: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canManageProducts: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    canViewAnalytics: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    timestamps: true,
  });

  return TeamMember;
}; 