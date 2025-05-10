require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { initializeDatabase } = require('./db/init');
const { verifyEmailConfig } = require('./utils/emailService');
const routes = require('./routes');
const stripeWebhookRoutes = require('./routes/stripeWebhook');

// Initialize Express app
const app = express();

// Set trust proxy if behind a proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use('/api/webhooks/stripe', stripeWebhookRoutes);

// Middleware
app.use(helmet()); // Security headers
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(cookieParser());
app.use(cors()); // Enable CORS
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')); // Logging

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Default: 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await require('./db').sequelize.authenticate();
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// Register routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Initialize app
async function initApp() {
  try {
    // Initialize database
    await initializeDatabase().catch(error => {
      console.error('Database initialization failed:', error);
      // Don't throw error, let the app continue trying to start
    });
    
    // Start verifying email configuration in the background
    verifyEmailConfig().catch(error => {
      console.error('Email configuration verification failed:', error);
      // Don't throw error, let the app continue running
    });
    
    return app;
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // Don't throw error, return app anyway to allow for graceful handling
    return app;
  }
}

module.exports = {
  initApp
}; 