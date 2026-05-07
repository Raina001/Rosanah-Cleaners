const BASE = import.meta.env.VITE_API_URL
  ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/api`
  : '/api';

/** Base URL for API calls (includes `/api`). Use on public pages without auth (e.g. review form). */
export function getPublicApiBase() {
  return BASE;
}

function getToken() {
  return localStorage.getItem('rosanah_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, { ...options, headers });
  } catch {
    throw new Error('Cannot reach the server. Check internet connection and try again.');
  }
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && path !== '/auth/login') {
    localStorage.removeItem('rosanah_token');
    localStorage.removeItem('rosanah_user');
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  download: async (path) => {
    const token = getToken();
    const res = await fetch(BASE + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop().split('?')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
};

export function formatAmountNumber(amount) {
  return Number(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 });
}

export function formatCurrency(amount) {
  return `KES ${formatAmountNumber(amount)}`;
}

export function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const STATUS_LABELS = {
  pending_pickup: 'Pending Pickup',
  picked: 'Picked',
  cleaning: 'Cleaning',
  ready: 'Ready',
  paid: 'Paid',
  delivered: 'Delivered',
};

export const STATUS_COLORS = {
  pending_pickup: '#f59e0b',
  picked: '#3b82f6',
  cleaning: '#8b5cf6',
  ready: '#10b981',
  paid: '#059669',
  delivered: '#6b7280',
};

export function getWhatsAppUrl(phone, message) {
  const clean = phone.replace(/\D/g, '');
  const num = clean.startsWith('0') ? '254' + clean.slice(1) : clean.startsWith('254') ? clean : '254' + clean;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
