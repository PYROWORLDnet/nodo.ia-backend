const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true, // Apple Sign In might not provide email
    },
    appleId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    timestamps: true,
  });

  return User;
}; 