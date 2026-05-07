/**
 * Meta WhatsApp Cloud API — optional. Set WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID to enable auto-send.
 *
 * Plain text (`sendWhatsAppText`) works in sandbox / 24h sessions. Production business-initiated updates
 * should use approved templates: set WHATSAPP_USE_APPROVED_TEMPLATES=1 and match template names to Meta
 * (see orderWhatsAppNotifications.js). WHATSAPP_TEMPLATE_LANGUAGE must match the template (e.g. en, en_US).
 *
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WA_BODY_PARAM_MAX = 1024;

function normalizeWaTo(phone) {
  if (!phone) return null;
  const d = String(phone).replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) return '254' + d.slice(1);
  if (d.startsWith('254')) return d;
  return '254' + d;
}

async function sendWhatsAppText(toPhone, body) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, skipped: true, reason: 'whatsapp_not_configured' };
  }
  const to = normalizeWaTo(toPhone);
  if (!to) return { ok: false, error: 'invalid_phone' };

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: body.slice(0, 4096) },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[WhatsApp Cloud] send failed', res.status, data);
    return { ok: false, error: data.error?.message || `HTTP ${res.status}`, raw: data };
  }
  const id = data.messages?.[0]?.id || null;
  return { ok: true, messageId: id };
}

/**
 * Send an approved message template (Utility / Marketing per Meta). Body variables only; order must match template.
 * @param {string[]} bodyParameterTexts - values for {{1}}, {{2}}, … in the template body
 */
async function sendWhatsAppTemplate(toPhone, templateName, languageCode, bodyParameterTexts) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, skipped: true, reason: 'whatsapp_not_configured' };
  }
  const to = normalizeWaTo(toPhone);
  if (!to) return { ok: false, error: 'invalid_phone' };
  if (!templateName || !String(templateName).trim()) {
    return { ok: false, error: 'missing_template_name' };
  }

  const parameters = (bodyParameterTexts || []).map(text => ({
    type: 'text',
    text: String(text == null ? '' : text).slice(0, WA_BODY_PARAM_MAX),
  }));

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: String(templateName).trim(),
        language: { code: (languageCode || 'en').trim() },
        components:
          parameters.length > 0
            ? [{ type: 'body', parameters }]
            : [],
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[WhatsApp Cloud] template send failed', res.status, data);
    return { ok: false, error: data.error?.message || `HTTP ${res.status}`, raw: data };
  }
  const id = data.messages?.[0]?.id || null;
  return { ok: true, messageId: id };
}

function isConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

module.exports = { sendWhatsAppText, sendWhatsAppTemplate, normalizeWaTo, isConfigured };
