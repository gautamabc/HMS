const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, p.name AS patient_name, p.patient_code, 
             u.full_name AS doctor_name, b.bed_code, b.bed_type
      FROM admissions a
      JOIN patients p ON a.patient_id=p.id
      JOIN users u ON a.doctor_id=u.id
      JOIN beds b ON a.bed_id=b.id
      ORDER BY a.created_at DESC`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, only('receptionist','admin'), async (req, res) => {
  try {
    const { patient_id, doctor_id, bed_id, admit_date, reason } = req.body;
    if (!patient_id || !bed_id) return res.status(400).json({ error: 'Patient and bed required' });
    // Check bed is free
    const [bedCheck] = await db.query('SELECT * FROM beds WHERE id=? AND status="free"',[bed_id]);
    if (!bedCheck.length) return res.status(400).json({ error: 'Bed is not available' });
    // Create admission
    const [r] = await db.query(
      'INSERT INTO admissions (patient_id,doctor_id,bed_id,admit_date,reason) VALUES (?,?,?,?,?)',
      [patient_id, doctor_id, bed_id, admit_date||new Date().toISOString().slice(0,10), reason||'']
    );
    const [pt] = await db.query('SELECT name FROM patients WHERE id=?',[patient_id]);
    const [bd] = await db.query('SELECT bed_code FROM beds WHERE id=?',[bed_id]);
    // Mark bed occupied
    await db.query('UPDATE beds SET status="occupied", patient_name=? WHERE id=?',[pt[0].name, bed_id]);
    // Update patient status
    await db.query('UPDATE patients SET status="Admitted", visit_type="IPD" WHERE id=?',[patient_id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Admitted ${pt[0].name} to bed ${bd[0].bed_code}`, 'admission']);
    res.status(201).json({ id: r.insertId, message: `Patient admitted to ${bd[0].bed_code}` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/discharge', auth, only('receptionist','admin','doctor'), async (req, res) => {
  try {
    const [adm] = await db.query('SELECT * FROM admissions WHERE id=?',[req.params.id]);
    if (!adm.length) return res.status(404).json({ error: 'Not found' });
    const a = adm[0];
    await db.query('UPDATE admissions SET status="Discharged", discharge_date=CURDATE() WHERE id=?',[a.id]);
    await db.query('UPDATE beds SET status="free", patient_name=NULL WHERE id=?',[a.bed_id]);
    await db.query('UPDATE patients SET status="Discharged" WHERE id=?',[a.patient_id]);
    const [pt] = await db.query('SELECT name FROM patients WHERE id=?',[a.patient_id]);
    const [bd] = await db.query('SELECT bed_code FROM beds WHERE id=?',[a.bed_id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Discharged ${pt[0].name} from bed ${bd[0].bed_code}`, 'admission']);
    res.json({ message: 'Patient discharged, bed freed!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
