const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM beds ORDER BY bed_code');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, only('admin'), async (req, res) => {
  try {
    const { bed_code, bed_type, price_per_day } = req.body;
    if (!bed_code || !bed_type || !price_per_day) return res.status(400).json({ error: 'All fields required' });
    const [r] = await db.query('INSERT INTO beds (bed_code,bed_type,price_per_day) VALUES (?,?,?)',[bed_code, bed_type, price_per_day]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Added bed ${bed_code} (${bed_type})`, 'bed']);
    res.status(201).json({ id: r.insertId, message: `Bed ${bed_code} added!` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/status', auth, only('admin','receptionist'), async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE beds SET status=? WHERE id=?',[status, req.params.id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Updated bed ID ${req.params.id} to ${status}`, 'bed']);
    res.json({ message: 'Bed status updated' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
