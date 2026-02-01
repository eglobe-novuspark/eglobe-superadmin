const express = require('express');
const router = express.Router();
const Subscription = require('../models/subscription');
const School = require('../models/School');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Superadmin only
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Access denied' });
  next();
});

router.get('/dashboard', async (req, res) => {
  try {
    // First, check if there are any schools at all
    const schoolCount = await School.countDocuments({ status: true });
    
    // If no schools, return empty response immediately
    if (schoolCount === 0) {
      return res.json({
        schools: [],
        totalSchools: 0,
        activeTrials: 0,
        activePaid: 0,
        totalRevenue: 0
      });
    }

    // Only run aggregation if we have schools
    const schools = await School.aggregate([
      { $match: { status: true } },
      
      // Get admin user
      {
        $lookup: {
          from: 'users',
          let: { schoolId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$schoolId', '$$schoolId'] }, role: 'admin' } },
            { $limit: 1 },
            { $project: { name: 1 } }
          ],
          as: 'adminUser'
        }
      },
      
      // Get latest subscription
      {
        $lookup: {
          from: 'subscriptions',
          let: { schoolId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$schoolId', '$$schoolId'] } } },
            { $sort: { priority: -1, expiresAt: -1 } },
            { $limit: 1 },
            {
              $addFields: {
                daysRemaining: {
                  $max: [0, {
                    $ceil: {
                      $divide: [
                        { $subtract: ['$expiresAt', new Date()] },
                        1000 * 60 * 60 * 24
                      ]
                    }
                  }]
                }
              }
            }
          ],
          as: 'currentSub'
        }
      },
      
      {
        $project: {
          _id: 1,
          schoolName: '$name',
          adminName: { $ifNull: [{ $arrayElemAt: ['$adminUser.name', 0] }, 'Unknown'] },
          planType: { $ifNull: [{ $arrayElemAt: ['$currentSub.planType', 0] }, 'none'] },
          status: { $ifNull: [{ $arrayElemAt: ['$currentSub.status', 0] }, 'inactive'] },
          expiresAt: { $arrayElemAt: ['$currentSub.expiresAt', 0] },
          daysRemaining: { $arrayElemAt: ['$currentSub.daysRemaining', 0] },
          isTrial: { $eq: [{ $ifNull: [{ $arrayElemAt: ['$currentSub.planType', 0] }, ''] }, 'trial'] },
          revenue: { $ifNull: [{ $arrayElemAt: ['$currentSub.finalAmount', 0] }, 0] },
          createdAt: 1
        }
      },
      
      { $sort: { createdAt: -1 } }
    ]).maxTimeMS(15000); // 15 second timeout

    // Calculate statistics
    const activeTrials = schools.filter(s => 
      s.isTrial && s.status === 'active' && s.daysRemaining > 0
    ).length;
    
    const activePaid = schools.filter(s => 
      !s.isTrial && s.status === 'active' && s.daysRemaining > 0
    ).length;
    
    const totalRevenue = schools.reduce((sum, s) => sum + s.revenue, 0);

    res.json({
      schools,
      totalSchools: schools.length,
      activeTrials,
      activePaid,
      totalRevenue
    });

  } catch (err) {
    console.error('Superadmin dashboard error:', err);
    
    // Fallback response
    res.status(500).json({
      message: 'Unable to load dashboard data',
      schools: [],
      totalSchools: 0,
      activeTrials: 0,
      activePaid: 0,
      totalRevenue: 0
    });
  }
});

router.post('/activate-trial', async (req, res) => {
  try {
    const { schoolId } = req.body;
    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ message: 'School not found' });

    let sub = await Subscription.findOne({ schoolId, status: { $in: ['active', 'pending'] } });
    if (sub) return res.status(400).json({ message: 'Already has subscription' });

    sub = new Subscription({
      schoolId,
      planType: 'trial',
      status: 'active',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      durationDays: 14,
      finalAmount: 0,
      messageLimits: { smsMonthly: 5, whatsappMonthly: 5 },
      usageStats: { lastResetDate: new Date() },
      testMode: process.env.TEST_MODE === 'true'
    });

    await sub.save();
    res.json({ message: 'Trial activated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;