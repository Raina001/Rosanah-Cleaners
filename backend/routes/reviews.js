const express = require('express');
const { getDb } = require('../db/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/check/:orderId', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT id FROM reviews WHERE order_id = ?').get(req.params.orderId);
  res.json(row || null);
});

router.post('/submit', (req, res) => {
  const { order_id, customer_id, rating, comment, token } = req.body;

  if (!order_id || !customer_id || rating == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const r = Number(rating);
  if (Number.isNaN(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const db = getDb();

  const expectedToken = Buffer.from(`${order_id}-${customer_id}-rosanah`).toString('base64');
  const raw = String(token || '').trim();
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  if (decoded !== expectedToken && raw !== expectedToken) {
    return res.status(403).json({ error: 'Invalid review link' });
  }

  const order = db.prepare(
    `SELECT * FROM orders WHERE id = ? AND customer_id = ? AND status IN ('paid','delivered')`
  ).get(order_id, customer_id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found or not ready for review yet' });
  }

  const existing = db.prepare('SELECT id FROM reviews WHERE order_id = ?').get(order_id);
  if (existing) {
    return res.status(400).json({ error: 'Review already submitted for this order' });
  }

  db.prepare(
    'INSERT INTO reviews (order_id, customer_id, rating, comment) VALUES (?, ?, ?, ?)'
  ).run(order_id, customer_id, r, comment || null);

  res.json({ success: true, message: 'Thank you for your review!' });
});

router.get('/', authenticate, authorize('admin'), (req, res) => {
  const db = getDb();
  const reviews = db.prepare(`
    SELECT r.*,
      c.name as customer_name, c.phone as customer_phone,
      o.id as order_number,
      o.total_amount
    FROM reviews r
    JOIN customers c ON c.id = r.customer_id
    JOIN orders o ON o.id = r.order_id
    ORDER BY r.created_at DESC
  `).all();

  const avg = reviews.length > 0
    ? (reviews.reduce((s, row) => s + row.rating, 0) / reviews.length).toFixed(1)
    : null;

  res.json({ reviews, average_rating: avg, total: reviews.length });
});

router.get('/order/:orderId', authenticate, (req, res) => {
  const db = getDb();
  const review = db.prepare(
    'SELECT * FROM reviews WHERE order_id = ?'
  ).get(req.params.orderId);
  res.json(review || null);
});

module.exports = router;
