import { useState, useEffect } from 'react';
import { api, formatCurrency, formatDate } from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const today = new Date().toISOString().slice(0, 10);

export default function Reports() {
  const userStr = localStorage.getItem('rosanah_user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);


  const downloadExcel = async () => {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
    let rows = [], filename = '';
    if (tab === 'daily' && data?.orders) {
      filename = `rosanah_orders_${date}.xlsx`;
      rows = data.orders.map(o => ({
        'Order ID': o.id, 'Customer': o.customer_name, 'Phone': o.customer_phone,
        'Location': o.location || '', 'Items': o.items_summary || '',
        'Status': o.status, 'Total (KES)': o.total_amount, 'Paid (KES)': o.paid_amount, 'Date': o.created_at
      }));
    } else if (tab === 'payments' && data?.payments) {
      filename = `rosanah_payments_${date}.xlsx`;
      rows = data.payments.map(p => ({
        'Payment ID': p.id, 'Customer': p.customer_name, 'Phone': p.customer_phone,
        'Amount (KES)': p.amount, 'Method': p.method, 'Reference': p.reference || '',
        'Recorded By': p.recorded_by_name || '', 'Date': p.created_at
      }));
    }
    if (!rows.length) return alert('No data to export');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, ...rows.map(r => String(r[k]||'').length)) + 2 }));
    XLSX.writeFile(wb, filename);
  };

  function load() {
    setLoading(true);
    const endpoint = tab === 'daily' ? `/reports/daily?date=${date}` : `/reports/payments?date=${date}`;
    api.get(endpoint).then(setData).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (currentUser.role !== 'admin') return;
    load();
  }, [tab, date, currentUser.role]);

  function downloadCSV() {
    const path = tab === 'daily'
      ? `/reports/export/daily?date=${date}`
      : `/reports/export/payments?date=${date}`;
    api.download(path);
  }

  if (currentUser.role !== 'admin') {
    return (
      <div className="empty-state">
        <p>Access restricted to administrators only</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', background: 'var(--white)', borderBottom: '2px solid var(--gray-100)' }}>
        <div className="tabs" style={{ marginBottom: 12 }}>
          <button className={`tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>Daily Orders</button>
          <button className={`tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>Payments</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="form-control" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ flex: 1 }} />
          <div style={{display:'flex',gap:8}}><button className="btn btn-secondary btn-sm" onClick={downloadCSV}>CSV</button><button className="btn btn-secondary btn-sm" style={{background:'var(--green)',color:'white'}} onClick={downloadExcel}>Excel</button></div>
        </div>
      </div>

      <div className="page-content">
        {loading ? <div className="spinner" /> : !data ? null : tab === 'daily' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: 'Nunito', fontWeight: 800 }}>{data.orders?.length} orders</span>
              <span style={{ fontFamily: 'Nunito', fontWeight: 800, color: 'var(--pink)' }}>
                {formatCurrency(data.orders?.reduce((s, o) => s + o.paid_amount, 0))}
              </span>
            </div>
            {data.orders?.length === 0 ? (
              <div className="empty-state"><p>No orders for this date</p></div>
            ) : data.orders?.map(o => (
              <div key={o.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{o.customer_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{o.customer_phone}</div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                {o.items_summary && <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginBottom: 6 }}>{o.items_summary}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--gray-400)' }}>Total: <strong>{formatCurrency(o.total_amount)}</strong></span>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>Paid: {formatCurrency(o.paid_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: 'Nunito', fontWeight: 800 }}>{data.payments?.length} payments</span>
              <span style={{ fontFamily: 'Nunito', fontWeight: 800, color: 'var(--pink)' }}>{formatCurrency(data.total)}</span>
            </div>
            {data.payments?.length === 0 ? (
              <div className="empty-state"><p>No payments for this date</p></div>
            ) : data.payments?.map(p => (
              <div key={p.id} className="card" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{p.customer_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                      Order #{p.order_id} · <span style={{ textTransform: 'capitalize' }}>{p.method}</span>
                      {p.reference && ` · ${p.reference}`}
                    </div>
                    {p.recorded_by_name && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>by {p.recorded_by_name}</div>}
                  </div>
                  <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.1rem', color: 'var(--green)' }}>
                    {formatCurrency(p.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
