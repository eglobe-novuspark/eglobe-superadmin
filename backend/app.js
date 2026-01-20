const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Optional: logger (use console if you don't have one)
const logger = console;

const app = express();

// ──────────────────────────────────────────────
// 1. VERY FIRST: CORS - must handle all responses, including errors
// ──────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:4200',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// ──────────────────────────────────────────────
// 2. Security headers (after CORS)
// ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', ...allowedOrigins],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://*.razorpay.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", ...allowedOrigins, 'https://api.razorpay.com'],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ──────────────────────────────────────────────
// 3. Body parsing & logging
// ──────────────────────────────────────────────
app.use(morgan('dev')); // change to 'combined' in production
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/auth', authLimiter);

// ──────────────────────────────────────────────
// 4. MongoDB Connection
// ──────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => logger.info('MongoDB connected successfully'))
  .catch(err => {
    logger.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ──────────────────────────────────────────────
// 5. Socket.IO Setup (if needed)
// ──────────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io/',
  pingTimeout: 60000,
  pingInterval: 25000
});

app.set('io', io);

// ──────────────────────────────────────────────
// 6. Load Routes
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

loadRoute('/api/auth', './routes/auth', 'Auth');
loadRoute('/api/schools', './routes/school', 'Schools');
loadRoute('/api/plans', './routes/plans', 'Plans');
loadRoute('/api/bank', './routes/bank', 'Bank');
loadRoute('/api/superadmin', './routes/superadminRoutes', 'Superadmin');

// Health check (always available)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// ──────────────────────────────────────────────
// Start Server (local only)
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3002;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Superadmin server running on http://localhost:${PORT}`);
    logger.info(`Allowed origins:`, allowedOrigins);
  });
} else {
  // For Vercel / serverless - export the server
  module.exports = server;
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down...`);
  await mongoose.connection.close();
  logger.info('MongoDB closed.');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));