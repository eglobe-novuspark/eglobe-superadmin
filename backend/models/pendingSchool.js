
const mongoose = require('mongoose');

const pendingSchoolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'] },
  mobileNo: { type: String, required: true, match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid mobile number'] },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient querying
pendingSchoolSchema.index({ email: 1 }, { unique: true });
pendingSchoolSchema.index({ status: 1 });
pendingSchoolSchema.index({ createdAt: 1 });

module.exports = mongoose.model('PendingSchool', pendingSchoolSchema);