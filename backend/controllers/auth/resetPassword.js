// controllers/auth/resetPassword.js
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const logger = require('winston');


const resetPassword = async (req, res) => {

  const { token, newPassword } = req.body;
    console.log('Received token:', token);
  console.log('Current server time:', new Date().toISOString());
  console.log('Current Date.now():', Date.now());
  try {
    // 1. Validate input
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // 2. Find user with valid token
    const user = await User.findOne({
        resetToken: token,
        resetTokenExpires: { $gt: new Date() } // ← Compare Date vs Date
        });
    console.log('User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('Token expires at:', new Date(user.resetTokenExpires).toISOString());
      console.log('Time left (ms):', user.resetTokenExpires - Date.now());
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // 3. Update password & clear token
    user.password = bcrypt.hashSync(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await user.save();

    logger.info(`Password reset successful for user: ${user.email} (${user._id})`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });
  } catch (err) {
    logger.error('Password reset error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

module.exports = { resetPassword };