const express = require('express');
const { getDb } = require('../db/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/dashboard', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const customersToday = db.prepare("SELECT COUNT(*) as count FROM customers WHERE DATE(created_at) = ?").get(today);
  const revenueToday = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE DATE(created_at) = ?").get(today);
  const ordersInCleaning = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'cleaning'").get();
  const pendingDeliveries = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'paid'").get();
  const pendingPickup = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending_pickup'").get();
  const picked = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'picked'").get();
  const ordersReady = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'ready'").get();
  const ordersToday = db.prepare("SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?").get(today);

  res.json({
    customers_today: customersToday.count,
    revenue_today: revenueToday.total,
    orders_in_cleaning: ordersInCleaning.count,
    pending_deliveries: pendingDeliveries.count,
    pending_pickup: pendingPickup.count,
    picked: picked.count,
    orders_ready: ordersReady.count,
    orders_today: ordersToday.count,
  });
});

router.get('/daily', authorize('admin', 'reception'), (req, res) => {
  const db = getDb();
  const { date } = req.query;
  const d = date || new Date().toISOString().slice(0, 10);

  const orders = db.prepare(`
    SELECT o.id, o.status, o.total_amount, o.created_at, o.pickup_time,
           c.name as customer_name, c.phone as customer_phone, c.location,
           COALESCE(SUM(p.amount), 0) as paid_amount,
           GROUP_CONCAT(oi.service_name || ' x' || oi.quantity, ', ') as items_summary
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN payments p ON p.order_id = o.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE DATE(o.created_at) = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(d);

  res.json({ date: d, orders });
});

router.get('/payments', authorize('admin', 'reception'), (req, res) => {
  const db = getDb();
  const { date, from, to } = req.query;
  let query = `
    SELECT p.*, o.id as order_id, c.name as customer_name, c.phone as customer_phone,
           u.name as recorded_by_name
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u ON u.id = p.recorded_by
  `;
  const params = [];
  if (date) { query += ' WHERE DATE(p.created_at) = ?'; params.push(date); }
  else if (from && to) { query += ' WHERE DATE(p.created_at) BETWEEN ? AND ?'; params.push(from, to); }
  query += ' ORDER BY p.created_at DESC';

  const payments = db.prepare(query).all(...params);
  const total = payments.reduce((s, p) => s + p.amount, 0);
  res.json({ payments, total });
});

router.get('/export/daily', authorize('admin', 'reception'), (req, res) => {
  const db = getDb();
  const { date } = req.query;
  const d = date || new Date().toISOString().slice(0, 10);

  const orders = db.prepare(`
    SELECT o.id, c.name as customer_name, c.phone, c.location,
           o.status, o.total_amount, o.created_at,
           COALESCE(SUM(p.amount), 0) as paid_amount,
           GROUP_CONCAT(oi.service_name || ' x' || oi.quantity, '; ') as items
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN payments p ON p.order_id = o.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE DATE(o.created_at) = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(d);

  let csv = 'Order ID,Customer,Phone,Location,Items,Status,Total Amount,Paid Amount,Created At\n';
  orders.forEach(o => {
    csv += `${o.id},"${o.customer_name}","${o.phone}","${o.location || ''}","${o.items || ''}",${o.status},${o.total_amount},${o.paid_amount},"${o.created_at}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rosanah_report_${d}.csv"`);
  res.send(csv);
});

router.get('/export/payments', authorize('admin', 'reception'), (req, res) => {
  const db = getDb();
  const { date } = req.query;
  const d = date || new Date().toISOString().slice(0, 10);

  const payments = db.prepare(`
    SELECT p.id, c.name as customer_name, c.phone, p.amount, p.method, p.reference, p.created_at,
           u.name as recorded_by
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN users u ON u.id = p.recorded_by
    WHERE DATE(p.created_at) = ?
    ORDER BY p.created_at DESC
  `).all(d);

  let csv = 'Payment ID,Customer,Phone,Amount,Method,Reference,Recorded By,Created At\n';
  payments.forEach(p => {
    csv += `${p.id},"${p.customer_name}","${p.phone}",${p.amount},${p.method},"${p.reference || ''}","${p.recorded_by || ''}","${p.created_at}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rosanah_payments_${d}.csv"`);
  res.send(csv);
});

module.exports = router;
