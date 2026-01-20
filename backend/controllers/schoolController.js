const axios = require('axios');
const School = require('../models/School');
const { sendEmail } = require('../utils/email'); // For notifying new admins

exports.createSchool = async (req, res) => {
  const { schoolName, adminEmail, adminPhone } = req.body;
  try {
    // Call admin project to create school user
    const adminResponse = await axios.post(`${process.env.ADMIN_API_URL}/register-school`, {
      schoolName,
      email: adminEmail,
      phone: adminPhone
    }, {
      headers: { Authorization: `Bearer ${req.user.token}` } // Or use API key
    });

    // Save overview in superadmin DB
    const newSchool = new School({
      name: schoolName,
      adminEmail,
      adminPhone,
      subscriptionId: null, // Set after trial
      status: 'trial'
    });
    await newSchool.save();

    // Email welcome to admin
    await sendEmail(adminEmail, 'Welcome to EduManage', `Your school ${schoolName} is ready! Trial active for 14 days.`);

    res.json({ message: 'School created', schoolId: newSchool._id });
  } catch (error) {
    res.status(500).json({ error: error.response?.data || 'School creation failed' });
  }
};

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