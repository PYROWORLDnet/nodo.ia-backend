'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, modify the enum type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_TeamMembers_status" ADD VALUE IF NOT EXISTS 'invited';
    `);

    // Update any existing pending records to invited if needed
    await queryInterface.sequelize.query(`
      UPDATE "TeamMembers"
      SET status = 'invited'
      WHERE status = 'pending' AND "invitationToken" IS NOT NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Convert any 'invited' status back to 'pending'
    await queryInterface.sequelize.query(`
      UPDATE "TeamMembers"
      SET status = 'pending'
      WHERE status = 'invited';
    `);
  }
}; 