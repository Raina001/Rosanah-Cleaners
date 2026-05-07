import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function WhatsappInbox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !['admin', 'reception'].includes(user.role)) {
      navigate('/', { replace: true });
      return;
    }
    api
      .get('/messages/inbox?limit=80')
      .then(setRows)
      .catch(e => setError(e.message || 'Could not load inbox'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) return <div className="spinner" />;

  return (
    <div className="page-content">
      <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 16, lineHeight: 1.5 }}>
        Customer replies to your WhatsApp business number appear here after Meta delivers them to the webhook.
        Drivers do not have access to this screen.
      </p>
      {error && (
        <div style={{ background: '#fee2e2', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>
          {error}
        </div>
      )}
      {rows.length === 0 ? (
        <div className="empty-state">
          <p>No customer replies yet.</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: 8 }}>
            When a customer messages your business on WhatsApp, it will show up here.
          </p>
        </div>
      ) : (
        rows.map(r => (
          <div key={r.id} className="card" style={{ marginBottom: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontFamily: 'Nunito', fontSize: '0.95rem', color: 'var(--gray-800)' }}>
                  {r.customer_name || r.profile_name || 'Unknown contact'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>
                  +{String(r.from_wa_id).replace(/^\+/, '')}
                  {r.customer_id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/customers/${r.customer_id}`)}
                      style={{
                        marginLeft: 8, border: 'none', background: 'none', color: 'var(--pink)',
                        fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '0.78rem',
                      }}
                    >
                      View customer
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--gray-700)', marginTop: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {r.body || '(no text)'}
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                {formatDateTime(r.created_at)}
              </div>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', marginTop: 8, textTransform: 'uppercase' }}>
              {r.message_type}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
