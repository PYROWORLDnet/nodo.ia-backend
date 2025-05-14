require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initializeDatabase } = require('./db');
const { verifyEmailConfig } = require('./utils/emailService');
const routes = require('./routes');
const stripeWebhookRoutes = require('./routes/stripeWebhook');
const { createUploadDirectories } = require('./config/upload');
const { startJobs } = require('./jobs');

// Initialize Express app
const app = express();

// Set trust proxy if behind a proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Regular middleware for all routes except webhooks
app.use((req, res, next) => {
  if (req.originalUrl !== '/api/webhooks/stripe') {
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    next();
  }
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Enable CORS for all routes
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
  credentials: true,
  exposedHeaders: ['Content-Disposition', 'Cross-Origin-Resource-Policy']
};

app.use(cors(corsOptions));

// Stripe webhook route (must be before other middleware)
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || '*'],
    }
  }
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
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
    const { sequelize } = require('./db');
    await sequelize.authenticate();
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// Create necessary upload directories
createUploadDirectories();

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

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
const initApp = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Start verifying email configuration in the background
    verifyEmailConfig().catch(error => {
      console.error('Email configuration verification failed:', error);
      // Don't throw error, let the app continue running
    });

    // Start cron jobs
    startJobs();
    
    return app;
  } catch (error) {
    console.error('Failed to initialize app:', error);
    throw error; // Throw error to prevent app from starting with failed database
  }
};

module.exports = {
  initApp
}; 