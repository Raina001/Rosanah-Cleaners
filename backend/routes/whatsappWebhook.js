const express = require('express');
const { getDb } = require('../db/init');
const { processInboundWebhookValue } = require('../services/whatsappInbound');

const router = express.Router();

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = String(req.query['hub.verify_token'] ?? '').trim();
  const challenge = req.query['hub.challenge'];
  const verify = String(process.env.WHATSAPP_VERIFY_TOKEN ?? '').trim();
  if (mode === 'subscribe' && verify && token === verify && challenge != null) {
    return res.status(200).type('text/plain').send(String(challenge));
  }
  return res.sendStatus(403);
});

router.post('/webhook', (req, res) => {
  res.sendStatus(200);
  try {
    const entries = (req.body && req.body.entry) || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        processInboundWebhookValue(value);
        for (const st of value.statuses || []) {
          const waId = st.id;
          const status = st.status;
          if (!waId || !status) continue;
          const db = getDb();
          db.prepare('UPDATE message_log SET wa_status = ? WHERE wa_message_id = ?').run(status, waId);
        }
      }
    }
  } catch (e) {
    console.error('[WhatsApp webhook]', e);
  }
});

module.exports = router;
