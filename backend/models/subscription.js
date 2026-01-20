
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School', 
    required: true 
  },
  planType: { 
  type: String, 
  enum: [
    'trial',
    'sms_basic_monthly',
    'sms_basic_yearly', 
    'whatsapp_basic_monthly',
    'whatsapp_basic_yearly',
    'both_basic_monthly',
    'both_basic_yearly',
    'both_premium_monthly',
    'both_premium_yearly'
  ],
  required: true 
},
  status: { 
    type: String, 
    enum: ['active', 'expired', 'canceled', 'pending', 'grace_period'], 
    default: 'active' 
  },
  startsAt: { 
    type: Date, 
    default: Date.now 
  },

  expiresAt: { 
    type: Date, 
    required: true 
  },
  
  gracePeriodEnds: { 
    type: Date 
  },
  razorpayOrderId: { type: String, default: null },

  autoRenew: {
    type: Boolean,
    default: false
  },

  paymentMethod: { 
    type: String, 
    enum: ['razorpay', 'bank_transfer', 'phonepe', 'card', 'upi'], 
    default: null 
  },

  paymentProof: { 
    type: String, 
    default: null 
  },

  transactionId: {
    type: String,
    default: null
  },
  testMode: { type: Boolean, default: false },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },

  updatedAt: { 
    type: Date, 
    default: Date.now 
  },

  durationDays: { 
    type: Number, 
    required: true 
  },

  originalAmount: { 
    type: Number, 
    required: true 
  },
  discountAmount: { 
    type: Number, 
    default: 0 
  },
  finalAmount: { 
    type: Number, 
    required: true 
  },
  // Track usage for fair usage policy
  messageLimits: {
    smsMonthly: { type: Number, default: 0 },  // e.g., 1000 for basic
    whatsappMonthly: { type: Number, default: 0 }  // same or separate
  },
  usageStats: {
    smsUsedThisMonth: { type: Number, default: 0 },
    whatsappUsedThisMonth: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }  // When we last reset counts
  },
  // In Subscription Schema
    priority: { 
    type: Number, 
    enum: [1, 2, 3], // 1 = Trial, 2 = Basic, 3 = Premium
    required: true,
    default:1 
    },

  features: {
    type: [String],
    default: function () {
      const base = ['login', 'attendance', 'fees', 'notifications'];
      if (this.planType === 'trial') return base;
      if (this.planType.includes('basic')) return base;
      if (this.planType.includes('premium')) {
        return [...base, 'exam', 'udise', 'results', 'reports', 'analytics'];
      }
      return base;
    }
  }
});

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const diff = this.expiresAt - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for isInGracePeriod
subscriptionSchema.virtual('isInGracePeriod').get(function() {
  if (this.status !== 'grace_period') return false;
  const now = new Date();
  return now <= this.gracePeriodEnds;
});

// Method to check if subscription is active (including grace period)
subscriptionSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' || 
         (this.status === 'grace_period' && now <= this.gracePeriodEnds);
};

subscriptionSchema.index({ schoolId: 1, status: 1 });
subscriptionSchema.index({ expiresAt: 1 });
subscriptionSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);