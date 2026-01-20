const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School', 
    required: true 
  },
  name: { // Changed from 'year' to 'name'
    type: String, 
    required: true,
    default: () => `${new Date().getFullYear()}-${new Date().getFullYear()+1}` 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  }
});

// Index fix for 'name' instead of 'year'
academicYearSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('AcademicYear', academicYearSchema);