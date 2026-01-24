const axios = require('axios');
const School = require('../models/School');
const { sendEmail } = require('../utils/email'); // For notifying new admins

exports.getAllSchools = async (req, res) => {
  const schools = await School.find().populate('subscriptionId');
  res.json(schools);
};

exports.deleteSchool = async (req, res) => {
  const { id } = req.params;
  await School.findByIdAndDelete(id);
  // Optional: Call admin API to soft-delete
  res.json({ message: 'School deleted' });
};