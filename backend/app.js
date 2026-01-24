const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const logger = console;

/* ──────────────────────────────────────────────
   1. MongoDB connection (SERVERLESS SAFE)
────────────────────────────────────────────── */

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false
    }).then(mongoose => mongoose);
  }

  cached.conn = await cached.promise;
  logger.info('MongoDB connected');
  return cached.conn;
}

/* ──────────────────────────────────────────────
   2. CORS
────────────────────────────────────────────── */

const allowedOrigins = [
  'https://superadmin-edglobe-novuspark.com',
  'https://school-edglobe-novuspark.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

/* ──────────────────────────────────────────────
   3. Security & logging
────────────────────────────────────────────── */

app.use(helmet());
app.use(morgan('dev'));

/* ──────────────────────────────────────────────
   4. Body parsing
────────────────────────────────────────────── */

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ──────────────────────────────────────────────
   5. Rate limiting
────────────────────────────────────────────── */

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

/* ──────────────────────────────────────────────
   6. Ensure DB connected for every request
────────────────────────────────────────────── */

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    logger.error('DB connection failed:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

/* ──────────────────────────────────────────────
   7. Routes
────────────────────────────────────────────── */

app.use('/api/auth', require('./routes/auth'));
app.use('/api/schools', require('./routes/school'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/bank', require('./routes/bank'));
app.use('/api/superadmin', require('./routes/superadminRoutes'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    mongodb: mongoose.connection.readyState === 1
  });
});

/* ──────────────────────────────────────────────
   8. 404 handler
────────────────────────────────────────────── */

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

/* ──────────────────────────────────────────────
   9. Error handler
────────────────────────────────────────────── */

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
