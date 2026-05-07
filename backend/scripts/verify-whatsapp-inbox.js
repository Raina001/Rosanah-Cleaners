/**
 * One-off verification: inbound webhook parsing + customer match + DB insert.
 * Run: cd backend && node scripts/verify-whatsapp-inbox.js
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

process.env.DB_PATH = path.join(os.tmpdir(), `wa-inbox-verify-${Date.now()}.db`);

const { initDb, getDb } = require('../db/init');
const { processInboundWebhookValue } = require('../services/whatsappInbound');

initDb();
const db = getDb();
db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run('Test User', '0712345678');

processInboundWebhookValue({
  contacts: [{ wa_id: '254712345678', profile: { name: 'Test User' } }],
  messages: [{ from: '254712345678', id: 'wamid.verify_test_1', type: 'text', text: { body: 'Hello shop' } }],
});

const row = db.prepare('SELECT * FROM whatsapp_inbound WHERE wa_message_id = ?').get('wamid.verify_test_1');
if (!row) throw new Error('Expected inbound row');
if (row.body !== 'Hello shop') throw new Error(`Expected body, got ${row.body}`);
if (!row.customer_id) throw new Error('Expected customer_id linked');
if (row.profile_name !== 'Test User') throw new Error('Expected profile name');

fs.unlinkSync(process.env.DB_PATH);
console.log('whatsapp inbox pipeline ok');
