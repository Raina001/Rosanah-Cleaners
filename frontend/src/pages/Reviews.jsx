import { useState, useEffect } from 'react';
import { api, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Reviews() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      navigate('/');
      return;
    }
    api.get('/reviews').then(setData).finally(() => setLoading(false));
  }, [user, navigate]);

  function renderStars(rating) {
    return (
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <svg key={s} viewBox="0 0 24 24"
            fill={s <= rating ? '#eb1997' : 'none'}
            stroke={s <= rating ? '#eb1997' : '#d1d5db'}
            strokeWidth="1.5" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        ))}
      </div>
    );
  }

  if (loading) return <div className="spinner" />;

  return (
    <div className="page-content">
      {data && (
        <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Nunito', fontWeight: 900,
            fontSize: '3rem', color: '#eb1997', lineHeight: 1,
          }}
          >
            {data.average_rating || '—'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
            {data.average_rating && renderStars(Math.round(Number(data.average_rating)))}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 600 }}>
            {data.total} review{data.total !== 1 ? 's' : ''} total
          </div>
          {data.total > 0 && (
            <div style={{ marginTop: 16 }}>
              {[5, 4, 3, 2, 1].map(star => {
                const count = data.reviews.filter(r => r.rating === star).length;
                const pct = data.total > 0 ? (count / data.total) * 100 : 0;
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, width: 16, color: '#6b7280' }}>{star}</div>
                    <svg viewBox="0 0 24 24" fill="#eb1997" width="14" height="14">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        background: 'linear-gradient(90deg, #eb1997, #8b2294)',
                        width: `${pct}%`, transition: 'width 0.5s',
                      }}
                      />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', width: 20 }}>{count}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="section-title">Customer Reviews</div>
      {!data?.reviews?.length ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.499z" />
          </svg>
          <p>No reviews yet</p>
          <p style={{ fontSize: '0.82rem', marginTop: 4 }}>
            Reviews appear after customers tap the link in their delivery WhatsApp message
          </p>
        </div>
      ) : (
        data.reviews.map(reviewRow => (
          <div key={reviewRow.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '0.95rem' }}>
                  {reviewRow.customer_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                  Order #{reviewRow.order_number} · {formatDateTime(reviewRow.created_at)}
                </div>
              </div>
              {renderStars(reviewRow.rating)}
            </div>
            {reviewRow.comment && (
              <div style={{
                background: '#fdf2f8', borderRadius: 10,
                padding: '10px 14px', fontSize: '0.88rem',
                color: '#374151', lineHeight: 1.5,
                borderLeft: '3px solid #eb1997',
              }}
              >
                &ldquo;{reviewRow.comment}&rdquo;
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
