const express = require('express');
const { getDb } = require('../db/init');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function logActivity(userId, action, details) {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO activity_log (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    ).run(userId, action, details || null);
  } catch (e) {
    console.error('Activity log error:', e.message);
  }
}

router.get('/', authorize('admin'), (req, res) => {
  const db = getDb();
  const logs = db.prepare(`
    SELECT al.*, u.name as user_name, u.role as user_role
    FROM activity_log al
    LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC
    LIMIT 200
  `).all();
  res.json(logs);
});

module.exports = { router, logActivity };
