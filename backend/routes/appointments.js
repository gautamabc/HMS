const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, p.name AS patient_name, p.patient_code, u.full_name AS doctor_name
      FROM opd_appointments a
      JOIN patients p ON a.patient_id=p.id
      JOIN users u ON a.doctor_id=u.id
      ORDER BY a.appt_time ASC`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, only('receptionist','admin'), async (req, res) => {
  try {
    const { patient_id, doctor_id, appt_date, appt_time, reason } = req.body;
    if (!patient_id || !doctor_id) return res.status(400).json({ error: 'Patient and doctor required' });
    const [r] = await db.query(
      'INSERT INTO opd_appointments (patient_id,doctor_id,appt_date,appt_time,reason) VALUES (?,?,?,?,?)',
      [patient_id, doctor_id, appt_date||new Date().toISOString().slice(0,10), appt_time||'09:00', reason||'']
    );
    const [pt] = await db.query('SELECT name FROM patients WHERE id=?',[patient_id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Created OPD appointment for ${pt[0]?.name}`, 'appointment']);
    res.status(201).json({ id: r.insertId, message: 'Appointment created!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE opd_appointments SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
