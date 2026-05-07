const express = require('express');
const { getDb } = require('../db/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const pricing = db.prepare('SELECT * FROM pricing WHERE active = 1 ORDER BY sort_order, category, name').all();
  res.json(pricing);
});

router.get('/all', authorize('admin'), (req, res) => {
  const db = getDb();
  const pricing = db.prepare('SELECT * FROM pricing ORDER BY sort_order, category, name').all();
  res.json(pricing);
});

router.post('/', authorize('admin'), (req, res) => {
  const { category, name, price, unit } = req.body;
  if (!category || !name || price === undefined) return res.status(400).json({ error: 'Missing fields' });
  const db = getDb();
  const result = db.prepare('INSERT INTO pricing (category, name, price, unit) VALUES (?, ?, ?, ?)').run(category, name, price, unit || null);
  res.json({ id: result.lastInsertRowid, category, name, price, unit });
});

router.put('/:id', authorize('admin'), (req, res) => {
  const { category, name, price, unit, active } = req.body;
  const db = getDb();
  const item = db.prepare('SELECT * FROM pricing WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE pricing SET category=?, name=?, price=?, unit=?, active=? WHERE id=?')
    .run(category ?? item.category, name ?? item.name, price ?? item.price, unit ?? item.unit, active !== undefined ? active : item.active, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', authorize('admin'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE pricing SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
