module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    console.log('Role check failed:', req.user ? req.user.role : 'No user');  // Debug
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};