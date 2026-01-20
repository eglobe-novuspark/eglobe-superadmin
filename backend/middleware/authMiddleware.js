const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Extract token (handle case-insensitive header)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.replace('Bearer ', '').trim();

  if (!token) {
    console.log('No token provided in headers:', req.headers.authorization);  // Debug log
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify with correct secret (match login)
    const decoded = jwt.verify(token, process.env.JWT_SECRET_SUPER);
    req.user = decoded;  // { id: '...', role: 'superadmin' }
    console.log('Token decoded successfully:', req.user.role);  // Debug log
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);  // Debug
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};