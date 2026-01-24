const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const logger = console;

// ──────────────────────────────────────────────
// 1. CORS
// ──────────────────────────────────────────────
const allowedOrigins = [
  'https://superadmin-edglobe-novuspark.com',
  'https://school-edglobe-novuspark.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ──────────────────────────────────────────────
// 2. Security
// ──────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));

// ──────────────────────────────────────────────
// 3. Body parsing
// ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// 4. Rate limit
// ──────────────────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// ──────────────────────────────────────────────
// 5. MongoDB (IMPORTANT: no process.exit)
// ──────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error('Mongo error:', err.message));

// ──────────────────────────────────────────────
// 6. Routes
// ──────────────────────────────────────────────
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

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: err.message });
});

module.exports = app;
