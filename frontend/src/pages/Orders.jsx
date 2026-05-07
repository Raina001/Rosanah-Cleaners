import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatDateTime } from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'pending_pickup', label: 'Pending' },
  { value: 'picked', label: 'Picked' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'ready', label: 'Ready' },
  { value: 'paid', label: 'Paid' },
  { value: 'delivered', label: 'Delivered' },
];

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/orders${status ? `?status=${status}` : ''}`).then(setOrders).finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', background: 'var(--white)', borderBottom: '2px solid var(--gray-100)' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => setStatus(s.value)} style={{
              padding: '7px 13px', borderRadius: 999, whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 700,
              background: status === s.value ? 'var(--pink)' : 'var(--gray-100)',
              color: status === s.value ? 'white' : 'var(--gray-600)',
              border: 'none', cursor: 'pointer'
            }}>{s.label}</button>
          ))}
        </div>
      </div>
      <div className="page-content">
        {loading ? <div className="spinner" /> : orders.length === 0 ? (
          <div className="empty-state"><p>No orders found</p></div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="order-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${order.id}`)}>
              <div className="order-header">
                <div>
                  <div className="customer-name">{order.customer_name}</div>
                  <div className="order-meta">#{order.id} · {order.customer_phone}</div>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="order-footer">
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{formatDateTime(order.created_at)}</span>
                <span className="amount">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
