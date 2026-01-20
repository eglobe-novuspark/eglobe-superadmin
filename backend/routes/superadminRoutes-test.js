const express = require('express');
const router = express.Router();

// Simple test endpoint - should always return 200 + CORS
router.get('/test', (req, res) => {
  res.json({
    message: 'Superadmin test endpoint is working!',
    time: new Date().toISOString(),
    youAre: 'Super cool for debugging this far 💪'
  });
});

// Your original dashboard (minimal version - no auth, no heavy aggregation)
router.get('/dashboard', async (req, res) => {
  try {
    res.json({
      status: 'success',
      message: 'Dashboard is reachable',
      fakeData: {
        totalSchools: 42,
        activeTrials: 13,
        activePaid: 29,
        totalRevenue: 1250000
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Something broke', details: err.message });
  }
});

// POST test - just to check POST + CORS
router.post('/test-post', (req, res) => {
  res.json({
    message: 'POST worked!',
    receivedBody: req.body,
    time: new Date().toISOString()
  });
});

module.exports = router;