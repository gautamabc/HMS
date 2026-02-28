const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'medicore2026secretkey';

function auth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), SECRET);
    next();
  } catch(e) {
    res.status(401).json({ error: 'Session expired, please login again' });
  }
}

function only(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'You do not have permission for this' });
    next();
  };
}

module.exports = { auth, only, SECRET };
