require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { db, initializeDatabase } = require('./db');
const routes = require('./routes');
const stripeWebhookRoutes = require('./routes/stripeWebhook');
const { createUploadDirectories } = require('./config/upload');
const { startJobs } = require('./jobs');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');

// Initialize Express app
const app = express();

// Enable trust proxy - this is needed when behind a reverse proxy
app.set('trust proxy', true);

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

// Enable CORS
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

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1, // Only trust first proxy
  skip: (req) => req.path === '/health', // Skip rate limiting for health checks
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available, otherwise use IP
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // Get the first IP in the chain (client IP)
      return forwardedFor.split(',')[0].trim();
    }
    return req.ip;
  }
});
app.use('/api/', limiter);

// Compression
app.use(compression());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: result[0].now
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database connection failed'
    });
  }
});

// Create upload directories
createUploadDirectories();

// Serve static files
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api', routes);
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);

// Error handling
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
    console.log('🚀 Initializing application...');

    // Initialize database
    await initializeDatabase();

    // Start background jobs
    console.log('⚙️ Starting background jobs...');
    startJobs();
    
    console.log('✅ Application initialized successfully');
    return app;
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    // Log error but don't throw to allow graceful handling
    return app;
  }
};

// Export the app
module.exports = { initApp }; 