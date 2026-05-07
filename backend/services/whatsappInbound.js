const { getDb } = require('../db/init');

function normalizeWaId(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) return '254' + d.slice(1);
  if (d.startsWith('254')) return d;
  if (d.length === 9) return '254' + d;
  return d;
}

function resolveCustomerId(db, fromWaId) {
  const target = normalizeWaId(fromWaId);
  if (!target) return null;
  const rows = db.prepare('SELECT id, phone FROM customers WHERE phone IS NOT NULL AND TRIM(phone) != \'\'').all();
  for (const r of rows) {
    if (normalizeWaId(r.phone) === target) return r.id;
  }
  return null;
}

function profileNameFromContacts(contacts, from) {
  const fromNorm = normalizeWaId(from);
  for (const c of contacts || []) {
    const wid = c.wa_id != null ? String(c.wa_id) : '';
    if (wid === from || normalizeWaId(wid) === fromNorm) {
      return c.profile?.name || null;
    }
  }
  return null;
}

function extractBody(msg) {
  const t = msg.type;
  if (t === 'text') return msg.text?.body ?? '';
  if (t === 'button') return msg.button?.text || msg.button?.payload || '[button]';
  if (t === 'interactive') {
    const ir = msg.interactive;
    if (ir?.type === 'button_reply') return ir.button_reply?.title || ir.button_reply?.id || '[button reply]';
    if (ir?.type === 'list_reply') return ir.list_reply?.title || '[list reply]';
    return '[interactive]';
  }
  if (t === 'image') return msg.image?.caption ? `[image] ${msg.image.caption}` : '[image]';
  if (t === 'document') return msg.document?.filename ? `[document] ${msg.document.filename}` : '[document]';
  if (t === 'audio') return '[audio]';
  if (t === 'video') return msg.video?.caption ? `[video] ${msg.video.caption}` : '[video]';
  if (t === 'location') return msg.location ? `[location]` : '[location]';
  if (t === 'contacts') return '[contacts]';
  if (t === 'sticker') return '[sticker]';
  return t ? `[${t}]` : '[message]';
}

/**
 * Persist customer-originated messages from a WhatsApp Cloud API webhook `value` object.
 */
function processInboundWebhookValue(value) {
  if (!value || !Array.isArray(value.messages) || value.messages.length === 0) {
    return;
  }
  const db = getDb();
  const contacts = value.contacts || [];
  const insert = db.prepare(
    `INSERT OR IGNORE INTO whatsapp_inbound (wa_message_id, from_wa_id, profile_name, message_type, body, raw_payload, customer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (const msg of value.messages) {
    if (!msg.from || !msg.id) continue;
    const profileName = profileNameFromContacts(contacts, msg.from);
    const customerId = resolveCustomerId(db, msg.from);
    const body = extractBody(msg);
    const type = msg.type || 'unknown';
    let rawPayload = null;
    try {
      rawPayload = JSON.stringify(msg);
    } catch {
      rawPayload = null;
    }
    insert.run(
      String(msg.id),
      String(msg.from),
      profileName,
      type,
      body,
      rawPayload,
      customerId
    );
  }
}

module.exports = {
  processInboundWebhookValue,
  normalizeWaId,
  resolveCustomerId,
};
