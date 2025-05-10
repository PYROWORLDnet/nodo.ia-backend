const { initApp } = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize app immediately
    const app = await initApp();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`API URL: http://localhost:${PORT}`);
      }
    });
    
    // Handle graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async () => {
        console.log('Server closed');
        
        try {
          // Close database connections if needed
          const { sequelize } = require('./db');
          await sequelize.close();
          console.log('Database connections closed');
          
          process.exit(0);
        } catch (error) {
          console.error('Error during cleanup:', error);
          process.exit(1);
        }
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 