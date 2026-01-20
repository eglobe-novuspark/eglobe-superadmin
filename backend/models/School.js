const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  mobileNo: { 
    type: String,
    required: true,
    match: [/^\+?[1-9]\d{9,14}$/, 'Valid mobile required']
  },
  email: { 
    type: String,
    required: true,
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Valid email required']
  },
  code: {
    type: String,
    required: [true, 'School code required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Min 3 chars'],
    maxlength: [6, 'Max 6 chars']
  },
  smtpConfig: {
    host: { type: String, default: 'shafisadique123@gmail.com' },
    port: { type: Number, default: 465 },
    secure: { type: Boolean, default: true },
    auth: {
      user: { type: String },
      pass: { type: String }
    }
  },
  contactPerson: { 
    name: String,
    designation: String
  },
  website: { 
    type: String,
    match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Valid URL']
  },
  activeAcademicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radius: { type: Number, default: 100 },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  preferredChannel: { type: String, enum: ['sms', 'whatsapp', 'both'], default: 'sms' }, 
  weeklyHolidayDay: {
    type: String,
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    default: 'Sunday'
  },
  smsPackActive: { type: Boolean, default: false },
  status: { 
    type: Boolean,
    default: true
  },
  logo: { 
    type: String,
    default: ''
  },
  communication: {
    smsSenderName: { type: String, default: 'EDGLOBE', maxlength: 11 }, // e.g., RAINBOWSCH
    emailFrom: { type: String, default: 'no-reply@edglobe.in' },       // principal@rainbow.com
    emailName: { type: String, default: 'EDGlobe School' },            // "Rainbow Public School"
    emailPass: {type:String}
  },

  // School Timing (you asked!)
  schoolTiming: {
    openingTime: { type: String, default: '09:00' }, // 8 AM
    closingTime: { type: String, default: '4:00' }, // 2 PM
    lunchBreak: { type: String, default: '12:00-12:30' }
  }
});

schoolSchema.index({ createdBy: 1 });
schoolSchema.index({ mobileNo: 1 }, { unique: true });

module.exports = mongoose.model('School', schoolSchema);