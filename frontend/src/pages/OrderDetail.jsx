import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatDateTime, getWhatsAppUrl, STATUS_LABELS } from '../utils/api';
import { applyOrderMessageTemplate } from '../utils/orderMessages';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';

const BackIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const PencilIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>);
const TrashIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 2.74a1.125 1.125 0 00-1.06-.726H7.9a1.125 1.125 0 00-1.06.726L5.882 5.955m12.218-1.567H5.882" /></svg>);
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="16" height="16"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>);

const STATUS_PIPELINE = ['pending_pickup','picked','cleaning','ready','paid','delivered'];
const NEXT_STATUS = { pending_pickup:'picked', picked:'cleaning', cleaning:'ready', ready:null, paid:'delivered' };
const ACTION_LABELS = { pending_pickup:'Mark as Picked', picked:'Start Cleaning', cleaning:'Mark Ready', paid:'Mark Delivered' };
const CAN_ADVANCE = { pending_pickup:['admin','driver'], picked:['admin','reception'], cleaning:['admin','reception'], paid:['admin','driver'] };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUser = user || {};
  const [order, setOrder] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState({ amount: '', method: 'cash', reference: '' });
  const [advancing, setAdvancing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [editingItems, setEditingItems] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [newItem, setNewItem] = useState({ service_name: '', unit_price: '', quantity: 1, unit: '', description: '' });
  const [review, setReview] = useState(null);

  const load = useCallback(() => {
    Promise.all([api.get(`/orders/${id}`), api.get('/settings')])
      .then(([o, s]) => {
        setOrder(o);
        setSettings(s);
        setEditedItems(o.items || []);
        setPayment(p => ({ ...p, amount: o.total_amount }));
        api.get(`/reviews/order/${id}`).then(r => setReview(r && r.id ? r : null)).catch(() => setReview(null));
      }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function advance() {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setAdvancing(true);
    try { await api.patch(`/orders/${id}/status`, { status: next }); load(); }
    catch (err) { setError(err.message); }
    finally { setAdvancing(false); }
  }

  async function recordPayment() {
    if (!payment.amount) { setError('Enter amount'); return; }
    setPaying(true);
    try { await api.post(`/orders/${id}/payment`, payment); setShowPayment(false); load(); }
    catch (err) { setError(err.message); }
    finally { setPaying(false); }
  }

  async function saveItems() {
    try {
      await api.put(`/orders/${id}`, { items: editedItems });
      setEditingItems(false);
      load();
    } catch (err) { setError(err.message); }
  }

  function addNewItem() {
    const price = parseFloat(newItem.unit_price);
    if (!newItem.service_name || Number.isNaN(price)) return;
    const qty = parseFloat(newItem.quantity) || 1;
    setEditedItems(prev => [...prev, {
      service_name: newItem.service_name,
      quantity: qty, unit: newItem.unit || '',
      unit_price: price, total_price: price * qty,
      description: newItem.description || '',
    }]);
    setNewItem({ service_name: '', unit_price: '', quantity: 1, unit: '', description: '' });
  }

  function escapeHtml(str) {
    if (str == null || str === '') return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function printReceipt() {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;
    const itemsHtml = (order.items || []).map(item =>
      `<tr>
        <td style="padding:6px;border-bottom:1px solid #eee">${escapeHtml(item.service_name)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:center">${escapeHtml(item.quantity)} ${escapeHtml(item.unit || '')}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">KES ${escapeHtml(item.unit_price)}</td>
        <td style="padding:6px;border-bottom:1px solid #eee;text-align:right">KES ${escapeHtml(item.total_price)}</td>
      </tr>`
    ).join('');

    const loc = order.customer_location ? `<p>Location: ${escapeHtml(order.customer_location)}</p>` : '';
    const dateStr = new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' });
    const statusLabel = escapeHtml(order.status.replace(/_/g, ' ').toUpperCase());
    const totalStr = Number(order.total_amount || 0).toLocaleString('en-KE');

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Order #${escapeHtml(order.id)}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 20px auto; color: #333; }
          h1 { color: #eb1997; font-size: 22px; margin: 0; }
          .header { text-align: center; border-bottom: 2px solid #eb1997; padding-bottom: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f9f9f9; padding: 8px 6px; text-align: left; font-size: 12px; color: #666; }
          .total { font-size: 18px; font-weight: bold; color: #eb1997; text-align: right; padding: 12px 0; border-top: 2px solid #eb1997; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
          .status { display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 99px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rosanah Cleaners</h1>
          <p style="margin:4px 0;font-size:13px;color:#666">Tel: 0713497495</p>
          <p style="margin:4px 0;font-size:13px;color:#666">Nairobi, Kenya</p>
        </div>
        <div style="margin-bottom:16px">
          <p><strong>Order #${escapeHtml(order.id)}</strong></p>
          <p>Customer: <strong>${escapeHtml(order.customer_name)}</strong></p>
          <p>Phone: ${escapeHtml(order.customer_phone)}</p>
          ${loc}
          <p>Date: ${escapeHtml(dateStr)}</p>
          <p>Status: <span class="status">${statusLabel}</span></p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="total">Total: KES ${totalStr}</div>
        <div class="footer">
          <p>Thank you for choosing Rosanah Cleaners!</p>
          <p>Please leave us a review.</p>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    receiptWindow.document.close();
  }

  function sendWhatsApp(msgKey) {
    const phone = order.customer_phone;
    const template = settings[msgKey] || '';
    const token = btoa(`${order.id}-${order.customer_id}-rosanah`);
    const reviewOrigin = (import.meta.env.VITE_PUBLIC_APP_URL || '').replace(/\/$/, '') || window.location.origin;
    const reviewLink = `${reviewOrigin}/review?order=${order.id}&customer=${order.customer_id}&token=${encodeURIComponent(token)}`;
    const message = applyOrderMessageTemplate(template, {
      customerName: order.customer_name,
      items: order.items || [],
      totalAmount: order.total_amount,
      reviewLink,
      orderId: order.id,
    });
    api.post('/messages/log', { order_id: order.id, customer_id: order.customer_id, type: 'whatsapp', message });
    window.open(getWhatsAppUrl(phone, message), '_blank');
  }

  const WHATSAPP_BUTTONS = [
    { key: 'pickup_message', label: 'Items Picked Up', forStatus: 'pending_pickup' },
    { key: 'cleaning_message', label: 'Cleaning + Invoice', forStatus: 'picked' },
    { key: 'ready_message', label: 'Items Ready', forStatus: 'cleaning' },
    { key: 'payment_message', label: 'Payment Confirmed', forStatus: 'ready' },
    { key: 'delivery_message', label: 'Delivered + Review', forStatus: 'paid' },
  ];

  const highlightKey = order ? {
    pending_pickup: 'pickup_message',
    picked: 'cleaning_message',
    cleaning: 'cleaning_message',
    ready: 'ready_message',
    paid: 'delivery_message',
    delivered: null,
  }[order.status] : null;

  if (loading) return <div className="spinner" />;
  if (!order) return <div className="empty-state"><p>Order not found</p></div>;

  const canAdvance = NEXT_STATUS[order.status] && CAN_ADVANCE[order.status]?.includes(currentUser.role);
  const PAYABLE_STATUSES = ['picked', 'cleaning', 'ready'];
  const canPay = PAYABLE_STATUSES.includes(order.status) &&
    ['admin', 'reception'].includes(currentUser.role) &&
    !order.payments?.length;
  const canEdit = order.status !== 'delivered' && ['admin','reception'].includes(currentUser.role);
  const totalPaid = order.payments?.reduce((s, p) => s + p.amount, 0) || 0;
  const statusIdx = STATUS_PIPELINE.indexOf(order.status);
  const isDriver = currentUser.role === 'driver';

  return (
    <div>
      <div className="page-header">
        <button className="btn-icon" onClick={() => navigate(-1)}><BackIcon /></button>
        <h2>Order #{order.id}</h2>
        <StatusBadge status={order.status} />
      </div>

      <div className="page-content">
        {error && <div style={{ background:'#fee2e2', color:'var(--red)', padding:'10px 14px', borderRadius:8, marginBottom:12, fontWeight:700 }}>{error}</div>}

        {/* Customer info */}
        <div className="card">
          <div style={{ fontFamily:'Nunito', fontWeight:800, fontSize:'1.1rem', marginBottom:4 }}>{order.customer_name}</div>
          <div style={{ display:'flex', gap:16, fontSize:'0.85rem', color:'var(--gray-500)' }}>
            <a href={`tel:${order.customer_phone}`} style={{ color:'var(--gray-500)', textDecoration:'none' }}>{order.customer_phone}</a>
            {order.customer_location && <span>{order.customer_location}</span>}
          </div>
          {order.notes && <div style={{ marginTop:8, fontSize:'0.85rem', color:'var(--gray-600)', fontStyle:'italic' }}>Note: {order.notes}</div>}
          {order.pickup_time && <div style={{ marginTop:6, fontSize:'0.82rem', color:'var(--blue)', fontWeight:700 }}>Pickup: {formatDateTime(order.pickup_time)}</div>}
          {!isDriver && (
            <button className="btn btn-secondary btn-sm" onClick={printReceipt}
              style={{ marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Print Receipt
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="card">
          <div style={{ fontFamily:'Nunito', fontWeight:800, marginBottom:12 }}>Progress</div>
          <div style={{ display:'flex' }}>
            {STATUS_PIPELINE.map((s, i) => (
              <div key={s} style={{ flex:1, textAlign:'center' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', margin:'0 auto', background: i<=statusIdx ? 'linear-gradient(135deg,var(--pink),var(--purple))' : 'var(--gray-200)', display:'flex', alignItems:'center', justifyContent:'center', color: i<=statusIdx ? 'white' : 'var(--gray-400)', fontSize:'0.75rem', fontWeight:800 }}>
                  {i < statusIdx ? '✓' : i === statusIdx ? '●' : '○'}
                </div>
                <div style={{ fontSize:'0.6rem', marginTop:4, color: i<=statusIdx ? 'var(--pink)' : 'var(--gray-400)', fontWeight:700 }}>
                  {STATUS_LABELS[s]?.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontFamily:'Nunito', fontWeight:800 }}>Items ({order.items?.length})</div>
            {canEdit && !editingItems && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingItems(true)} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <PencilIcon /> Edit
              </button>
            )}
          </div>

          {editingItems ? (
            <div>
              {editedItems.map((item, idx) => (
                <div key={idx} style={{ marginBottom: 10 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 36px', gap:6, alignItems:'center' }}>
                    <div style={{ fontSize:'0.85rem', fontWeight:600 }}>{item.service_name}</div>
                    <input className="form-control" type="number" value={item.quantity}
                      onChange={e => { const arr=[...editedItems]; arr[idx]={...arr[idx],quantity:parseFloat(e.target.value)||1,total_price:(parseFloat(e.target.value)||1)*arr[idx].unit_price}; setEditedItems(arr); }}
                      style={{ padding:'6px 8px', fontSize:'0.85rem' }} />
                    <input className="form-control" type="number" value={item.unit_price}
                      onChange={e => { const arr=[...editedItems]; arr[idx]={...arr[idx],unit_price:parseFloat(e.target.value)||0,total_price:arr[idx].quantity*(parseFloat(e.target.value)||0)}; setEditedItems(arr); }}
                      style={{ padding:'6px 8px', fontSize:'0.85rem' }} />
                    <button type="button" onClick={() => setEditedItems(editedItems.filter((_,i)=>i!==idx))}
                      style={{ background:'#fee2e2', border:'none', borderRadius:6, padding:'6px', cursor:'pointer', color:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <TrashIcon />
                    </button>
                  </div>
                  <input className="form-control" placeholder="Note (e.g. stain, missing button)"
                    value={item.description || ''}
                    onChange={e => { const arr=[...editedItems]; arr[idx]={...arr[idx],description:e.target.value}; setEditedItems(arr); }}
                    style={{ padding:'6px 8px', fontSize:'0.82rem', marginTop:6 }} />
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 36px', gap:6, alignItems:'center' }}>
                  <input className="form-control" placeholder="Service name" value={newItem.service_name}
                    onChange={e => setNewItem(n=>({...n,service_name:e.target.value}))} style={{ padding:'6px 8px', fontSize:'0.85rem' }} />
                  <input className="form-control" type="number" placeholder="Qty" value={newItem.quantity}
                    onChange={e => setNewItem(n=>({...n,quantity:e.target.value}))} style={{ padding:'6px 8px', fontSize:'0.85rem' }} />
                  <input className="form-control" type="number" placeholder="Price" value={newItem.unit_price}
                    onChange={e => setNewItem(n=>({...n,unit_price:e.target.value}))} style={{ padding:'6px 8px', fontSize:'0.85rem' }} />
                  <button type="button" onClick={addNewItem} style={{ background:'var(--green)', border:'none', borderRadius:6, padding:'6px', cursor:'pointer', color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <PlusIcon />
                  </button>
                </div>
                <input className="form-control" placeholder="Note (e.g. stain, missing button)"
                  value={newItem.description || ''}
                  onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))}
                  style={{ padding:'6px 8px', fontSize:'0.82rem', marginTop:6 }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <button className="btn btn-secondary" onClick={() => { setEditingItems(false); setEditedItems(order.items||[]); }}>Cancel</button>
                <button className="btn btn-primary" onClick={saveItems}>Save Changes</button>
              </div>
            </div>
          ) : (
            order.items?.map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i<order.items.length-1?'1px solid var(--gray-100)':'none' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{item.service_name}</div>
                  <div style={{ fontSize:'0.8rem', color:'var(--gray-500)' }}>{item.quantity} {item.unit} × {!isDriver && `KES ${item.unit_price}`}</div>
                  {item.description && (
                    <div style={{ fontSize:'0.75rem', color:'var(--gray-400)', fontStyle:'italic' }}>
                      Note: {item.description}
                    </div>
                  )}
                </div>
                {!isDriver && <div style={{ fontWeight:800, color:'var(--pink)', fontFamily:'Nunito' }}>{formatCurrency(item.total_price)}</div>}
              </div>
            ))
          )}
          {!isDriver && (
            <div className="total-line">
              <span className="label">Total</span>
              <span className="amount">{formatCurrency(order.total_amount)}</span>
            </div>
          )}
        </div>

        {/* Payment - hidden from drivers */}
        {!isDriver && (
          <div className="card">
            <div className="card-header">
              <h3>Payment</h3>
              {order.status !== 'ready' && order.status !== 'paid' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>
                  Early payment accepted
                </span>
              )}
              <span style={{ fontFamily:'Nunito', fontWeight:800, color: totalPaid>=order.total_amount ? 'var(--green)' : 'var(--red)' }}>
                {totalPaid >= order.total_amount ? '✓ PAID' : 'UNPAID'}
              </span>
            </div>
            {order.payments?.map((p, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.85rem', padding:'6px 0', borderBottom:'1px solid var(--gray-100)' }}>
                <div>
                  <span style={{ fontWeight:700, textTransform:'capitalize' }}>{p.method}</span>
                  {p.reference && <span style={{ color:'var(--gray-500)' }}> · {p.reference}</span>}
                  <div style={{ fontSize:'0.75rem', color:'var(--gray-400)' }}>{formatDateTime(p.created_at)}</div>
                </div>
                <span style={{ fontWeight:800, fontFamily:'Nunito' }}>{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {canPay && !showPayment && (
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setShowPayment(true)}>+ Record Payment</button>
            )}
            {order.payments?.length > 0 && order.status !== 'paid' && (
              <div style={{
                background: '#d1fae5', color: '#065f46',
                padding: '10px 14px', borderRadius: 8,
                fontWeight: 700, fontSize: '0.875rem',
                marginTop: 8, display: 'flex', alignItems: 'center', gap: 8
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth="1.5" stroke="currentColor" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Payment of {formatCurrency(order.payments.reduce((s, p) => s + p.amount, 0))}
                {' '}recorded - order will move to Paid when Ready
              </div>
            )}
            {showPayment && (
              <div style={{ marginTop:12, padding:14, background:'var(--gray-50)', borderRadius:8 }}>
                <div className="form-group" style={{ marginBottom:8 }}>
                  <label>Amount (KES)</label>
                  <input className="form-control" type="number" value={payment.amount} onChange={e=>setPayment(p=>({...p,amount:e.target.value}))} />
                </div>
                <div className="form-group" style={{ marginBottom:8 }}>
                  <label>Method</label>
                  <select className="form-control" value={payment.method} onChange={e=>setPayment(p=>({...p,method:e.target.value}))}>
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {payment.method==='mpesa' && (
                  <div className="form-group" style={{ marginBottom:8 }}>
                    <label>M-Pesa Reference</label>
                    <input className="form-control" placeholder="e.g. QA12345XYZ" value={payment.reference} onChange={e=>setPayment(p=>({...p,reference:e.target.value}))} />
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <button className="btn btn-secondary" onClick={() => setShowPayment(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={recordPayment} disabled={paying}>{paying ? '...' : 'Confirm Payment'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advance status */}
        {canAdvance && (
          <button className="btn btn-primary" onClick={advance} disabled={advancing} style={{ marginBottom:12 }}>
            {advancing ? 'Updating...' : `→ ${ACTION_LABELS[order.status]}`}
          </button>
        )}

        {/* WhatsApp messages */}
        <div className="card" style={{ marginBottom: 12 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: '#25d366',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.121 1.532 5.852L0 24l6.317-1.506A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.369l-.358-.214-3.75.894.952-3.653-.234-.376A9.818 9.818 0 1112 21.818z" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1rem' }}>
                WhatsApp Updates
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                Pickup and cleaning messages also send automatically when status changes (if WhatsApp API is configured). Tap below to open WhatsApp manually anytime.
              </div>
            </div>
          </div>

          {/* Message buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {WHATSAPP_BUTTONS.map(btn => {
              const isHighlighted = btn.key === highlightKey;
              return (
                <button key={btn.key} type="button" onClick={() => sendWhatsApp(btn.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
                  border: isHighlighted ? 'none' : '1.5px solid #e5e7eb',
                  background: isHighlighted
                    ? 'linear-gradient(135deg, #25d366, #128c50)'
                    : 'var(--white)',
                  transition: 'all 0.15s',
                  boxShadow: isHighlighted ? '0 4px 14px rgba(37,211,102,0.35)' : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isHighlighted ? 'rgba(255,255,255,0.2)' : '#f0fdf4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg viewBox="0 0 24 24" fill={isHighlighted ? 'white' : '#25d366'} width="18" height="18">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.121 1.532 5.852L0 24l6.317-1.506A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.02-1.369l-.357-.214-3.75.894.952-3.653-.234-.376A9.818 9.818 0 1112 21.818z" />
                    </svg>
                  </div>

                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{
                      fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.9rem',
                      color: isHighlighted ? 'white' : 'var(--gray-800)',
                    }}>
                      {btn.label}
                    </div>
                    <div style={{
                      fontSize: '0.75rem', marginTop: 1,
                      color: isHighlighted ? 'rgba(255,255,255,0.8)' : 'var(--gray-400)',
                    }}>
                      {isHighlighted ? 'Recommended for current status' : 'Tap to send via WhatsApp'}
                    </div>
                  </div>

                  {isHighlighted && (
                    <div style={{
                      background: 'rgba(255,255,255,0.25)', borderRadius: 6,
                      padding: '2px 8px', fontSize: '0.7rem', fontWeight: 800,
                      color: 'white', letterSpacing: '0.03em',
                    }}>
                      NOW
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div style={{
            marginTop: 12, padding: '10px 12px',
            background: '#f0fdf4', borderRadius: 8,
            fontSize: '0.78rem', color: '#166534', fontWeight: 600,
          }}>
            Manual sends open in WhatsApp — you can review and edit before sending. Delivery status (read / delivered) updates in the log when using Meta Cloud API webhooks.
          </div>
        </div>

        {/* Status history */}
        <div className="card">
          <div style={{ fontFamily:'Nunito', fontWeight:800, marginBottom:12 }}>Status History</div>
          <div className="timeline">
            {order.history?.map((h, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot" style={{ background: i===order.history.length-1 ? 'var(--pink)' : 'var(--gray-300)' }} />
                <div className="timeline-content">
                  <div className="event">{h.from_status ? `${STATUS_LABELS[h.from_status]} → ` : ''}{STATUS_LABELS[h.to_status]}</div>
                  {h.notes && <div style={{ fontSize:'0.78rem', color:'var(--gray-400)' }}>{h.notes}</div>}
                  <div className="time">{formatDateTime(h.created_at)}{h.changed_by_name ? ` · ${h.changed_by_name}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages log */}
        {order.messages?.length > 0 && (
          <div className="card">
            <div style={{ fontFamily:'Nunito', fontWeight:800, marginBottom:12 }}>Message Log</div>
            {order.messages.map((m, i) => (
              <div key={i} style={{ padding:'8px 0', borderBottom: i<order.messages.length-1?'1px solid var(--gray-100)':'none' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:700, color:'#25d366' }}>WhatsApp</span>
                  <span style={{ color:'var(--gray-400)', textAlign:'right' }}>
                    {formatDateTime(m.sent_at)}
                    {m.wa_status && (
                      <span style={{
                        marginLeft: 8, fontSize: '0.65rem', fontWeight: 800,
                        textTransform: 'uppercase', color: 'var(--gray-500)',
                      }}>{m.wa_status}</span>
                    )}
                  </span>
                </div>
                <div style={{ fontSize:'0.82rem', color:'var(--gray-600)', marginTop:2 }}>{m.message}</div>
              </div>
            ))}
          </div>
        )}

        {review && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'Nunito', fontWeight: 800, marginBottom: 10 }}>
              Customer Review
            </div>
            <div style={{ display: 'flex', gap: 2, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} viewBox="0 0 24 24"
                  fill={s <= review.rating ? '#eb1997' : 'none'}
                  stroke={s <= review.rating ? '#eb1997' : '#d1d5db'}
                  strokeWidth="1.5" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ))}
              <span style={{ marginLeft: 6, fontWeight: 700, color: '#eb1997', fontSize: '0.9rem' }}>
                {review.rating}/5
              </span>
            </div>
            {review.comment && (
              <div style={{
                background: '#fdf2f8', borderRadius: 10,
                padding: '10px 14px', fontSize: '0.88rem',
                color: '#374151', lineHeight: 1.5,
                borderLeft: '3px solid #eb1997', fontStyle: 'italic',
              }}>
                &quot;{review.comment}&quot;
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 6 }}>
              {formatDateTime(review.created_at)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
