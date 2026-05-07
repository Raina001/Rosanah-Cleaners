const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/init');
const { backup } = require('./backup');

const app = express();
const PORT = process.env.PORT || 3001;

initDb();

// Meta webhook (GET verify + POST events) must run BEFORE CORS. Facebook's verification
// request can send an Origin that isn't in our browser allowlist; CORS would reject it
// before this route runs, causing "callback URL couldn't be validated".
app.use(express.json());
app.disable('x-powered-by');
app.use('/api/whatsapp', require('./routes/whatsappWebhook'));

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin and non-browser requests.
      if (!origin) return callback(null, true);
      if (origin === 'http://localhost:3000') return callback(null, true);
      if (/\.pages\.dev$/.test(origin)) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.removeHeader('X-Powered-By');
  next();
});

function sanitizeInput(req, res, next) {
  function sanitize(obj) {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '').trim();
    }
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj && typeof obj === 'object') {
      const clean = {};
      for (const [k, v] of Object.entries(obj)) {
        const cleanKey = k.replace(/[^\w.-]/g, '');
        clean[cleanKey] = sanitize(v);
      }
      return clean;
    }
    return obj;
  }
  if (req.body) req.body = sanitize(req.body);
  next();
}

app.use(sanitizeInput);

const loginAttempts = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  record.count++;
  loginAttempts.set(ip, record);
  if (record.count > maxAttempts) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now > record.resetAt) loginAttempts.delete(ip);
  }
}, 60 * 60 * 1000);

app.use('/api/auth/login', rateLimiter);
app.use('/api/auth/request-password-reset', rateLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reviews', require('./routes/reviews'));
const { router: activityRouter } = require('./routes/activitylog');
app.use('/api/activity', activityRouter);

const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) res.status(200).send('Rosanah Cleaners API Running');
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Rosanah Cleaners Server running on port ${PORT}`);
});

backup();
setInterval(backup, 24 * 60 * 60 * 1000);
