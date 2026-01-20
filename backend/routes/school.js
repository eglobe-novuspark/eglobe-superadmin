const express = require('express');
const { createSchool, getAllSchools, deleteSchool } = require('../controllers/schoolController');
const auth = require('../middleware/auth');
const superadmin = require('../middleware/superadmin');
const router = express.Router();

router.use(auth, superadmin);
router.post('/', createSchool);
router.get('/', getAllSchools);
router.delete('/:id', deleteSchool);

module.exports = router;