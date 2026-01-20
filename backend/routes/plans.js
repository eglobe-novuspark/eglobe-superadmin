const express = require('express');
const { getPlans, createPlan, updatePlan } = require('../controllers/planController');
const auth = require('../middleware/auth');
const superadmin = require('../middleware/superadmin');

const router = express.Router();

// Apply middleware to all routes
router.use(auth, superadmin);

// Routes with error handling
router.get('/', async (req, res) => {
  if (typeof getPlans !== 'function') return res.status(500).json({ error: 'Handler missing' });
  getPlans(req, res);
});

router.post('/', async (req, res) => {
  if (typeof createPlan !== 'function') return res.status(500).json({ error: 'Handler missing' });
  createPlan(req, res);
});

router.put('/:id', async (req, res) => {
  if (typeof updatePlan !== 'function') return res.status(500).json({ error: 'Handler missing' });
  updatePlan(req, res);
});

module.exports = router;