const express = require('express');
const { getDb } = require('../db/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.post('/log', (req, res) => {
  const { order_id, customer_id, type, message, wa_message_id, wa_status } = req.body;
  const db = getDb();
  const result = db.prepare(
    `INSERT INTO message_log (order_id, customer_id, type, message, sent_by, wa_message_id, wa_status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    order_id || null,
    customer_id || null,
    type || 'whatsapp',
    message,
    req.user.id,
    wa_message_id || null,
    wa_status || null
  );
  res.json({ id: result.lastInsertRowid });
});

router.get('/order/:orderId', (req, res) => {
  const db = getDb();
  const messages = db.prepare('SELECT * FROM message_log WHERE order_id = ? ORDER BY sent_at DESC').all(req.params.orderId);
  res.json(messages);
});

/** Customer replies from WhatsApp Cloud API webhooks (admin + reception only). */
router.get('/inbox', authorize('admin', 'reception'), (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT i.id, i.wa_message_id, i.from_wa_id, i.profile_name, i.message_type, i.body, i.customer_id, i.created_at,
              c.name AS customer_name
       FROM whatsapp_inbound i
       LEFT JOIN customers c ON c.id = i.customer_id
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(limit, offset);
  res.json(rows);
});

router.post('/bulk', authorize('admin'), (req, res) => {
  const { customer_ids, message } = req.body;
  const db = getDb();
  const insert = db.prepare('INSERT INTO message_log (customer_id, type, message, sent_by) VALUES (?, ?, ?, ?)');
  customer_ids.forEach(cid => insert.run(cid, 'bulk', message, req.user.id));
  res.json({ success: true, count: customer_ids.length });
});

module.exports = router;
