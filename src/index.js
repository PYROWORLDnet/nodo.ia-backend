const express = require('express');
const { initDb } = require('./db');
const { router: queryRoutes } = require('./routes/query');
require('dotenv').config();

// Initialize database
initDb().then(() => {
  // Create Express app
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Middleware
  app.use(express.json());
  
  // Routes
  app.use('/query', queryRoutes);
  
  // Basic health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Simple home route
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Vehicle NLP Query API with Dominican Assistant',
      endpoints: {
        '/query': 'POST - Process any natural language query (vehicles or Dominican topics)',
        '/query/clear-cache': 'POST - Clear caches',
        '/health': 'GET - Check API health'
      }
    });
  });
  
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
}); 