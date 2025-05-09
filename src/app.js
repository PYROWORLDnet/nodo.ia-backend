require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { initDb } = require('./db');
const routes = require('./routes');
const stripeWebhookRoutes = require('./routes/stripeWebhook');

// Initialize Express app
const app = express();

// Set trust proxy if behind a proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Stripe webhook route must be registered before body parser middleware
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
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Don't leak error details in production
  const error = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message;
  
  res.status(statusCode).json({
    error: error,
    status: statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Initialize app with database connection
async function initApp() {
  try {
    // Initialize database
    await initDb();
    console.log('Database initialized successfully');
    return app;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

module.exports = { app, initApp }; 