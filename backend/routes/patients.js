const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

// GET all patients (with optional search)
router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    let sql = `SELECT p.*, u.full_name AS doctor_name 
               FROM patients p LEFT JOIN users u ON p.doctor_id=u.id WHERE 1=1`;
    const params = [];
    if (q) {
      sql += ' AND (p.name LIKE ? OR p.patient_code LIKE ? OR p.phone LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY p.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET single patient
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT p.*, u.full_name AS doctor_name FROM patients p LEFT JOIN users u ON p.doctor_id=u.id WHERE p.id=?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Patient not found' });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST register new patient
router.post('/', auth, only('receptionist','admin'), async (req, res) => {
  try {
    const { name, age, gender, phone, address, blood_group, doctor_id, visit_type, ref_source } = req.body;
    if (!name || !age || !gender) return res.status(400).json({ error: 'Name, age, gender are required' });
    const [cnt] = await db.query('SELECT COUNT(*)+1001 AS next FROM patients');
    const code = 'P' + cnt[0].next;
    const [r] = await db.query(
      'INSERT INTO patients (patient_code,name,age,gender,phone,address,blood_group,doctor_id,visit_type,ref_source) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [code, name, age, gender, phone||null, address||null, blood_group||null, doctor_id||null, visit_type||'OPD', ref_source||'Walk-in']
    );
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Registered patient ${code} — ${name}`, 'patient']);
    res.status(201).json({ id: r.insertId, patient_code: code, message: 'Patient registered!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
