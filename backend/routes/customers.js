const express = require('express');
const { getDb } = require('../db/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const db = getDb();
  const { q } = req.query;
  if (q && q.length > 100) return res.status(400).json({ error: 'Search query too long' });

  const orderCountSql = '(SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id)';
  const totalSpentSql = '(SELECT COALESCE(SUM(p.amount), 0) FROM orders o JOIN payments p ON p.order_id = o.id WHERE o.customer_id = c.id)';
  const loyaltySql = `CASE 
    WHEN ${orderCountSql} >= 10 THEN 'gold'
    WHEN ${orderCountSql} >= 5 THEN 'silver'
    WHEN ${orderCountSql} >= 2 THEN 'returning'
    ELSE 'new'
  END`;

  const baseSelect = `
    SELECT c.*,
      ${orderCountSql} as order_count,
      ${totalSpentSql} as total_spent,
      ${loyaltySql} as loyalty_tier
    FROM customers c
  `;

  let customers;
  if (q) {
    customers = db.prepare(
      `${baseSelect} WHERE c.name LIKE ? OR c.phone LIKE ? ORDER BY c.created_at DESC`
    ).all(`%${q}%`, `%${q}%`);
  } else {
    customers = db.prepare(`${baseSelect} ORDER BY c.created_at DESC`).all();
  }
  res.json(customers);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });

  const orders = db.prepare(`
    SELECT o.*, COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(req.params.id);

  res.json({ ...customer, orders });
});

router.post('/', authorize('admin', 'reception'), (req, res) => {
  const { name, phone, location, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  const db = getDb();

  const existing = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if (existing) return res.json(existing);

  const result = db.prepare('INSERT INTO customers (name, phone, location, notes) VALUES (?, ?, ?, ?)')
    .run(name, phone, location || null, notes || null);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.json(customer);
});

router.put('/:id', authorize('admin', 'reception'), (req, res) => {
  const { name, phone, location, notes } = req.body;
  const db = getDb();
  db.prepare('UPDATE customers SET name=?, phone=?, location=?, notes=? WHERE id=?')
    .run(name, phone, location, notes, req.params.id);
  res.json({ success: true });
});

module.exports = router;
