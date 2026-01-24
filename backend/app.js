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
  'https://school-edglobe-novuspark.com',
  'https://eglobe-superadmin.vercel.app'
];

// Add localhost for development
if (!process.env.VERCEL) {
  allowedOrigins.push('http://localhost:4200');
}

// FIXED: Proper CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// REMOVED: app.options('*', cors()); - This was causing the error

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
// 4. Load Routes with better error handling
// ──────────────────────────────────────────────
const loadRoutes = () => {
  const routes = [
    { path: '/api/auth', file: './routes/auth', name: 'Auth' },
    { path: '/api/schools', file: './routes/school', name: 'Schools' },
    { path: '/api/plans', file: './routes/plans', name: 'Plans' },
    { path: '/api/bank', file: './routes/bank', name: 'Bank' },
    { path: '/api/superadmin', file: './routes/superadminRoutes', name: 'Superadmin' }
  ];

  routes.forEach(route => {
    try {
      const router = require(route.file);
      app.use(route.path, router);
      console.log(`✅ Loaded ${route.name} routes`);
    } catch (err) {
      console.error(`❌ Failed to load ${route.name} routes:`, err.message);
      // Create a stub route to prevent crashes
      const stubRouter = express.Router();
      stubRouter.all('*', (req, res) => {
        res.status(503).json({
          error: `Service unavailable: ${route.name}`,
          message: 'Route module failed to load'
        });
      });
      app.use(route.path, stubRouter);
    }
  });
};

// Load routes
loadRoutes();

// ──────────────────────────────────────────────
// 5. Routes
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

// Test route for routes
app.get('/api/test-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      if (middleware.handle.stack) {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            routes.push({
              path: handler.route.path,
              methods: Object.keys(handler.route.methods)
            });
          }
        });
      }
    }
  });
  
  res.json({
    routes: routes,
    total: routes.length
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      allowedOrigins: allowedOrigins
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// ──────────────────────────────────────────────
// 6. Export for Vercel
// ──────────────────────────────────────────────
module.exports = app;

// ──────────────────────────────────────────────
// 7. Local development server (only if not Vercel)
// ──────────────────────────────────────────────
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  });
}