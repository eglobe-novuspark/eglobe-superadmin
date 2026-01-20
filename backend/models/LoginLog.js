// models/LoginLog.js
const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: String,
  role: String,
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },

  ip: String,
  city: String,
  country: String,
  device: String,
  browser: String,
  os: String,

  status: { type: String, enum: ['success', 'failed'], required: true },
  reason: String,
}, { timestamps: true });

module.exports = mongoose.model('LoginLog', loginLogSchema);