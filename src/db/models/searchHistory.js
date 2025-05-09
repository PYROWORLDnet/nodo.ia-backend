const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SearchHistory = sequelize.define('SearchHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    query: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    response: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    isFavorite: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['isFavorite']
      }
    ]
  });

  return SearchHistory;
}; 