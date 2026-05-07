const { getDb } = require('../db/init');
const {
  applyTemplate,
  buildReviewToken,
  formatAmountNumber,
  itemBreakdownLines,
  itemsPhrase,
} = require('../lib/orderWhatsAppText');
const { sendWhatsAppText, sendWhatsAppTemplate } = require('./whatsappCloud');

const WA_PARAM_MAX = 1020;

function truncParam(s) {
  const t = String(s ?? '');
  return t.length <= WA_PARAM_MAX ? t : `${t.slice(0, WA_PARAM_MAX - 1)}…`;
}

function useApprovedMetaTemplates() {
  const v = process.env.WHATSAPP_USE_APPROVED_TEMPLATES || '';
  return v === '1' || /^true$/i.test(v) || /^yes$/i.test(v);
}

function templateLanguage() {
  return (process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en').trim();
}

function templateNames() {
  return {
    pickup: (process.env.WHATSAPP_TEMPLATE_PICKUP || 'pickup_notification').trim(),
    cleaning: (process.env.WHATSAPP_TEMPLATE_CLEANING || 'cleaning_invoice').trim(),
    ready: (process.env.WHATSAPP_TEMPLATE_READY || 'items_ready').trim(),
    delivery: (process.env.WHATSAPP_TEMPLATE_DELIVERY || 'delivery_review').trim(),
    payment: (process.env.WHATSAPP_TEMPLATE_PAYMENT || '').trim(),
  };
}

function loadOrderBundle(orderId) {
  const db = getDb();
  const order = db.prepare(
    `SELECT o.*, c.name as customer_name, c.phone as customer_phone
     FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
  ).get(orderId);
  if (!order) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(r => {
    settings[r.key] = r.value;
  });
  return { order, items, settings };
}

function publicReviewLinkBase() {
  const base = (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
  return base || '';
}

function buildReviewLink(orderId, customerId) {
  const token = buildReviewToken(orderId, customerId);
  const base = publicReviewLinkBase();
  if (!base) return '';
  const enc = encodeURIComponent(token);
  return `${base}/review?order=${orderId}&customer=${customerId}&token=${enc}`;
}

function logWhatsAppRow(order, customerId, logText, userId, result) {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO message_log (order_id, customer_id, type, message, sent_by, wa_message_id, wa_status)
     VALUES (?, ?, 'whatsapp', ?, ?, ?, ?)`
  );
  const waId = result.messageId || null;
  let waStatus;
  if (result.ok) waStatus = result.viaTemplate ? 'sent_template' : 'sent_api';
  else if (result.skipped) waStatus = 'manual_only';
  else waStatus = 'api_failed';
  insert.run(order.id, customerId, logText, userId || null, waId, waStatus);
}

/**
 * Try Meta template first (if enabled); optional plain-text fallback when template fails.
 */
async function deliverMessage(phone, logText, getTemplatePayload) {
  if (useApprovedMetaTemplates()) {
    const tpl = getTemplatePayload();
    if (tpl) {
      const { name, params } = tpl;
      const result = await sendWhatsAppTemplate(phone, name, templateLanguage(), params);
      if (result.ok) {
        return { ...result, viaTemplate: true };
      }
      if (!result.skipped) {
        console.error('[orderWhatsAppNotifications] template failed', name, result.error);
      }
      const fallback = process.env.WHATSAPP_TEMPLATE_FALLBACK_TEXT;
      if (fallback === '1' || /^true$/i.test(fallback || '')) {
        return sendWhatsAppText(phone, logText);
      }
      return result;
    }
  }
  return sendWhatsAppText(phone, logText);
}

async function sendAutoStatusWhatsApp(orderId, newStatus, userId) {
  const bundle = loadOrderBundle(orderId);
  if (!bundle) return;

  const { order, items, settings } = bundle;
  const names = templateNames();
  const reviewLink = buildReviewLink(order.id, order.customer_id);

  const ctxBase = {
    customerName: order.customer_name,
    items,
    totalAmount: order.total_amount,
    reviewLink,
    orderId: order.id,
  };

  let settingKey = null;
  let buildTemplateSend = null;

  if (newStatus === 'picked') {
    settingKey = 'pickup_message';
    buildTemplateSend = () => ({
      name: names.pickup,
      params: [truncParam(order.customer_name), truncParam(itemsPhrase(items))],
    });
  } else if (newStatus === 'cleaning') {
    settingKey = 'cleaning_message';
    buildTemplateSend = () => ({
      name: names.cleaning,
      params: [
        truncParam(order.customer_name),
        truncParam(itemBreakdownLines(items)),
        truncParam(formatAmountNumber(order.total_amount)),
      ],
    });
  } else if (newStatus === 'ready') {
    settingKey = 'ready_message';
    buildTemplateSend = () => ({
      name: names.ready,
      params: [
        truncParam(order.customer_name),
        truncParam(itemBreakdownLines(items)),
        truncParam(formatAmountNumber(order.total_amount)),
      ],
    });
  } else if (newStatus === 'delivered') {
    settingKey = 'delivery_message';
    buildTemplateSend = () => {
      if (!reviewLink) return null;
      return {
        name: names.delivery,
        params: [truncParam(order.customer_name), truncParam(reviewLink)],
      };
    };
  }

  if (!settingKey) return;

  const templateStr = settings[settingKey];
  let logText = applyTemplate(templateStr || '', ctxBase);
  if (!logText.trim()) {
    logText = `[WhatsApp auto · ${newStatus}]`;
  }

  const result = await deliverMessage(order.customer_phone, logText, buildTemplateSend);

  logWhatsAppRow(order, order.customer_id, logText, userId, result);

  if (!result.ok && !result.skipped) {
    console.error('[orderWhatsAppNotifications]', orderId, newStatus, result.error);
  }
}

/**
 * Called when payment is recorded (order becomes paid). Optional Meta template WHATSAPP_TEMPLATE_PAYMENT
 * with body {{1}}=name, {{2}}=amount (digits only, template text should prefix with KES if needed).
 */
async function sendAutoPaymentWhatsApp(orderId, userId, paidAmount) {
  const bundle = loadOrderBundle(orderId);
  if (!bundle) return;

  const { order, items, settings } = bundle;
  const names = templateNames();
  const reviewLink = buildReviewLink(order.id, order.customer_id);
  const ctx = {
    customerName: order.customer_name,
    items,
    totalAmount: paidAmount,
    reviewLink,
    orderId: order.id,
  };

  const templateStr = settings.payment_message || '';
  let logText = applyTemplate(templateStr, ctx);
  if (!logText.trim()) {
    logText = `[WhatsApp auto · payment KES ${formatAmountNumber(paidAmount)}]`;
  }

  const buildTemplateSend = () => {
    if (!names.payment) return null;
    return {
      name: names.payment,
      params: [truncParam(order.customer_name), truncParam(formatAmountNumber(paidAmount))],
    };
  };

  const result = await deliverMessage(order.customer_phone, logText, buildTemplateSend);

  logWhatsAppRow(order, order.customer_id, logText, userId, result);

  if (!result.ok && !result.skipped) {
    console.error('[orderWhatsAppNotifications] payment', orderId, result.error);
  }
}

module.exports = {
  sendAutoStatusWhatsApp,
  sendAutoPaymentWhatsApp,
  loadOrderBundle,
  buildReviewLink,
};
