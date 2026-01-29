const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path'); // ADD THIS

// Configure dotenv ONLY if not in Vercel
if (!process.env.VERCEL) {
  require('dotenv').config();
  console.log('Loaded dotenv for local development');
} else {
  console.log('Running on Vercel - using environment variables');
}

const app = express();
app.set('trust proxy', 1);

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

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'https://eglobe-novuspark-superadmin.vercel.app',
    'https://eglobe-superadmin.vercel.app'
  ],
  credentials: true
}));

// ──────────────────────────────────────────────
// 2. Security & Middleware
// ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use the X-Forwarded-For header in Vercel
    return req.headers['x-forwarded-for'] || req.ip;
  }
});
app.use('/api/auth', authLimiter);

// ──────────────────────────────────────────────
// 3. MongoDB Connection (Vercel-safe)
// ──────────────────────────────────────────────
const connectDB = async () => {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected successfully');
    } catch (err) {
      console.error('❌ MongoDB connection error:', err.message);
    }
  } else {
    console.log('⚠️ MONGODB_URI not set - running without database');
  }
};

connectDB();

// ──────────────────────────────────────────────
// 4. Load Routes - FIXED for Vercel
// ──────────────────────────────────────────────
const loadRoutes = () => {
  try {
    // Load each route with absolute paths
    const authRoutes = require('./routes/auth');
    const schoolRoutes = require('./routes/school');
    const plansRoutes = require('./routes/plans');
    const bankRoutes = require('./routes/bank');
    const superadminRoutes = require('./routes/superadminRoutes');
    
    // Use routes
    app.use('/api/auth', authRoutes);
    app.use('/api/schools', schoolRoutes);
    app.use('/api/plans', plansRoutes);
    app.use('/api/bank', bankRoutes);
    app.use('/api/superadmin', superadminRoutes);
    
    console.log('✅ All routes loaded successfully');
    
  } catch (err) {
    console.error('❌ Error loading routes:', err.message);
    console.error('Stack:', err.stack);
    
    // Create fallback routes so API doesn't return 404
    createFallbackRoutes();
  }
};

// Fallback routes if actual routes fail to load
const createFallbackRoutes = () => {
  console.log('Creating fallback routes...');
  
  // Fallback auth route
  app.post('/api/auth/login', (req, res) => {
    console.log('Fallback login route called:', req.body);
    res.json({
      success: false,
      message: 'Auth routes not loaded. Check server logs.',
      fallback: true
    });
  });
  
  // Fallback health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'partial',
      message: 'Routes not loaded properly',
      timestamp: new Date().toISOString()
    });
  });
};

// Try to load routes
loadRoutes();

// ──────────────────────────────────────────────
// 5. Basic Routes (Always Available)
// ──────────────────────────────────────────────
// TEST ENDPOINT - Add this to verify routes work
app.get('/api/test-route', (req, res) => {
  res.json({
    message: 'Test route is working',
    routes: {
      auth: '/api/auth',
      schools: '/api/schools',
      plans: '/api/plans',
      bank: '/api/bank',
      superadmin: '/api/superadmin'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Superadmin API',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/',
      '/api/health',
      '/api/test-route',
      '/api/auth/login',
      '/api/schools',
      '/api/plans',
      '/api/bank',
      '/api/superadmin'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    routesLoaded: true
  });
});

// ──────────────────────────────────────────────
// 6. 404 Handler
// ──────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method,
      availableRoutes: [
        '/api/auth/login',
        '/api/health',
        '/api/test-route'
      ],
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      error: 'Not found',
      message: 'Use API routes starting with /api/'
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