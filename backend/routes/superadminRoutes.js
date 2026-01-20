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
    const schools = await School.aggregate([
      { $match: { status: true } },

      // Sab subscriptions laao with priority sorting
      {
        $lookup: {
          from: 'subscriptions',
          let: { schoolId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$schoolId', '$$schoolId'] } } },
            { $sort: { priority: -1, expiresAt: -1, createdAt: -1 } }, // Premium > Basic > Trial
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
          as: 'subscriptions'
        }
      },

      // Active subscription (sabse upar wala)
      {
        $addFields: {
          activeSub: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$subscriptions',
                  cond: {
                    $and: [
                      { $eq: ['$$this.status', 'active'] },
                      { $gt: ['$$this.expiresAt', new Date()] }
                    ]
                  }
                }
              },
              0
            ]
          },
          // Agar active nahi toh latest expired bhi dikha do
          latestSub: { $arrayElemAt: ['$subscriptions', 0] }
        }
      },

      {
        $addFields: {
          currentSub: { $ifNull: ['$activeSub', '$latestSub'] }
        }
      },

      // Admin name
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'schoolId',
          pipeline: [{ $match: { role: 'admin' } }, { $limit: 1 }],
          as: 'adminUser'
        }
      },

      {
        $project: {
          _id: 1,
          schoolName: '$name',
          adminName: { $ifNull: [{ $arrayElemAt: ['$adminUser.name', 0] }, 'Unknown'] },
          planType: '$currentSub.planType',
          status: '$currentSub.status',
          expiresAt: '$currentSub.expiresAt',
          daysRemaining: '$currentSub.daysRemaining',
          isTrial: { $eq: ['$currentSub.planType', 'trial'] },
          revenue: { $ifNull: ['$currentSub.finalAmount', 0] },
          createdAt: 1
        }
      },

      { $sort: { createdAt: -1 } }
    ]);

    const totalRevenue = schools.reduce((sum, s) => sum + s.revenue, 0);

    res.json({
      schools,
      totalSchools: schools.length,
      activeTrials: schools.filter(s => s.isTrial && s.status === 'active').length,
      activePaid: schools.filter(s => !s.isTrial && s.status === 'active').length,
      totalRevenue
    });

  } catch (err) {
    console.error('Superadmin dashboard error:', err);
    res.status(500).json({ message: 'Server error' });
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