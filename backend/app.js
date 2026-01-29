const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Configure dotenv ONLY if not in Vercel
if (!process.env.VERCEL) {
  require('dotenv').config();
  console.log('Loaded dotenv for local development');
} else {
  console.log('Running on Vercel - using environment variables');
}

const app = express();

// ──────────────────────────────────────────────
// 1. CORS Configuration for Vercel
// ──────────────────────────────────────────────
const allowedOrigins = [
  'https://superadmin-edglobe-novuspark.com',
  'https://eglobe-superadmin.vercel.app',
  'https://eglobe-novuspark-superadmin.vercel.app'
];

// Add localhost for development
if (!process.env.VERCEL) {
  allowedOrigins.push('http://localhost:4200');
}

// Simple CORS
// Enhanced CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }
    
    console.log('CORS origin check:', origin); // Debug log
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Allow all Vercel preview URLs
    if (origin.includes('.vercel.app')) {
      console.log('Allowing Vercel origin:', origin);
      return callback(null, true);
    }
    
    console.log('Blocked CORS origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'Authorization'],
  optionsSuccessStatus: 204
}));

// ──────────────────────────────────────────────
// 2. Security & Middleware
// ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false // Disable for now to avoid issues
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/auth', authLimiter);

// ──────────────────────────────────────────────
// 3. MongoDB Connection (Vercel-safe)
// ──────────────────────────────────────────────
const connectDB = async () => {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected successfully');
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
      // Don't exit in serverless!
    }
  } else {
    console.log('⚠️ MONGODB_URI not set - running without database');
  }
};

// Connect to DB
connectDB();

// ──────────────────────────────────────────────
// 4. Load Routes - SIMPLIFIED for Vercel
// ──────────────────────────────────────────────
const loadRoute = (path, file, name) => {
  try {
    logger.info(`Loading ${name} routes...`);
    const router = require(file);
    app.use(path, router);
    logger.info(`   ✓ ${name} loaded`);
  } catch (err) {
    logger.error(`   ✗ Failed to load ${name}:`, err.message);
  }
};

// Try to load routes
loadRoute('/api/auth', './routes/auth', 'Auth');
loadRoute('/api/schools', './routes/school', 'Schools');
loadRoute('/api/plans', './routes/plans', 'Plans');
loadRoute('/api/bank', './routes/bank', 'Bank');
loadRoute('/api/superadmin', './routes/superadminRoutes', 'Superadmin');

// ──────────────────────────────────────────────
// 5. Basic Routes (Always Available)
// ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'Superadmin API',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    routesAvailable: [
      '/api/auth',
      '/api/schools', 
      '/api/plans',
      '/api/bank',
      '/api/superadmin'
    ]
  });
});

// ──────────────────────────────────────────────
// 6. 404 Handler - FIXED: Use regex instead of '*'
// ──────────────────────────────────────────────
// IMPORTANT: This MUST be the LAST route before error handlers
app.use((req, res, next) => {
  // Check if this is an API route that wasn't handled
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  } else {
    // For non-API routes, also return JSON
    res.status(404).json({
      error: 'Not found',
      message: 'Use API routes starting with /api/',
      availableRoutes: ['/', '/api/health', '/api/test']
    });
  }
});

// ──────────────────────────────────────────────
// 7. Global error handler
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString()
  });
});

// ──────────────────────────────────────────────
// 8. Export for Vercel
// ──────────────────────────────────────────────
module.exports = app;

// ──────────────────────────────────────────────
// 9. Local development server (only if not Vercel)
// ──────────────────────────────────────────────
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  });
}