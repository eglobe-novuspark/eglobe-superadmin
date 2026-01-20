
async function checkAndResetUsage(subscription) {
  const now = new Date();
  const lastReset = new Date(subscription.usageStats.lastResetDate);
  
  if (now.getFullYear() !== lastReset.getFullYear() || now.getMonth() !== lastReset.getMonth()) {
    subscription.usageStats.smsUsedThisMonth = 0;
    subscription.usageStats.whatsappUsedThisMonth = 0;
    subscription.usageStats.lastResetDate = now;
    await subscription.save();
  }
}

module.exports = { checkAndResetUsage };