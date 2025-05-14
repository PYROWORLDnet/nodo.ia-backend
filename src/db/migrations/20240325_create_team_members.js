'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('team_members', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      business_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'businesses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'invited'
      },
      invitation_token: {
        type: Sequelize.STRING,
        allowNull: true
      },
      invitation_expires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      current_session_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      can_manage_team: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      can_manage_subscription: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      can_manage_products: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      can_view_analytics: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes
    await queryInterface.addIndex('team_members', ['business_id']);
    await queryInterface.addIndex('team_members', ['email']);
    await queryInterface.addIndex('team_members', ['status']);
    await queryInterface.addIndex('team_members', ['invitation_token']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('team_members');
  }
}; 