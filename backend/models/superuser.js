const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const superUserSchema = new mongoose.Schema({
  name: { type: String, default: 'Super Admin' },
  username: { type: String, unique: true, required: true, lowercase: true, trim: true },  // Normalized
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },  // Normalized
  password: { type: String, required: true, select: false },  // Hide from queries
  role: { type: String, default: 'superadmin', enum: ['superadmin'] }
}, { timestamps: true });

// Pre-save hook for hashing
superUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method for password comparison
superUserSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Indexes (unique already creates them, but explicit for compound if needed later)
superUserSchema.index({ username: 1 });
superUserSchema.index({ email: 1 });

module.exports = mongoose.model('SuperUser', superUserSchema);