const express = require('express');
const { login } = require('../controllers/authControllers');
const { registerSchool } = require('../controllers/auth/register/schoolRegistration');
const validateRequest = require('../middleware/validateRequest.js');
const { body } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware.js');
const isSuperAdmin = require('../middleware/isSuperAdmin.js');
const { resetPassword } = require('../controllers/auth/resetPassword.js');
const VerificationSchema = require('../models/verification'); // Keep if used below
const twilio = require('twilio');
const rateLimit = require('express-rate-limit'); // Add for OTP spam protection

const router = express.Router();

// OTP Rate Limiter (per IP, 5 attempts/5min)
const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 OTP requests per window
  message: { error: 'Too many OTP requests, try again later' }
});

router.post('/login', login);
router.post('/reset-password', resetPassword);

router.post(
  '/register-school',
  authMiddleware,
  isSuperAdmin,
  validateRequest([
    body('schoolName').notEmpty().withMessage('School name is required'),
    body('adminName').notEmpty().withMessage('Admin name is required'),
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('mobileNo').notEmpty().matches(/^\+?[1-9]\d{9,14}$/).withMessage('Valid mobile number is required'),
    body('preferredChannel').isIn(['sms', 'whatsapp', 'both']).withMessage('Valid preferred channel is required'),
    body('whatsappOptIn').isBoolean().withMessage('WhatsApp opt-in must be a boolean'),
    body('address.street').notEmpty().withMessage('Street is required'),
    body('address.city').notEmpty().withMessage('City is required'),
    body('address.state').notEmpty().withMessage('State is required'),
    body('address.country').notEmpty().withMessage('Country is required'),
    body('address.postalCode').notEmpty().withMessage('Postal code is required'),
    body('latitude').isFloat().withMessage('Valid latitude is required'),
    body('longitude').isFloat().withMessage('Valid longitude is required'),
    body('isMobileVerified').isBoolean().withMessage('Mobile verification status is required').equals('true').withMessage('Mobile number must be verified')
  ]),
  registerSchool
);

// Twilio init (move to app.js ideally, but keep here for now)
let twilioClient;
try {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  if (!twilioClient.verify || !twilioClient.verify.v2) {
    throw new Error('Twilio Verify API v2 not available');
  }
  console.log('✅ Twilio client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Twilio client:', error);
  // Don't throw—let app start, but OTP will fail
}

// Send OTP
router.post('/send-otp', otpLimiter, async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Strict validation
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return res.status(400).json({ error: 'Invalid phone number format. Use +<country code><number> (e.g., +919876543210)' });
  }

  try {
    let normalizedPhoneNumber = phoneNumber.trim();
    if (!normalizedPhoneNumber.startsWith('+')) {
      normalizedPhoneNumber = `+91${normalizedPhoneNumber.replace(/^\+/, '')}`; // India default
    }

    if (!/^\+[1-9]\d{10,14}$/.test(normalizedPhoneNumber)) {
      return res.status(400).json({ error: 'Phone number must be in E.164 format (e.g., +919876543210)' });
    }

    const verification = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: normalizedPhoneNumber, channel: 'sms' });

    // Save verification record
    const verificationRecord = new VerificationSchema({
      phoneNumber: normalizedPhoneNumber,
      verificationSid: verification.sid,
      status: 'pending'
    });
    await verificationRecord.save();

    res.json({ success: true, sid: verification.sid });
  } catch (error) {
    console.error('Send OTP error:', error);
    // Twilio-specific errors
    if (error.code === 21614) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    res.status(400).json({ error: error.message || 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', otpLimiter, async (req, res) => {
  const { phoneNumber, code } = req.body;
  if (!phoneNumber || !code) {
    return res.status(400).json({ error: 'Phone number and OTP code required' });
  }

  try {
    const normalizedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    const verificationCheck = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: normalizedPhoneNumber, code });

    if (verificationCheck.status === 'approved') {
      // Update DB status
      await VerificationSchema.updateOne(
        { phoneNumber: normalizedPhoneNumber, status: 'pending' },
        { status: 'verified' }
      );
      res.json({ success: true, message: 'Phone number verified' });
    } else {
      res.status(400).json({ error: 'Invalid OTP code' });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(400).json({ error: error.message || 'Failed to verify OTP' });
  }
});

module.exports = router;