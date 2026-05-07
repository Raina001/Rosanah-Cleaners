const express = require('express');
const { getDb } = require('../db/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
});

router.put('/', authorize('admin'), (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
  Object.entries(req.body).forEach(([key, value]) => upsert.run(key, value));
  res.json({ success: true });
});

module.exports = router;
