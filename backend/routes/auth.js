const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('./activitylog');

const router = express.Router();

const RESET_TOKEN_MS = 60 * 60 * 1000;

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND active = 1').get(username, username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role } });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post('/request-password-reset', (req, res) => {
  const identifier = (req.body.usernameOrEmail || req.body.username || '').trim();
  const db = getDb();
  const generic =
    'If an account exists for that username or email, a reset link is ready. Ask your server administrator, or check the server log when PASSWORD_RESET_LOG_TOKENS is enabled.';

  if (!identifier) {
    return res.status(400).json({ error: 'Enter your username or email' });
  }

  const user = db
    .prepare('SELECT id, username FROM users WHERE (username = ? OR email = ?) AND active = 1')
    .get(identifier, identifier);

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_MS).toISOString();
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
    db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(
      user.id,
      token,
      expiresAt
    );

    if (process.env.PASSWORD_RESET_LOG_TOKENS === '1' || process.env.PASSWORD_RESET_LOG_TOKENS === 'true') {
      const base = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
      console.info(`[Rosanah] Password reset for ${user.username}: ${base}/reset-password?token=${token}`);
    }
  }

  res.json({ message: generic });
});

router.post('/complete-password-reset', (req, res) => {
  const { token, password } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Reset link is invalid or expired' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = getDb();
  const row = db.prepare('SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?').get(token.trim());
  if (!row || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset link is invalid or expired' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, row.user_id);
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(row.user_id);
  res.json({ success: true });
});

router.post('/reopen-setup', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only administrators can reopen setup' });
  }
  const db = getDb();
  db.prepare("UPDATE settings SET value = '0' WHERE key = 'setup_complete'").run();
  logActivity(req.user.id, 'SETUP_REOPENED', 'First-time setup wizard reopened');
  res.json({ success: true });
});

router.get('/setup-status', (req, res) => {
  const db = getDb();
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get();
  res.json({ setup_complete: setting?.value === '1' });
});

router.post('/setup', (req, res) => {
  const db = getDb();

  const setting = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get();
  if (setting?.value === '1') {
    return res.status(403).json({ error: 'Setup already completed' });
  }

  const { business_name, admin_name, username, email, password } = req.body;

  if (!admin_name || !username || !password) {
    return res.status(400).json({ error: 'Name, username and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const primaryAdmin = db
    .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1")
    .get();
  if (!primaryAdmin) {
    return res.status(500).json({ error: 'No administrator account found' });
  }

  const taken = db
    .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
    .get(username, primaryAdmin.id);
  if (taken) return res.status(400).json({ error: 'Username already taken' });

  if (business_name) {
    db.prepare("UPDATE settings SET value = ? WHERE key = 'business_name'").run(business_name);
  }

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE users SET name = ?, username = ?, email = ?, password = ? WHERE id = ?').run(
    admin_name,
    username,
    email || null,
    hash,
    primaryAdmin.id
  );

  db.prepare("UPDATE settings SET value = '1' WHERE key = 'setup_complete'").run();
  db.prepare("UPDATE users SET active = 0 WHERE username IN ('reception', 'driver')").run();
  if (username !== 'admin') {
    db.prepare("UPDATE users SET active = 0 WHERE username = 'admin' AND id != ?").run(primaryAdmin.id);
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  const token = jwt.sign(
    { id: user.id, name: user.name, username: user.username, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, username: user.username, role: user.role, email: user.email }
  });
});

// Temporary migration endpoint. Remove after DB transfer completes.
router.post('/import-db-temp', (req, res) => {
  try {
    const token = String(req.headers['x-migration-token'] || '');
    if (!process.env.MIGRATION_TOKEN || token !== process.env.MIGRATION_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      if (!body || body.length < 1024) {
        return res.status(400).json({ error: 'Invalid DB payload' });
      }

      const fs = require('fs');
      const path = require('path');
      const Database = require('better-sqlite3');

      const target = process.env.DB_PATH || '/data/rosanah.db';
      const tmp = `${target}.tmp`;

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(tmp, body);

      try {
        const probe = new Database(tmp, { readonly: true, fileMustExist: true });
        const row = probe.prepare('PRAGMA integrity_check;').get();
        probe.close();
        const result = String(Object.values(row || {})[0] || '').toLowerCase();

        if (result !== 'ok') {
          fs.unlinkSync(tmp);
          return res.status(400).json({ error: 'SQLite integrity check failed' });
        }
      } catch (e) {
        try {
          fs.unlinkSync(tmp);
        } catch (_) {}
        return res.status(400).json({ error: `SQLite integrity check failed: ${e.message}` });
      }

      fs.renameSync(tmp, target);
      return res.json({ success: true, path: target, size: body.length });
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});
router.get('/debug-db-temp', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const Database = require('better-sqlite3');

    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'rosanah.db');
    const exists = fs.existsSync(dbPath);
    const size = exists ? fs.statSync(dbPath).size : 0;

    let setupValue = null;
    if (exists) {
      const probe = new Database(dbPath, { readonly: true, fileMustExist: true });
      const row = probe.prepare("SELECT value FROM settings WHERE key='setup_complete'").get();
      probe.close();
      setupValue = row?.value ?? null;
    }

    res.json({ dbPath, exists, size, setup_complete_value: setupValue });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/fix-setup-flag-temp', (req, res) => {
  try {
    const token = String(req.headers['x-migration-token'] || '');
    if (!process.env.MIGRATION_TOKEN || token !== process.env.MIGRATION_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = getDb();
    db.prepare("UPDATE settings SET value = '1' WHERE key = 'setup_complete'").run();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get();

    res.json({ success: true, setup_complete: row?.value });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
module.exports = router;
