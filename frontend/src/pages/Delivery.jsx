import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatDateTime } from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const PhoneIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.14h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.13-1.13a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/></svg>;
const MapIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;

export default function Delivery() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delivering, setDelivering] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/orders?status=paid').then(setOrders).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markDelivered(order, e) {
    e.stopPropagation();
    setDelivering(order.id);
    try {
      await api.patch(`/orders/${order.id}/status`, { status: 'delivered' });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setDelivering(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 16px', background: 'var(--white)', borderBottom: '2px solid var(--gray-100)' }}>
        <h3 style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.05rem' }}>
          Delivery List
          {orders.length > 0 && (
            <span style={{ marginLeft: 8, background: 'var(--blue)', color: 'white', borderRadius: 999, padding: '2px 9px', fontSize: '0.78rem' }}>
              {orders.length}
            </span>
          )}
        </h3>
      </div>

      <div className="page-content">
        {loading ? <div className="spinner" /> : orders.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            <p>No deliveries pending</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="order-card" style={{ borderLeftColor: 'var(--blue)', cursor: 'pointer' }}
              onClick={() => navigate(`/orders/${order.id}`)}>
              <div className="order-header">
                <div>
                  <div className="customer-name">{order.customer_name}</div>
                  <div className="order-meta">Order #{order.id} · {order.item_count} items</div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div style={{ display: 'flex', gap: 12, margin: '8px 0', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><PhoneIcon />{order.customer_phone}</span>
                {order.customer_location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapIcon />{order.customer_location}</span>
                )}
              </div>

              <div className="order-footer">
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 700 }}>✓ PAID</div>
                  <div className="amount">{formatCurrency(order.total_amount)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`tel:${order.customer_phone}`}
                    onClick={e => e.stopPropagation()}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    <PhoneIcon /> Call
                  </a>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => markDelivered(order, e)}
                    disabled={delivering === order.id}
                  >
                    {delivering === order.id ? '...' : '✓ Delivered'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
