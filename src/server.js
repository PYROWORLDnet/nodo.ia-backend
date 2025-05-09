const { initApp } = require('./app');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const app = await initApp();
    
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`API URL: http://localhost:${PORT}`);
      }
    });
    
    // Handle graceful shutdown
    const gracefulShutdown = () => {
      console.log('Received shutdown signal, closing server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 