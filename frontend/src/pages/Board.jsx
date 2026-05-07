import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const PhoneIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.14h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.13-1.13a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.03z"/></svg>;
const MapIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;

const TABS = [
  { key: 'pending_pickup', label: 'Pickup', roles: ['admin', 'driver', 'reception'] },
  { key: 'picked', label: 'Picked', roles: ['admin', 'reception'] },
  { key: 'cleaning', label: 'Cleaning', roles: ['admin', 'reception'] },
  { key: 'ready', label: 'Ready', roles: ['admin', 'reception'] },
];

const NEXT_STATUS = {
  pending_pickup: 'picked',
  picked: 'cleaning',
  cleaning: 'ready',
};

const ACTION_LABELS = {
  pending_pickup: 'Mark Picked',
  picked: 'Start Cleaning',
  cleaning: 'Mark Ready',
};

export default function Board() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('rosanah_user')) || {}; } catch(e) { return {}; } })();
  const [activeTab, setActiveTab] = useState(user.role === 'driver' ? 'pending_pickup' : 'pending_pickup');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(null);

  const visibleTabs = TABS.filter(t => t.roles.includes(user.role));

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/orders?status=${activeTab}`).then(setOrders).finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  async function advance(order, e) {
    e.stopPropagation();
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setAdvancing(order.id);
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next });
      if (next === 'ready') {
        const fullOrder = await api.get(`/orders/${order.id}`);
        if (fullOrder.payments && fullOrder.payments.length > 0) {
          await api.patch(`/orders/${order.id}/status`, { status: 'paid' });
        }
      }
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--white)', borderBottom: '2px solid var(--gray-100)', padding: '0 16px', overflowX: 'auto' }}>
        {visibleTabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '14px 16px', background: 'none', border: 'none', borderBottom: `3px solid ${activeTab === tab.key ? 'var(--pink)' : 'transparent'}`,
            color: activeTab === tab.key ? 'var(--pink)' : 'var(--gray-500)', fontWeight: 700, fontFamily: 'Nunito', fontSize: '0.9rem',
            cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -2
          }}>
            {tab.label}
            {orders.length > 0 && activeTab === tab.key && (
              <span style={{ marginLeft: 6, background: 'var(--pink)', color: 'white', borderRadius: 999, padding: '1px 7px', fontSize: '0.72rem' }}>
                {orders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="page-content" style={{ paddingTop: 16 }}>
        {loading ? <div className="spinner" /> : orders.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
            <p>No orders in this stage</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="order-card" onClick={() => navigate(`/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
              <div className="order-header">
                <div>
                  <div className="customer-name">{order.customer_name}</div>
                  <div className="order-meta">Order #{order.id} · {order.item_count} items</div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div style={{ display: 'flex', gap: 12, margin: '8px 0', fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                <a href={`tel:${order.customer_phone}`} onClick={e=>e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--gray-500)', textDecoration: 'none', fontSize: '0.82rem' }}><PhoneIcon />{order.customer_phone}</a>
                {order.customer_location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapIcon />{order.customer_location}</span>
                )}
              </div>

              {order.pickup_time && (
                <div style={{ fontSize: '0.8rem', color: 'var(--blue)', fontWeight: 700 }}>
                  Pickup: {formatDateTime(order.pickup_time)}
                </div>
              )}

              <div className="order-footer">
                {currentUser.role !== 'driver' && <span className="amount">{formatCurrency(order.total_amount)}</span>}
                {NEXT_STATUS[order.status] && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => advance(order, e)}
                    disabled={advancing === order.id}
                    style={{ padding: '8px 14px' }}
                  >
                    {advancing === order.id ? '...' : ACTION_LABELS[order.status]}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
