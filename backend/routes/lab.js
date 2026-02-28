const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

router.get('/tests', auth, async (req,res) => {
  try { const [r] = await db.query('SELECT * FROM lab_tests ORDER BY test_name'); res.json(r); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/orders', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT lo.*, p.name AS patient_name, p.patient_code, lt.test_name, lt.test_code, lt.price
               FROM lab_orders lo JOIN patients p ON lo.patient_id=p.id JOIN lab_tests lt ON lo.test_id=lt.id WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND lo.status=?'; params.push(status); }
    sql += ' ORDER BY lo.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/orders', auth, async (req, res) => {
  try {
    const { patient_id, test_id } = req.body;
    if (!patient_id || !test_id) return res.status(400).json({ error: 'Patient and test required' });
    const [r] = await db.query(
      'INSERT INTO lab_orders (patient_id,test_id,ordered_by) VALUES (?,?,?)',
      [patient_id, test_id, req.user.id]
    );
    const [pt] = await db.query('SELECT name FROM patients WHERE id=?',[patient_id]);
    const [lt] = await db.query('SELECT test_name FROM lab_tests WHERE id=?',[test_id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Ordered ${lt[0].test_name} for ${pt[0].name}`, 'lab']);
    res.status(201).json({ id: r.insertId, message: 'Lab test ordered!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.patch('/orders/:id/result', auth, only('lab'), async (req, res) => {
  try {
    const { result_text } = req.body;
    if (!result_text) return res.status(400).json({ error: 'Result is required' });
    const [order] = await db.query('SELECT lo.*, lt.test_name, lt.price, p.name AS patient_name FROM lab_orders lo JOIN lab_tests lt ON lo.test_id=lt.id JOIN patients p ON lo.patient_id=p.id WHERE lo.id=?',[req.params.id]);
    if (!order.length) return res.status(404).json({ error: 'Order not found' });
    const o = order[0];
    await db.query('UPDATE lab_orders SET result_text=?, status="Completed", completed_at=NOW() WHERE id=?',[result_text, o.id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',
      [req.user.id, `Uploaded result: ${o.test_name} for ${o.patient_name}`, 'lab']);
    res.json({ message: 'Result saved! Charge applied to patient.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
