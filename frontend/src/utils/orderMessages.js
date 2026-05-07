export function formatAmountNumber(amount) {
  return Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });
}

export function itemsPhrase(items) {
  if (!items || !items.length) return 'your items';
  const names = items.map(i => (i.service_name || '').trim()).filter(Boolean);
  if (!names.length) return 'your items';
  const lower = names.map(n => n.charAt(0).toLowerCase() + n.slice(1));
  if (lower.length === 1) return `your ${lower[0]}`;
  if (lower.length === 2) return `your ${lower[0]} and ${lower[1]}`;
  return `your ${lower.slice(0, -1).join(', ')}, and ${lower[lower.length - 1]}`;
}

export function itemBreakdownLines(items) {
  if (!items || !items.length) return '(No line items)';
  return items
    .map(i => {
      const name = i.service_name || 'Item';
      const total = Number(i.total_price);
      const isTbc = !Number.isFinite(total) || total <= 0;
      const amt = isTbc ? 'TBC at shop' : `KES ${formatAmountNumber(total)}`;
      const qty = i.quantity != null ? `${i.quantity}${i.unit ? ' ' + i.unit : ''}` : '';
      const line = qty ? `${name} (${qty}): ${amt}` : `${name}: ${amt}`;
      return i.description ? `${line} — ${i.description}` : line;
    })
    .join('\n');
}

export function applyOrderMessageTemplate(template, ctx) {
  if (!template) return '';
  const { customerName, items, totalAmount, reviewLink, orderId } = ctx;
  const phrase = itemsPhrase(items);
  const breakdown = itemBreakdownLines(items);
  const amountNum = formatAmountNumber(totalAmount);
  const amountFull = `KES ${amountNum}`;
  return template
    .replace(/\{name\}/g, customerName || 'Customer')
    .replace(/\{items_phrase\}/g, phrase)
    .replace(/\{item_breakdown\}/g, breakdown)
    .replace(/\{amount\}/g, amountNum)
    .replace(/\{amount_full\}/g, amountFull)
    .replace(/\{review_link\}/g, reviewLink || '')
    .replace(/\{order_id\}/g, orderId != null ? String(orderId) : '');
}
