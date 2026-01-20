const mongoose = require('mongoose');

const bankSchema = new mongoose.Schema({
  accountName: String,
  accountNumber: String, // Encrypt in prod
  ifscCode: String,
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('BankConfig', bankSchema);