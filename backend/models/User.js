const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, sparse: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'student', 'parent'], required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  pushSubscriptions: [{ endpoint: String, keys: { p256dh: String, auth: String } }],
  phoneNumber: {
    type: String,
    match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number (e.g., +919876543210)']
  },
  whatsappNumber: {
    type: String,
    match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid WhatsApp number (e.g., +919876543210)']
  },
  whatsappOptIn: { type: Boolean, default: false },
  resetToken: { type: String },
  resetTokenExpires: { type: Date },
  status: { type: Boolean, default: true },
  additionalInfo: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Indexes for faster lookup
userSchema.index({ schoolId: 1, role: 1 });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ username: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);