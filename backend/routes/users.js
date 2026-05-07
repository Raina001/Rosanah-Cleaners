const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/init');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('./activitylog');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('admin'), (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, phone, email, username, role, active, created_at FROM users ORDER BY id').all();
  res.json(users);
});

router.post('/', authorize('admin'), (req, res) => {
  const { name, phone, email, username, password, role } = req.body;
  if (!name || !username || !password || !role) return res.status(400).json({ error: 'Missing required fields' });
  const db = getDb();
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(400).json({ error: 'Username already exists' });
  if (email) {
    const emailTaken = db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).get(email);
    if (emailTaken) return res.status(400).json({ error: 'Email already in use' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, phone, email, username, password, role) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, phone || null, email || null, username, hash, role);
  logActivity(req.user.id, 'USER_CREATED', `Created user: ${username} (${role})`);
  res.json({ id: result.lastInsertRowid, name, username, email: email || null, role });
});

router.put('/:id', (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const isSelf = String(req.user.id) === String(req.params.id);
  if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Forbidden' });

  const { name, phone, email, password, role, active, currentPassword, username } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newUsername = username !== undefined ? username : user.username;
  if (newUsername && newUsername !== user.username) {
    const taken = db.prepare(
      'SELECT id FROM users WHERE username = ? AND id != ?'
    ).get(newUsername, req.params.id);
    if (taken) return res.status(400).json({ error: 'Username already taken' });
  }
  if (email && email !== user.email) {
    const emailTaken = db.prepare(
      'SELECT id FROM users WHERE email = ? AND id != ?'
    ).get(email, req.params.id);
    if (emailTaken) return res.status(400).json({ error: 'Email already in use' });
  }

  if (isSelf && !isAdmin) {
    const newName = name !== undefined ? name : user.name;
    db.prepare('UPDATE users SET name=?, username=?, email=? WHERE id=?').run(
      newName,
      newUsername,
      email !== undefined ? email : user.email,
      req.params.id
    );
    return res.json({ success: true });
  }

  const hash = password ? bcrypt.hashSync(password, 10) : user.password;
  db.prepare(
    'UPDATE users SET name=?, phone=?, email=?, password=?, role=?, active=?, username=? WHERE id=?'
  ).run(
    name || user.name,
    phone !== undefined ? phone : user.phone,
    email !== undefined ? email : user.email,
    hash,
    role || user.role,
    active !== undefined ? active : user.active,
    newUsername,
    req.params.id
  );
  res.json({ success: true });
});

router.delete('/:id', authorize('admin'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
