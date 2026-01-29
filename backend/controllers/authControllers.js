const jwt = require('jsonwebtoken');
const SuperUser = require('../models/superuser');
require('dotenv').config();

exports.login = async (req, res) => {
  const { email, username, password } = req.body;

  try {
    if (!password || (!email && !username)) {
      return res.status(400).json({ error: 'Email/Username and password required' });
    }

    // Build safe $or query (no empty objects)
    const orConditions = [];
    if (email) orConditions.push({ email: email.toLowerCase() });
    if (username) orConditions.push({ username: username.toLowerCase() });

    const query = orConditions.length > 0 ? { $or: orConditions } : null;
    if (!query) {
      return res.status(400).json({ error: 'No valid identifier provided' });
    }

    // Find user + SELECT password (overrides select: false)
    const superUser = await SuperUser.findOne(query).select('+password');


    if (!superUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!superUser.password) {
      return res.status(500).json({ error: 'Password not available (admin issue)' });
    }

    const isMatch = await superUser.comparePassword(password);
    console.log('Password match:', isMatch);  // DEBUG: true

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: superUser._id, 
        role: superUser.role 
      },
      process.env.JWT_SECRET_SUPER || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: superUser._id,
        email: superUser.email,
        username: superUser.username,
        role: superUser.role
      }
    });

  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};