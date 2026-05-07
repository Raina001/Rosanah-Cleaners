import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const CheckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>);
const ChatIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.3L3 21l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>);

export default function BulkMessage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [message, setMessage] = useState('Hi {name}, this is a message from Rosanah Cleaners.');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/customers').then(setCustomers).finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.size === customers.length ? new Set() : new Set(customers.map(c => c.id)));
  };

  const formatPhone = (phone) => {
    const d = phone.replace(/\D/g, '');
    return d.startsWith('0') ? '254' + d.slice(1) : d;
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return alert('Select at least one customer');
    if (!message.trim()) return alert('Enter a message');
    setSending(true);
    try {
      await api.post('/messages/bulk', { customer_ids: Array.from(selectedIds), message });
      const selected = customers.filter(c => selectedIds.has(c.id));
      selected.forEach((c, i) => {
        const text = message.replace('{name}', c.name);
        setTimeout(() => window.open(`https://wa.me/${formatPhone(c.phone)}?text=${encodeURIComponent(text)}`, '_blank'), i * 300);
      });
      setSelectedIds(new Set());
      alert('Done! WhatsApp opened for each customer.');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="page-content">
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'Nunito', fontWeight: 800, marginBottom: 12 }}>Compose Message</div>
        <div className="form-group">
          <label className="form-label">Message</label>
          <textarea className="form-control" rows={4} value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Hi {name}, your items are ready!" />
          <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 6 }}>
            Use {'{name}'} to personalise each message
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSend}
          disabled={sending || selectedIds.size === 0 || !message.trim()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ChatIcon />
          {sending ? 'Sending...' : `Send via WhatsApp (${selectedIds.size} selected)`}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'Nunito', fontWeight: 800 }}>
            Customers ({selectedIds.size}/{customers.length} selected)
          </div>
          <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
            {selectedIds.size === customers.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {customers.length === 0 ? (
          <div className="empty-state"><p>No customers found</p></div>
        ) : (
          customers.map(c => (
            <div key={c.id} onClick={() => toggle(c.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
              borderBottom: '1px solid var(--gray-100)', cursor: 'pointer'
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${selectedIds.has(c.id) ? 'var(--pink)' : 'var(--gray-300)'}`,
                background: selectedIds.has(c.id) ? 'var(--pink)' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}>
                {selectedIds.has(c.id) && <CheckIcon />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{c.phone}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
