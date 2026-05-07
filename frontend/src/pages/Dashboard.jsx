import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [now, setNow] = useState(new Date());

  const userStr = localStorage.getItem('rosanah_user');
  const currentUser = userStr ? JSON.parse(userStr) : {};

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard'),
      api.get('/orders?')
    ]).then(([s, orders]) => {
      setStats(s);
      setRecentOrders(orders.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      const trimmed = searchQuery.trim();
      const isOrderId = /^#?\d+$/.test(trimmed);
      if (isOrderId) {
        const orderId = trimmed.replace(/^#/, '');
        api.get(`/orders/${orderId}`)
          .then(order => {
            if (order?.id) navigate(`/orders/${order.id}`);
          })
          .catch(() => {})
          .finally(() => setSearching(false));
      } else {
        api.get(`/customers?q=${encodeURIComponent(searchQuery)}`)
          .then(customers => {
            setSearchResults(customers.slice(0, 5));
            setSearching(false);
          })
          .catch(() => setSearching(false));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, navigate]);

  if (loading) return <div className="spinner" />;

  const statCards = stats ? [
    { label: 'Today Revenue', value: formatCurrency(stats.revenue_today), className: 'stat-card pink' },
    { label: 'Orders Today', value: stats.orders_today, className: 'stat-card', valueStyle: { color: 'var(--pink)' }, labelStyle: { color: 'var(--gray-500)' } },
    { label: 'Pending Pickup', value: stats.pending_pickup, className: 'stat-card', valueStyle: { color: 'var(--yellow)' }, labelStyle: { color: 'var(--gray-500)' } },
    { label: 'Cleaning', value: stats.orders_in_cleaning, className: 'stat-card', valueStyle: { color: 'var(--purple)' }, labelStyle: { color: 'var(--gray-500)' } },
    { label: 'Ready', value: stats.orders_ready, className: 'stat-card', valueStyle: { color: 'var(--green)' }, labelStyle: { color: 'var(--gray-500)' } },
    { label: 'For Delivery', value: stats.pending_deliveries, className: 'stat-card', valueStyle: { color: 'var(--blue)' }, labelStyle: { color: 'var(--gray-500)' } },
  ] : [];

  return (
    <div className="page-content">
      <div className="search-bar" style={{ marginBottom: 16 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          placeholder="Search customer or order #..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {searching && (searchQuery.trim().length >= 1 && /^#?\d+$/.test(searchQuery.trim()) || searchQuery.length >= 2) && (
        <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: 8 }}>Searching…</div>
      )}

      {searchResults.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          {searchResults.map(c => (
            <div
              key={c.id}
              onClick={() => navigate(`/customers/${c.id}`)}
              style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{c.phone}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: 'var(--gray-500)', fontSize: '0.85rem', fontWeight: 600 }}>
          {now.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          {now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <h2 style={{ fontSize: '1.3rem', fontFamily: 'Nunito', fontWeight: 900, marginTop: 2 }}>
          {getGreeting()}, {user.name.split(' ')[0]}
        </h2>
      </div>

      {stats && (
        <div className="stats-grid">
          {statCards.map((card, idx) => {
            if (card.label === 'Today Revenue' && currentUser.role !== 'admin') return null;
            return (
              <div key={idx} className={card.className}>
                <div className="stat-value" style={card.valueStyle}>{card.value}</div>
                <div className="stat-label" style={card.labelStyle}>{card.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {(user.role === 'admin' || user.role === 'reception') && (
        <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => navigate('/new-order')}>
          + Create New Order
        </button>
      )}

      <div style={{ marginBottom: 16 }}>
        <div className="section-title">Today&apos;s Pipeline</div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
          {[
            { status: 'pending_pickup', label: 'Pending Pickup', color: 'var(--yellow)', count: stats?.pending_pickup },
            { status: 'picked', label: 'Picked', color: 'var(--blue)', count: stats?.picked || 0 },
            { status: 'cleaning', label: 'Cleaning', color: 'var(--purple)', count: stats?.orders_in_cleaning },
            { status: 'ready', label: 'Ready', color: 'var(--green)', count: stats?.orders_ready },
            { status: 'paid', label: 'For Delivery', color: '#10b981', count: stats?.pending_deliveries },
          ].map(stage => (
            <div
              key={stage.status}
              onClick={() => navigate('/board')}
              style={{
                minWidth: 100, background: 'var(--white)', borderRadius: 12, padding: '12px 14px',
                boxShadow: 'var(--shadow)', cursor: 'pointer', borderTop: `3px solid ${stage.color}`,
                textAlign: 'center', flexShrink: 0,
              }}
            >
              <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'Nunito', color: stage.color }}>
                {stage.count || 0}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-500)', marginTop: 2 }}>
                {stage.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">Recent Orders</div>
      {recentOrders.length === 0 ? (
        <div className="empty-state">
          <p>No orders yet today</p>
        </div>
      ) : (
        recentOrders.map(order => (
          <div key={order.id} className="order-card" onClick={() => navigate(`/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
            <div className="order-header">
              <div>
                <div className="customer-name">{order.customer_name}</div>
                <div className="order-meta">#{order.id} · {order.customer_phone}</div>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div className="order-footer">
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{formatDateTime(order.created_at)}</span>
              <span className="amount">{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
