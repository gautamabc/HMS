const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

const PREFIXES = { receptionist:'REC', doctor:'DR', lab:'LAB', billing:'BIL' };

router.get('/', auth, only('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, username, role, full_name, phone, is_first_login, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, only('admin'), async (req, res) => {
  try {
    const { role, full_name, phone } = req.body;
    if (!role || !full_name) return res.status(400).json({ error: 'Role and name required' });
    // Generate username
    const prefix = PREFIXES[role] || 'USR';
    const [cnt] = await db.query('SELECT COUNT(*)+1 AS n FROM users WHERE role=?',[role]);
    const baseNum = { receptionist:102, doctor:104, lab:201, billing:301 }[role] || 100;
    const username = prefix + (baseNum + cnt[0].n);
    const defaultPass = `${username}@2026`;
    const hash = await bcrypt.hash(defaultPass, 10);
    const [r] = await db.query(
      'INSERT INTO users (username,password_hash,role,full_name,phone,is_first_login) VALUES (?,?,?,?,?,1)',
      [username, hash, role, full_name, phone||null]
    );
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Created login for ${full_name} — ${username} (${role})`, 'staff']);
    res.status(201).json({
      id: r.insertId,
      username,
      defaultPassword: defaultPass,
      message: `Login created! Username: ${username}, Password: ${defaultPass}`
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/status', auth, only('admin'), async (req, res) => {
  try {
    const { is_active } = req.body;
    const [u] = await db.query('SELECT full_name FROM users WHERE id=?',[req.params.id]);
    await db.query('UPDATE users SET is_active=? WHERE id=?',[is_active?1:0, req.params.id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `${is_active?'Activated':'Deactivated'} staff: ${u[0]?.full_name}`, 'staff']);
    res.json({ message: 'Staff status updated' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
