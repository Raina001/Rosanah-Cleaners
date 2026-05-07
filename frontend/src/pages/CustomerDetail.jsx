import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const BackIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/customers/${id}`).then(setCustomer).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="spinner" />;
  if (!customer) return <div className="empty-state"><p>Customer not found</p></div>;

  const totalSpent = customer.orders?.filter(o => o.status === 'paid' || o.status === 'delivered')
    .reduce((s, o) => s + o.total_amount, 0) || 0;

  return (
    <div>
      <div className="page-header">
        <button className="btn-icon" onClick={() => navigate(-1)}><BackIcon /></button>
        <h2>{customer.name}</h2>
      </div>
      <div className="page-content">
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, marginBottom: 2 }}>PHONE</div>
              <div style={{ fontWeight: 700 }}>{customer.phone}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, marginBottom: 2 }}>LOCATION</div>
              <div style={{ fontWeight: 700 }}>{customer.location || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, marginBottom: 2 }}>TOTAL ORDERS</div>
              <div style={{ fontWeight: 800, fontFamily: 'Nunito', color: 'var(--pink)', fontSize: '1.2rem' }}>{customer.orders?.length || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, marginBottom: 2 }}>TOTAL SPENT</div>
              <div style={{ fontWeight: 800, fontFamily: 'Nunito', color: 'var(--pink)', fontSize: '1.2rem' }}>{formatCurrency(totalSpent)}</div>
            </div>
          </div>
          {customer.orders?.length > 1 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'linear-gradient(135deg, var(--pink), var(--purple))',
              color: 'white', padding: '4px 12px', borderRadius: 99,
              fontSize: '0.75rem', fontWeight: 700, marginTop: 8,
            }}>
              Returning Customer · {customer.orders.length} orders
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={`tel:${customer.phone}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Call
            </a>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
              onClick={() => navigate('/new-order', { state: { customer } })}>
              + New Order
            </button>
          </div>
        </div>

        <div className="section-title">Order History</div>
        {customer.orders?.length === 0 ? (
          <div className="empty-state"><p>No orders yet</p></div>
        ) : (
          customer.orders?.map(order => (
            <div key={order.id} className="order-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${order.id}`)}>
              <div className="order-header">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Order #{order.id}</div>
                  <div className="order-meta">{formatDate(order.created_at)} · {order.item_count} items</div>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="order-footer">
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}></span>
                <span className="amount">{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
