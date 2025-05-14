const resetCreditsJob = require('./creditResetJob');

const startJobs = () => {
  console.log('Starting cron jobs...');
  resetCreditsJob.start();
  console.log('All cron jobs started');
};

module.exports = {
  startJobs
}; 