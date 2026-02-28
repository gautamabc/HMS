const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const { auth, SECRET } = require('../middleware/auth');

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username=? AND is_active=1', [username?.toUpperCase()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid username or password' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.full_name },
      SECRET, { expiresIn: '12h' }
    );
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [user.id, `Logged in`, 'auth']);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.full_name, isFirstLogin: !!user.is_first_login } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// CHANGE PASSWORD (first login)
router.post('/change-password', auth, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash=?, is_first_login=0 WHERE id=?', [hash, req.user.id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, 'Changed password on first login', 'auth']);
    res.json({ message: 'Password updated successfully' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
