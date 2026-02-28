const router = require('express').Router();
const db = require('../config/db');
const { auth, only } = require('../middleware/auth');

router.get('/', auth, only('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT a.*, u.username FROM audit_log a JOIN users u ON a.user_id=u.id ORDER BY a.created_at DESC LIMIT 200'
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
