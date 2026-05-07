const express = require('express');
const { getDb } = require('../db/init');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('./activitylog');
const { sendAutoStatusWhatsApp, sendAutoPaymentWhatsApp } = require('../services/orderWhatsAppNotifications');

const router = express.Router();
router.use(authenticate);

const STATUS_PIPELINE = ['pending_pickup', 'picked', 'cleaning', 'ready', 'paid', 'delivered'];

function getNextStatus(current) {
  const idx = STATUS_PIPELINE.indexOf(current);
  return idx >= 0 && idx < STATUS_PIPELINE.length - 1 ? STATUS_PIPELINE[idx + 1] : null;
}

function canAdvance(from, to, userRole) {
  const fromIdx = STATUS_PIPELINE.indexOf(from);
  const toIdx = STATUS_PIPELINE.indexOf(to);
  if (toIdx !== fromIdx + 1) return false;
  if (to === 'picked' && !['driver', 'admin'].includes(userRole)) return false;
  if ((to === 'cleaning' || to === 'ready') && !['reception', 'admin'].includes(userRole)) return false;
  if (to === 'paid' && !['reception', 'admin'].includes(userRole)) return false;
  if (to === 'delivered' && !['driver', 'admin'].includes(userRole)) return false;
  return true;
}

router.get('/', (req, res) => {
  const db = getDb();
  const { status, date } = req.query;
  let query = `
    SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.location as customer_location,
           COUNT(oi.id) as item_count
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
  `;
  const params = [];
  const conditions = [];
  if (status) { conditions.push('o.status = ?'); params.push(status); }
  if (date) { conditions.push("DATE(o.created_at) = ?"); params.push(date); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' GROUP BY o.id ORDER BY o.created_at DESC';

  const orders = db.prepare(query).all(...params);
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.location as customer_location
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
  `).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
  const payments = db.prepare(`
    SELECT p.*, u.name as recorded_by_name
    FROM payments p
    LEFT JOIN users u ON u.id = p.recorded_by
    WHERE p.order_id = ?
  `).all(req.params.id);
  const history = db.prepare(`
    SELECT sh.*, u.name as changed_by_name
    FROM status_history sh
    LEFT JOIN users u ON u.id = sh.changed_by
    WHERE sh.order_id = ?
    ORDER BY sh.created_at ASC
  `).all(req.params.id);
  const messages = db.prepare('SELECT * FROM message_log WHERE order_id = ? ORDER BY sent_at DESC').all(req.params.id);

  res.json({ ...order, items, payments, history, messages });
});

router.post('/', authorize('admin', 'reception'), (req, res) => {
  const { customer_id, items, pickup_time, notes } = req.body;
  if (!customer_id || !items || !items.length) return res.status(400).json({ error: 'Customer and items required' });

  const db = getDb();
  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customer_id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const total = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

  const orderResult = db.prepare(
    'INSERT INTO orders (customer_id, pickup_time, notes, total_amount, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(customer_id, pickup_time || null, notes || null, total, req.user.id);

  const orderId = orderResult.lastInsertRowid;

  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, service_name, description, quantity, unit, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  items.forEach(item => {
    insertItem.run(orderId, item.service_name, item.description || null, item.quantity, item.unit || null, item.unit_price, item.total_price);
  });

  db.prepare('INSERT INTO status_history (order_id, from_status, to_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)')
    .run(orderId, null, 'pending_pickup', req.user.id, 'Order created');

  const order = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone
    FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?
  `).get(orderId);

  logActivity(req.user.id, 'ORDER_CREATED', `Order #${orderId} for customer ${customer_id}`);

  res.json(order);
});

router.patch('/:id/status', (req, res) => {
  const { status, notes } = req.body;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (!canAdvance(order.status, status, req.user.role)) {
    return res.status(400).json({ error: `Cannot move from ${order.status} to ${status}` });
  }

  db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  db.prepare('INSERT INTO status_history (order_id, from_status, to_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, order.status, status, req.user.id, notes || null);

  logActivity(req.user.id, 'STATUS_CHANGED', `Order #${req.params.id}: ${order.status} → ${status}`);

  res.json({ success: true, status });

  process.nextTick(() => {
    if (status === 'paid') {
      const pay = db.prepare('SELECT amount FROM payments WHERE order_id = ? ORDER BY id DESC LIMIT 1').get(req.params.id);
      const amt = pay != null ? pay.amount : order.total_amount;
      sendAutoPaymentWhatsApp(req.params.id, req.user.id, amt).catch(err => {
        console.error('[orders/status] Auto WhatsApp (payment):', err);
      });
    } else {
      sendAutoStatusWhatsApp(req.params.id, status, req.user.id).catch(err => {
        console.error('[orders/status] Auto WhatsApp:', err);
      });
    }
  });
});

router.post('/:id/payment', authorize('admin', 'reception'), (req, res) => {
  const { amount, method, reference } = req.body;
  if (!amount || !method) return res.status(400).json({ error: 'Amount and method required' });

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const PAYABLE_STATUSES = ['picked', 'cleaning', 'ready'];
  if (!PAYABLE_STATUSES.includes(order.status)) {
    return res.status(400).json({
      error: 'Payment can only be recorded after items are picked up'
    });
  }

  // Record payment.
  db.prepare('INSERT INTO payments (order_id, amount, method, reference, recorded_by) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, amount, method, reference || null, req.user.id);

  // Only move to paid when order is currently ready.
  if (order.status === 'ready') {
    db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('paid', req.params.id);
    db.prepare('INSERT INTO status_history (order_id, from_status, to_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, 'ready', 'paid', req.user.id, `Payment: ${method} ${amount}`);
  } else {
    db.prepare('INSERT INTO status_history (order_id, from_status, to_status, changed_by, notes) VALUES (?, ?, ?, ?, ?)')
      .run(
        req.params.id,
        order.status,
        order.status,
        req.user.id,
        `Early payment recorded: ${method} KES ${amount}`
      );
    db.prepare('UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  }

  logActivity(req.user.id, 'PAYMENT_RECORDED', `Order #${req.params.id}: KES ${amount} via ${method}`);

  res.json({
    success: true,
    early_payment: order.status !== 'ready',
    message: order.status === 'ready'
      ? 'Payment confirmed, order moved to Paid'
      : 'Payment recorded. Order will move to Paid when Ready.'
  });

  process.nextTick(() => {
    sendAutoPaymentWhatsApp(req.params.id, req.user.id, amount).catch(err => {
      console.error('[orders/payment] Auto WhatsApp:', err);
    });
  });
});

router.put('/:id', authorize('admin', 'reception'), (req, res) => {
  const { items, notes, pickup_time } = req.body;
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  if (items) {
    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot edit items on a delivered order' });
    }
    const total = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(req.params.id);
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, service_name, description, quantity, unit, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    items.forEach(item => {
      insertItem.run(req.params.id, item.service_name, item.description || null, item.quantity, item.unit || null, item.unit_price, item.total_price);
    });
    db.prepare('UPDATE orders SET total_amount = ?, notes = ?, pickup_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(total, notes || order.notes, pickup_time || order.pickup_time, req.params.id);
  }

  res.json({ success: true });
});

module.exports = router;
