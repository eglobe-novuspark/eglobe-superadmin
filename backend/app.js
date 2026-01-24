const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ──────────────────────────────────────────────
// 1. Configuration
// ──────────────────────────────────────────────
const NODE_ENV = process.env.NODE_ENV || 'production';
const IS_VERCEL = process.env.VERCEL === '1';

// Production domains - UPDATE THESE WITH YOUR ACTUAL DOMAINS
const PRODUCTION_DOMAINS = [
  'https://superadmin-edglobe-novuspark.com',
  'https://school-edglobe-novuspark.com',
  'https://eglobe-superadmin.vercel.app'
];

// Development domains
const DEVELOPMENT_DOMAINS = [
  'http://localhost:4200',
  'http://localhost:3000'
];

// Combine allowed origins based on environment
const ALLOWED_ORIGINS = NODE_ENV === 'production' 
  ? PRODUCTION_DOMAINS
  : [...PRODUCTION_DOMAINS, ...DEVELOPMENT_DOMAINS];

// Logger configuration
const logger = {
  info: (...args) => console.log(`[INFO] ${new Date().toISOString()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${new Date().toISOString()}`, ...args),
  warn: (...args) => console.warn(`[WARN] ${new Date().toISOString()}`, ...args)
};

// ──────────────────────────────────────────────
// 2. Middleware Stack
// ──────────────────────────────────────────────

// a) Compression (reduce response size)
app.use(compression());

// b) CORS with production security
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-API-Key'
  ],
  exposedHeaders: ['X-Response-Time'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204
}));

// c) Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...ALLOWED_ORIGINS],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// d) Request logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// e) Body parsing
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// ──────────────────────────────────────────────
// 3. Rate Limiting
// ──────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 200 : 1000, // Different limits for prod/dev
  message: {
    status: 429,
    error: 'Too many requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Stricter limit for auth endpoints
  message: {
    status: 429,
    error: 'Too many authentication attempts. Please try again later.'
  }
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);

// ──────────────────────────────────────────────
// 4. MongoDB Connection (Production Optimized)
// ──────────────────────────────────────────────
const MONGODB_CONFIG = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 10000,
  retryWrites: true,
  w: 'majority'
};

let isDBConnected = false;

const connectWithRetry = async (retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, MONGODB_CONFIG);
      isDBConnected = true;
      logger.info('✅ MongoDB connected successfully');
      
      // Connection event handlers
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err.message);
        isDBConnected = false;
      });
      
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        isDBConnected = false;
      });
      
      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        isDBConnected = true;
      });
      
      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${i + 1} failed:`, err.message);
      
      if (i < retries - 1) {
        logger.info(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error('All MongoDB connection attempts failed');
        // In serverless, we don't exit - app can still handle requests
      }
    }
  }
};

// Start connection (non-blocking)
if (!IS_VERCEL) {
  // In traditional server, connect immediately
  connectWithRetry();
} else {
  // In Vercel serverless, connect on first request
  app.use(async (req, res, next) => {
    if (!isDBConnected && mongoose.connection.readyState === 0) {
      await connectWithRetry();
    }
    next();
  });
}

// ──────────────────────────────────────────────
// 5. Request Logging Middleware
// ──────────────────────────────────────────────
app.use((req, res, next) => {
  req.startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ──────────────────────────────────────────────
// 6. Routes Loading with Error Handling
// ──────────────────────────────────────────────
const loadRoutes = () => {
  const routes = [
    { path: '/api/auth', file: './routes/auth', name: 'Authentication' },
    { path: '/api/schools', file: './routes/school', name: 'Schools' },
    { path: '/api/plans', file: './routes/plans', name: 'Plans' },
    { path: '/api/bank', file: './routes/bank', name: 'Bank' },
    { path: '/api/superadmin', file: './routes/superadminRoutes', name: 'Superadmin' }
  ];

  routes.forEach(route => {
    try {
      // Use require with error handling
      const router = require(route.file);
      app.use(route.path, router);
      logger.info(`✓ ${route.name} routes loaded`);
    } catch (err) {
      logger.error(`✗ Failed to load ${route.name} routes:`, err.message);
      // Create a stub router to prevent crashes
      const express = require('express');
      const stubRouter = express.Router();
      stubRouter.all('*', (req, res) => {
        res.status(503).json({
          error: `Service temporarily unavailable: ${route.name}`,
          message: 'Route module failed to load'
        });
      });
      app.use(route.path, stubRouter);
    }
  });
};

loadRoutes();

// ──────────────────────────────────────────────
// 7. Health & Status Endpoints
// ──────────────────────────────────────────────

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Superadmin API',
    version: '1.0.0',
    status: 'operational',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    documentation: '/api/health'
  });
});

// Health check (for load balancers & monitoring)
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'superadmin-api',
    version: '1.0.0',
    environment: NODE_ENV,
    
    dependencies: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      database: isDBConnected ? 'connected' : 'disconnected'
    },
    
    system: {
      node: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    },
    
    request: {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }
  };

  const status = health.dependencies.mongodb === 'connected' ? 200 : 503;
  res.status(status).json(health);
});

// Readiness probe (for Kubernetes)
app.get('/api/ready', (req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  
  if (isReady) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      message: 'Database not connected',
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe
app.get('/api/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// ──────────────────────────────────────────────
// 8. 404 Handler
// ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      '/api/auth',
      '/api/schools',
      '/api/plans',
      '/api/bank',
      '/api/superadmin',
      '/api/health'
    ]
  });
});

// ──────────────────────────────────────────────
// 9. Global Error Handler
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Log error with context
  logger.error('Global Error Handler:', {
    message: err.message,
    stack: NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token'
    });
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(503).json({
      error: 'Database Error',
      message: 'A database error occurred. Please try again later.'
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const response = {
    error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || Math.random().toString(36).substr(2, 9)
  };

  // Add stack trace in non-production
  if (NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// ──────────────────────────────────────────────
// 10. Export for Vercel Serverless
// ──────────────────────────────────────────────
module.exports = app;

// ──────────────────────────────────────────────
// 11. Local Server (Only for non-Vercel)
// ──────────────────────────────────────────────
if (!IS_VERCEL) {
  const PORT = process.env.PORT || 3002;
  
  // Start server
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Production server started on port ${PORT}`);
    logger.info(`Environment: ${NODE_ENV}`);
    logger.info(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
    logger.info(`Health check: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');
      
      // Close MongoDB connection
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      }
      
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  // Handle termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}