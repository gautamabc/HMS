const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

// Get charges summary for a patient (to build the bill)
router.get('/charges/:patient_id', auth, async (req, res) => {
  try {
    const pid = req.params.patient_id;
    const charges = [];

    // Consultation
    const [pt] = await db.query('SELECT p.*, d.consultation_fee_opd, d.consultation_fee_ipd FROM patients p LEFT JOIN (SELECT user_id, consultation_fee_opd, consultation_fee_ipd FROM doctors) d ON p.doctor_id=d.user_id WHERE p.id=?',[pid]);

    // Lab charges
    const [labs] = await db.query(`
      SELECT lo.*, lt.test_name, lt.price FROM lab_orders lo
      JOIN lab_tests lt ON lo.test_id=lt.id
      WHERE lo.patient_id=? AND lo.status='Completed'`,[pid]);
    labs.forEach(l => charges.push({ desc: `Lab — ${l.test_name}`, amount: parseFloat(l.price) }));

    // Bed charges (from admissions)
    const [adms] = await db.query(`
      SELECT a.*, b.bed_type, b.price_per_day, DATEDIFF(IFNULL(a.discharge_date, CURDATE()), a.admit_date)+1 AS days
      FROM admissions a JOIN beds b ON a.bed_id=b.id WHERE a.patient_id=?`,[pid]);
    adms.forEach(a => charges.push({ desc: `${a.bed_type} Bed (${a.days} days × ₹${a.price_per_day})`, amount: a.days * parseFloat(a.price_per_day) }));

    const subtotal = charges.reduce((s, c) => s + c.amount, 0);
    res.json({ charges, subtotal });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Get all bills
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, p.name AS patient_name, p.patient_code
      FROM bills b JOIN patients p ON b.patient_id=p.id ORDER BY b.created_at DESC`);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Generate a bill
router.post('/generate', auth, only('billing','admin'), async (req, res) => {
  try {
    const { patient_id, subtotal, discount, final_amount } = req.body;
    const [r] = await db.query(
      'INSERT INTO bills (patient_id,subtotal,discount,final_amount) VALUES (?,?,?,?)',
      [patient_id, subtotal, discount||0, final_amount]
    );
    const [pt] = await db.query('SELECT name FROM patients WHERE id=?',[patient_id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Generated invoice #${r.insertId} for ${pt[0].name} ₹${final_amount}`, 'billing']);
    res.status(201).json({ id: r.insertId, message: `Invoice #${r.insertId} created!` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Mark bill as paid
router.patch('/:id/pay', auth, only('billing','admin'), async (req, res) => {
  try {
    const { payment_mode } = req.body;
    const [bill] = await db.query('SELECT b.*, p.name AS patient_name FROM bills b JOIN patients p ON b.patient_id=p.id WHERE b.id=?',[req.params.id]);
    if (!bill.length) return res.status(404).json({ error: 'Bill not found' });
    await db.query('UPDATE bills SET status="Paid", payment_mode=?, paid_at=NOW() WHERE id=?',[payment_mode||'Cash', req.params.id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Payment collected: Invoice #${req.params.id} — ${bill[0].patient_name} ₹${bill[0].final_amount}`, 'billing']);
    res.json({ message: 'Payment collected! Bill marked as Paid.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
