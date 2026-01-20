// middleware/superAdminGuard.js  ← FINAL CLEAN VERSION (DELETE EVERYTHING ELSE)

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const MASTER_KEY = process.env.SUPERADMIN_MASTER_KEY?.trim();
const DEVICE_FP = process.env.SUPERADMIN_DEVICE_FINGERPRINT?.trim();

if (!MASTER_KEY || !DEVICE_FP) {
  console.error("MISSING SUPERADMIN_MASTER_KEY or SUPERADMIN_DEVICE_FINGERPRINT in .env");
  process.exit(1);
}

module.exports = (req, res, next) => {
  try {
    // 1. Check X-Master-Key header
    const masterHeader = req.headers['x-master-key']?.trim();
    if (!masterHeader || !crypto.timingSafeEqual(Buffer.from(masterHeader), Buffer.from(MASTER_KEY))) {
      return res.status(403).json({ error: "Forbidden: Invalid master key" });
    }

    // 2. Check X-Device-Fp header
    const deviceFp = req.headers['x-device-fp']?.trim();
    if (!deviceFp || deviceFp !== DEVICE_FP) {
      return res.status(403).json({ error: "Forbidden: Unauthorized device" });
    }

    // 3. Verify JWT and role
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: "No token" });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_SUPER);

    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: "Not superadmin" });
    }

    req.user = decoded;
    next();

  } catch (err) {
    console.error("Superadmin guard failed:", err.message);
    return res.status(401).json({ error: "Access denied - invalid credentials" });
  }
};