const express = require('express');
const auth = require('../middleware/auth');
const superadmin = require('../middleware/superadmin');
const BankConfig = require('../models/BankConfig'); // Direct for fallback

const router = express.Router();

// Dynamic safe import
let getBankConfig, updateBankConfig;
try {
  const controller = require('../controllers/bankController');
  getBankConfig = controller.getBankConfig;
  updateBankConfig = controller.updateBankConfig;
  console.log('Bank routes: Imported handlers', { get: typeof getBankConfig, update: typeof updateBankConfig });
} catch (importError) {
  console.error('CRITICAL: Bank controller import failed!', importError);
  // Fallback dummy handlers to prevent crash
  getBankConfig = (req, res) => res.status(500).json({ error: 'Controller import failed - check file' });
  updateBankConfig = (req, res) => res.status(500).json({ error: 'Controller import failed - check file' });
}

router.use(auth, superadmin);

// GET /
router.get('/', (req, res, next) => {
  if (typeof getBankConfig !== 'function') {
    return res.status(500).json({ error: 'GET handler not ready' });
  }
  getBankConfig(req, res, next);
});

// PUT /
router.put('/', (req, res, next) => {
  if (typeof updateBankConfig !== 'function') {
    return res.status(500).json({ error: 'PUT handler not ready' });
  }
  updateBankConfig(req, res, next);
});

module.exports = router;