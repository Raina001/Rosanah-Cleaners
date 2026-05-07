import { useState, useEffect } from 'react';
import { api, formatDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ACTION_LABELS = {
  ORDER_CREATED: 'Order Created',
  STATUS_CHANGED: 'Status Changed',
  PAYMENT_RECORDED: 'Payment',
  USER_CREATED: 'User Created',
};

export default function ActivityLog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLoading(false);
      navigate('/');
      return;
    }
    api.get('/activity').then(setLogs).finally(() => setLoading(false));
  }, [user, navigate]);

  if (loading) return <div className="spinner" />;

  return (
    <div className="page-content">
      <div className="section-title">Staff Activity Log</div>
      {logs.length === 0 ? (
        <div className="empty-state"><p>No activity recorded yet</p></div>
      ) : logs.map(log => (
        <div key={log.id} className="card" style={{ marginBottom: 8, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--pink)' }}>
                {ACTION_LABELS[log.action] || log.action}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-600)', marginTop: 2 }}>
                {log.details}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}>
                {log.user_name} ({log.user_role}) · {formatDateTime(log.created_at)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
