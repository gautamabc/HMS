const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pr.*, p.name AS patient_name, p.patient_code, u.full_name AS doctor_name
      FROM prescriptions pr JOIN patients p ON pr.patient_id=p.id JOIN users u ON pr.doctor_id=u.id
      ORDER BY pr.created_at DESC`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, only('doctor'), async (req, res) => {
  try {
    const { patient_id, diagnosis, medications, instructions, followup_date } = req.body;
    if (!patient_id || !diagnosis || !medications)
      return res.status(400).json({ error: 'Patient, diagnosis, medications required' });
    const [r] = await db.query(
      'INSERT INTO prescriptions (patient_id,doctor_id,diagnosis,medications,instructions,followup_date) VALUES (?,?,?,?,?,?)',
      [patient_id, req.user.id, diagnosis, medications, instructions||null, followup_date||null]
    );
    const [pt] = await db.query('SELECT name FROM patients WHERE id=?',[patient_id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Added prescription for ${pt[0].name}: ${diagnosis}`, 'prescription']);
    res.status(201).json({ id: r.insertId, message: 'Prescription saved!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
