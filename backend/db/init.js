const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'rosanah.db');

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','reception','driver')),
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_pickup'
        CHECK(status IN ('pending_pickup','picked','cleaning','ready','paid','delivered')),
      pickup_time TEXT,
      notes TEXT,
      total_amount REAL DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      service_name TEXT NOT NULL,
      description TEXT,
      quantity REAL DEFAULT 1,
      unit TEXT,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('cash','mpesa','card','other')),
      reference TEXT,
      recorded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (recorded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS message_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      customer_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('whatsapp','sms','bulk')),
      message TEXT NOT NULL,
      sent_by INTEGER,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (sent_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_inbound (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wa_message_id TEXT UNIQUE NOT NULL,
      from_wa_id TEXT NOT NULL,
      profile_name TEXT,
      message_type TEXT NOT NULL,
      body TEXT,
      raw_payload TEXT,
      customer_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_created_at ON whatsapp_inbound(created_at DESC);

    CREATE TABLE IF NOT EXISTS pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      unit TEXT,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  try {
    db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run();
  } catch (e) {
  }

  try {
    db.prepare('ALTER TABLE message_log ADD COLUMN wa_message_id TEXT').run();
  } catch (e) {
  }
  try {
    db.prepare('ALTER TABLE message_log ADD COLUMN wa_status TEXT').run();
  } catch (e) {
  }

  const existingUsers = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (!existingUsers || existingUsers.c === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`)
      .run('Administrator', 'admin', hash, 'admin');
    const rhash = bcrypt.hashSync('reception123', 10);
    db.prepare(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`)
      .run('Reception Staff', 'reception', rhash, 'reception');
    const dhash = bcrypt.hashSync('driver123', 10);
    db.prepare(`INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)`)
      .run('Driver', 'driver', dhash, 'driver');
  }

  const pricingCount = db.prepare('SELECT COUNT(*) as c FROM pricing').get();
  if (pricingCount.c === 0) {
    const pricingData = [
      { category: 'Carpets', name: 'Carpet (Standard)', price: 25, unit: 'sqft', sort_order: 1 },
      { category: 'Carpets', name: 'Carpet (Budget)', price: 20, unit: 'sqft', sort_order: 2 },
      { category: 'Duvets', name: 'Duvet (Small)', price: 400, unit: 'piece', sort_order: 3 },
      { category: 'Duvets', name: 'Duvet (Medium)', price: 500, unit: 'piece', sort_order: 4 },
      { category: 'Duvets', name: 'Duvet (Large)', price: 600, unit: 'piece', sort_order: 5 },
      { category: 'Laundry', name: 'Laundry (Premium)', price: 200, unit: 'kg', sort_order: 6 },
      { category: 'Laundry', name: 'Laundry (Standard)', price: 120, unit: 'kg', sort_order: 7 },
      { category: 'Laundry', name: 'Laundry (Budget)', price: 100, unit: 'kg', sort_order: 8 },
      { category: 'Curtains', name: 'Curtains (Premium)', price: 400, unit: 'kg', sort_order: 9 },
      { category: 'Curtains', name: 'Curtains (Heavy)', price: 300, unit: 'kg', sort_order: 10 },
      { category: 'Curtains', name: 'Curtains (Standard)', price: 250, unit: 'kg', sort_order: 11 },
      { category: 'Curtains', name: 'Curtains (Budget)', price: 200, unit: 'kg', sort_order: 12 },
      { category: 'Suits', name: 'Suit', price: 600, unit: 'piece', sort_order: 13 },
      { category: 'Blazers', name: 'Blazer', price: 300, unit: 'piece', sort_order: 14 },
      { category: 'Shoes', name: 'Shoes (Standard)', price: 50, unit: 'pair', sort_order: 15 },
      { category: 'Shoes', name: 'Shoes (Premium)', price: 100, unit: 'pair', sort_order: 16 },
      { category: 'Furniture', name: 'Sofa', price: 700, unit: 'piece', sort_order: 17 },
      { category: 'Furniture', name: 'Dining Chair', price: 350, unit: 'piece', sort_order: 18 },
    ];
    const insert = db.prepare('INSERT INTO pricing (category, name, price, unit, sort_order) VALUES (?, ?, ?, ?, ?)');
    pricingData.forEach(p => insert.run(p.category, p.name, p.price, p.unit, p.sort_order));
  }

  const settingsData = [
    { key: 'business_name', value: 'Rosanah Cleaners' },
    { key: 'business_phone', value: '+254713497495' },
    { key: 'business_address', value: 'Nairobi, Kenya' },
    { key: 'whatsapp_number', value: '+254713497495' },
    { key: 'setup_complete', value: '0' },
    { key: 'pickup_message', value: 'Hello {name}, we have picked up {items_phrase}. We will measure at the shop and send your detailed invoice when cleaning starts.' },
    { key: 'cleaning_message', value: 'Hello {name}, cleaning has started for {items_phrase}. Here is your breakdown:\n\n{item_breakdown}\n\nTotal: KES {amount}.\n\nThank you for choosing Rosanah Cleaners.' },
    { key: 'ready_message', value: 'Hello {name}, your items are ready for delivery! Please arrange payment of KES {amount}.' },
    { key: 'payment_message', value: 'Hello {name}, payment of KES {amount} confirmed. Thank you!' },
    { key: 'delivery_message', value: 'Hello {name}, your items have been delivered! Thank you for choosing Rosanah Cleaners. We would love your feedback! Rate your experience here: {review_link}' },
  ];
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  settingsData.forEach(s => insertSetting.run(s.key, s.value));
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('setup_complete', '0')").run();

  try {
    db.prepare(`UPDATE settings SET value = REPLACE(value, 'KES KES ', 'KES ') WHERE value LIKE '%KES KES %'`).run();
  } catch (e) {
  }

  console.log('✅ Database initialized');
}

module.exports = { getDb, initDb };
