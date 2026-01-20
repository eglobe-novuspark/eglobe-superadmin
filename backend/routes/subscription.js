const subscription = require("../models/subscription");

// GET /api/superadmin/pending-payments
router.get('/pending-payments', authMiddleware, async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const pending = await subscription.find({
    status: 'pending',
    paymentMethod: { $in: ['razorpay', 'bank_transfer'] }
  })
  .populate('schoolId', 'name code')
  .sort({ createdAt: -1 });

  res.json({
    pending: pending.map(sub => ({
      id: sub._id,
      school: sub.schoolId?.name,
      code: sub.schoolId?.code,
      plan: sub.planType,
      amount: sub.finalAmount,
      method: sub.paymentMethod,
      orderId: sub.razorpayOrderId,
      createdAt: sub.createdAt
    }))
  });
});