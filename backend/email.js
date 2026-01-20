const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendEmail = (to, subject, text) => {
  return transporter.sendMail({ from: process.env.NODEMAILER_EMAIL, to, subject, text });
};