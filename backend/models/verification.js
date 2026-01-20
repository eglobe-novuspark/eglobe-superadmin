const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true
  },
  verificationSid: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'expired', 'failed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // auto-delete after 5 minutes
  }
});

module.exports = mongoose.model('Verification', verificationSchema);
