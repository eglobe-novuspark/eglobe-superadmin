const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: { type: String, required: true }, // 'basic', 'pro'
  amount: { type: Number, required: true }, // ₹999
  interval: { type: String, default: 'monthly' },
  razorpayPlanId: String, // From Razorpay dashboard
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Plan', planSchema);