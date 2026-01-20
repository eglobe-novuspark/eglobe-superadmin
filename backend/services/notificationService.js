const twilio = require('twilio');
const School = require('../models/School');
const User = require('../models/User');  // Regular User for recipients
require('dotenv').config();
const nodemailer = require('nodemailer');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.deliver = async (notification, session = null) => {
  let deliverySuccess = false;
  let deliveryErrors = [];

  try {
    console.log('Delivering:', notification._id, notification.type);

    // Direct from data (no fetch for speed)
    const schoolName = notification.data.schoolName || 'Your School';
    const preferredChannel = notification.data.preferredChannel || 'sms';
    const recipientPhone = notification.data.recipientPhone;
    const recipientEmail = notification.data.recipientEmail;

    if (!recipientPhone && !recipientEmail) {
      throw new Error('No recipient contact');
    }

    const smsMessage = notification.message.substring(0, 160);
    const emailSubject = `Welcome to ${schoolName}!`;
    const emailText = notification.message;

    // SMS
    if ((preferredChannel === 'sms' || preferredChannel === 'both') && recipientPhone) {
      try {
        const smsResult = await twilioClient.messages.create({
          body: smsMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: `+${recipientPhone.replace(/[^0-9]/g, '')}`
        });
        console.log('SMS sent:', smsResult.sid);
        deliverySuccess = true;
      } catch (smsErr) {
        console.error('SMS failed:', smsErr.message);
        deliveryErrors.push(`SMS: ${smsErr.message}`);
      }
    }

    // WhatsApp
    if ((preferredChannel === 'whatsapp' || preferredChannel === 'both') && recipientPhone) {
      try {
        const whatsappResult = await twilioClient.messages.create({
          body: smsMessage,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:+${recipientPhone.replace(/[^0-9]/g, '')}`
        });
        console.log('WhatsApp sent:', whatsappResult.sid);
        deliverySuccess = true;
      } catch (whatsappErr) {
        console.error('WhatsApp failed:', whatsappErr.message);
        deliveryErrors.push(`WhatsApp: ${whatsappErr.message}`);
      }
    }

    // Email
    if (recipientEmail) {
      try {
        const emailOptions = {
          from: process.env.EMAIL_USER,
          to: recipientEmail,
          subject: emailSubject,
          text: emailText,
          html: `<p>${emailText.replace(/\n/g, '<br>')}</p>`
        };
        const emailResult = await transporter.sendMail(emailOptions);
        console.log('Email sent:', emailResult.messageId);
        deliverySuccess = true;
      } catch (emailErr) {
        console.error('Email failed:', emailErr.message);
        deliveryErrors.push(`Email: ${emailErr.message}`);
      }
    }

    // Update status
    notification.status = deliverySuccess ? 'delivered' : 'failed';
    notification.error = deliveryErrors.join('; ') || undefined;
    if (session) {
      await notification.save({ session });
    } else {
      await notification.save();
    }
  } catch (err) {
    console.error('Delivery error:', err.message);
    notification.status = 'failed';
    notification.error = err.message;
    if (session) await notification.save({ session });
    else await notification.save();
    throw err;
  }
};