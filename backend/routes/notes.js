const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

router.get('/:admission_id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT n.*, u.full_name AS doctor_name FROM ipd_notes n JOIN users u ON n.doctor_id=u.id WHERE n.admission_id=? ORDER BY n.note_date DESC',
      [req.params.admission_id]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, only('doctor'), async (req, res) => {
  try {
    const { admission_id, note_date, observations, plan } = req.body;
    if (!admission_id || !observations) return res.status(400).json({ error: 'Admission and observations required' });
    const [r] = await db.query(
      'INSERT INTO ipd_notes (admission_id,doctor_id,note_date,observations,plan) VALUES (?,?,?,?,?)',
      [admission_id, req.user.id, note_date||new Date().toISOString().slice(0,10), observations, plan||null]
    );
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Added IPD progress note for admission #${admission_id}`, 'note']);
    res.status(201).json({ id: r.insertId, message: 'Note saved!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
