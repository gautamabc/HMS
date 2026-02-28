const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

router.get('/lab', auth, async (req,res) => {
  try { const [r] = await db.query('SELECT * FROM lab_tests ORDER BY test_name'); res.json(r); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/lab', auth, only('admin'), async (req,res) => {
  try {
    const { test_code, test_name, price } = req.body;
    const [r] = await db.query('INSERT INTO lab_tests (test_code,test_name,price) VALUES (?,?,?)',[test_code, test_name, price]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',[req.user.id, `Added lab test: ${test_name}`, 'charge']);
    res.status(201).json({ id: r.insertId, message: 'Lab test added!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/lab/:id', auth, only('admin'), async (req,res) => {
  try {
    const { price } = req.body;
    await db.query('UPDATE lab_tests SET price=? WHERE id=?',[price, req.params.id]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',[req.user.id, `Updated lab test ID ${req.params.id} price to ₹${price}`, 'charge']);
    res.json({ message: 'Price updated!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/procedures', auth, async (req,res) => {
  try { const [r] = await db.query('SELECT * FROM procedures ORDER BY name'); res.json(r); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/procedures', auth, only('admin'), async (req,res) => {
  try {
    const { name, price } = req.body;
    const [r] = await db.query('INSERT INTO procedures (name,price) VALUES (?,?)',[name, price]);
    await db.query('INSERT INTO audit_log (user_id,action,entity_type) VALUES (?,?,?)',[req.user.id, `Added procedure: ${name}`, 'charge']);
    res.status(201).json({ id: r.insertId, message: 'Procedure added!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/procedures/:id', auth, only('admin'), async (req,res) => {
  try {
    const { price } = req.body;
    await db.query('UPDATE procedures SET price=? WHERE id=?',[price, req.params.id]);
    res.json({ message: 'Price updated!' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
