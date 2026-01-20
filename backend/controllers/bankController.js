const BankConfig = require('../models/BankConfig');

// Explicit exports - add console to confirm on load
console.log('Loading bankController...'); // Temp: Remove after fix

const getBankConfig = async (req, res) => {
  try {
    const config = await BankConfig.findOne({ active: true });
    res.json(config || { message: 'No active bank config found' });
  } catch (error) {
    console.error('Bank get error:', error);
    res.status(500).json({ error: 'Failed to fetch bank config' });
  }
};

const updateBankConfig = async (req, res) => {
  try {
    let config = await BankConfig.findOne({ active: true });
    if (!config) {
      config = new BankConfig({ active: true });
    }
    const { accountName, accountNumber, ifscCode } = req.body;
    config.accountName = accountName;
    config.accountNumber = accountNumber;
    config.ifscCode = ifscCode;
    await config.save();
    res.json({ message: 'Bank config updated', config });
  } catch (error) {
    console.error('Bank update error:', error);
    res.status(500).json({ error: 'Failed to update bank config' });
  }
};

// Export properly
module.exports = { getBankConfig, updateBankConfig };
exports.getBankConfig = getBankConfig;
exports.updateBankConfig = updateBankConfig;

console.log('bankController exports set:', { getBankConfig: typeof getBankConfig, updateBankConfig: typeof updateBankConfig }); // Temp