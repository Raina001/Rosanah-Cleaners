import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, formatCurrency } from '../utils/api';

const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>;

export default function NewOrder() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [step, setStep] = useState(1);
  const [pricing, setPricing] = useState([]);
  const [categories, setCategories] = useState([]);

  const passedCustomer = routerLocation.state?.customer;
  const [customer, setCustomer] = useState({ name: passedCustomer?.name || '', phone: passedCustomer?.phone || '', location: passedCustomer?.location || '', notes: '' });
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(passedCustomer || null);
  const [searching, setSearching] = useState(false);

  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPricing, setSelectedPricing] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemUnit, setItemUnit] = useState('');
  const [itemCondition, setItemCondition] = useState('');
  const [customItem, setCustomItem] = useState({ name: '', price: '', qty: 1, unit: '' });
  const [showCustom, setShowCustom] = useState(false);
  const [tbcItem, setTbcItem] = useState({ name: '', qty: '1', unit: 'pcs' });
  const [showTbc, setShowTbc] = useState(false);

  const [pickupTime, setPickupTime] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/pricing').then(data => {
      setPricing(data);
      const cats = [...new Set(data.map(p => p.category))];
      setCategories(cats);
      if (cats.length) setSelectedCategory(cats[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      setCustomerResults([]);
      setSearching(false);
      return;
    }
    if (customer.phone.length >= 4) {
      setSearching(true);
      const t = setTimeout(() => {
        api.get(`/customers?q=${customer.phone}`).then(r => {
          setCustomerResults(r.slice(0, 3));
          setSearching(false);
        }).catch(() => setSearching(false));
      }, 400);
      return () => clearTimeout(t);
    } else {
      setCustomerResults([]);
    }
  }, [customer.phone, selectedCustomer]);

  const filteredPricing = pricing.filter(p => p.category === selectedCategory);
  const total = items.reduce((s, i) => s + i.total_price, 0);

  function addItem() {
    if (!selectedPricing) return;
    const p = pricing.find(x => x.id === Number(selectedPricing));
    if (!p) return;
    const qty = parseFloat(itemQty) || 1;
    const newItem = {
      service_name: p.name,
      description: itemCondition.trim() || null,
      quantity: qty,
      unit: p.unit || '',
      unit_price: p.price,
      total_price: p.price * qty,
    };
    setItems(prev => [...prev, newItem]);
    setItemQty(1);
    setItemCondition('');
    setSelectedPricing('');
  }

  function addTbcItem() {
    if (!tbcItem.name.trim()) return;
    const qty = parseFloat(tbcItem.qty) || 1;
    setItems(prev => [...prev, {
      service_name: tbcItem.name.trim(),
      description: 'Price confirmed at shop',
      quantity: qty,
      unit: (tbcItem.unit || 'pcs').trim(),
      unit_price: 0,
      total_price: 0,
    }]);
    setTbcItem({ name: '', qty: '1', unit: 'pcs' });
    setShowTbc(false);
  }

  function addCustomItem() {
    if (!customItem.name || !customItem.price) return;
    const qty = parseFloat(customItem.qty) || 1;
    setItems(prev => [...prev, {
      service_name: customItem.name,
      description: null,
      quantity: qty,
      unit: customItem.unit || '',
      unit_price: parseFloat(customItem.price),
      total_price: parseFloat(customItem.price) * qty,
    }]);
    setCustomItem({ name: '', price: '', qty: 1, unit: '' });
    setShowCustom(false);
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItemPrice(idx, newPrice) {
    setItems(prev => prev.map((item, i) => i === idx ? {
      ...item, unit_price: parseFloat(newPrice) || 0,
      total_price: (parseFloat(newPrice) || 0) * item.quantity
    } : item));
  }

  async function handleSubmit() {
    if (items.length === 0) { setError('Add at least one item'); return; }
    setSubmitting(true);
    setError('');
    try {
      let cid = selectedCustomer?.id;
      if (!cid) {
        const c = await api.post('/customers', customer);
        cid = c.id;
      }
      const order = await api.post('/orders', {
        customer_id: cid,
        items,
        pickup_time: pickupTime || null,
        notes: orderNotes || null,
      });
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[1, 2].map(s => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: s <= step ? 'linear-gradient(90deg,var(--pink),var(--purple))' : 'var(--gray-200)'
          }} />
        ))}
      </div>

      {step === 1 && (
        <div>
          <h3 style={{ fontFamily: 'Nunito', fontWeight: 800, marginBottom: 16 }}>Customer Details</h3>

          <div className="form-group">
            <label>Phone Number *</label>
            <input className="form-control" type="tel" placeholder="07XXXXXXXX" value={customer.phone}
              onChange={e => setCustomer(f => ({ ...f, phone: e.target.value }))} />
          </div>

          {customerResults.length > 0 && (
            <div style={{ marginTop: -8, marginBottom: 14 }}>
              <div className="section-title">Existing Customers</div>
              {customerResults.map(c => (
                <div key={c.id} onClick={() => {
                  setSelectedCustomer(c);
                  setCustomer({ name: c.name, phone: c.phone, location: c.location || '', notes: '' });
                  setCustomerResults([]);
                }} style={{
                  padding: '10px 14px', background: selectedCustomer?.id === c.id ? 'var(--pink-light)' : 'var(--white)',
                  borderRadius: 8, marginBottom: 6, border: `2px solid ${selectedCustomer?.id === c.id ? 'var(--pink)' : 'var(--gray-200)'}`,
                  cursor: 'pointer'
                }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{c.phone} · {c.location}</div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedCustomer(null); setCustomerResults([]); setCustomer(f => ({ ...f, name: '', location: '' })); }}>
                + New Customer
              </button>
            </div>
          )}

          <div className="form-group">
            <label>Full Name *</label>
            <input className="form-control" placeholder="Customer name" value={customer.name}
              onChange={e => setCustomer(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input className="form-control" placeholder="e.g. Westlands, Nairobi" value={customer.location}
              onChange={e => setCustomer(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Preferred Pickup Time</label>
            <input className="form-control" type="datetime-local" value={pickupTime}
              onChange={e => setPickupTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="form-control" rows={2} placeholder="Any special instructions..." value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => {
            if (!customer.name || !customer.phone) { setError('Name and phone required'); return; }
            setError(''); setStep(2);
          }}>Continue to Items →</button>
          {error && <div style={{ color: 'var(--red)', marginTop: 8, fontWeight: 700 }}>{error}</div>}
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 style={{ fontFamily: 'Nunito', fontWeight: 800, marginBottom: 4 }}>Add Items</h3>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: 16 }}>For: {customer.name}</p>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => { setSelectedCategory(cat); setSelectedPricing(''); }}
                style={{
                  padding: '8px 14px', borderRadius: 999, whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: 700,
                  background: selectedCategory === cat ? 'var(--pink)' : 'var(--gray-100)',
                  color: selectedCategory === cat ? 'white' : 'var(--gray-600)',
                  border: 'none', cursor: 'pointer'
                }}>
                {cat}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            {filteredPricing.map(p => (
              <div key={p.id} onClick={() => setSelectedPricing(String(p.id))}
                style={{
                  padding: '10px 14px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${selectedPricing === String(p.id) ? 'var(--pink)' : 'var(--gray-200)'}`,
                  background: selectedPricing === String(p.id) ? 'var(--pink-light)' : 'var(--white)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <span style={{ color: 'var(--pink)', fontWeight: 800, fontFamily: 'Nunito' }}>KES {p.price}/{p.unit}</span>
              </div>
            ))}
          </div>

          {selectedPricing && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Quantity / Weight ({pricing.find(p => p.id === Number(selectedPricing))?.unit || 'units'})</label>
                <input className="form-control" type="number" min="0.1" step="0.1" value={itemQty}
                  onChange={e => setItemQty(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Condition Notes (optional)</label>
                <input className="form-control"
                  placeholder="e.g. stain on collar, missing button, faded"
                  value={itemCondition}
                  onChange={e => setItemCondition(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 700 }}>Total:</span>
                <span style={{ color: 'var(--pink)', fontWeight: 900, fontFamily: 'Nunito', fontSize: '1.1rem' }}>
                  {formatCurrency((pricing.find(p => p.id === Number(selectedPricing))?.price || 0) * (parseFloat(itemQty) || 1))}
                </span>
              </div>
              <button className="btn btn-primary" onClick={addItem}>+ Add to Order</button>
            </div>
          )}

          {!showTbc ? (
            <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 10 }} onClick={() => { setShowTbc(true); setShowCustom(false); }}>
              + Add item (price TBC at shop)
            </button>
          ) : (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Approximate item — priced at laundry</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: 12 }}>
                Use when size or count is uncertain until measured on site. Total stays KES 0 until reception updates the order after intake.
              </p>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>What are we collecting? *</label>
                <input className="form-control" placeholder="e.g. Large carpet, 2 duvets" value={tbcItem.name}
                  onChange={e => setTbcItem(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Qty (estimate)</label>
                  <input className="form-control" type="number" min="0.1" step="0.1" value={tbcItem.qty}
                    onChange={e => setTbcItem(f => ({ ...f, qty: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Unit</label>
                  <input className="form-control" placeholder="pcs, kg…" value={tbcItem.unit}
                    onChange={e => setTbcItem(f => ({ ...f, unit: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={addTbcItem}>Add to order</button>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowTbc(false)}>Cancel</button>
              </div>
            </div>
          )}

          {!showCustom ? (
            <button className="btn btn-secondary" style={{ width: '100%', marginBottom: 14 }} onClick={() => { setShowCustom(true); setShowTbc(false); }}>
              + Add Custom Item
            </button>
          ) : (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Custom Item</div>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label>Item Name *</label>
                <input className="form-control" placeholder="e.g. Bed sheets" value={customItem.name}
                  onChange={e => setCustomItem(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Price (KES) *</label>
                  <input className="form-control" type="number" placeholder="0" value={customItem.price}
                    onChange={e => setCustomItem(f => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Quantity</label>
                  <input className="form-control" type="number" min="1" value={customItem.qty}
                    onChange={e => setCustomItem(f => ({ ...f, qty: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={addCustomItem}>Add</button>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCustom(false)}>Cancel</button>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div>
              <div className="section-title">Order Items ({items.length})</div>
              {items.map((item, idx) => (
                <div key={idx} className="item-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div className="item-name">{item.service_name}</div>
                      <div className="item-detail">
                        {item.unit_price > 0
                          ? `${item.quantity} ${item.unit} × KES ${item.unit_price}`
                          : `${item.quantity} ${item.unit} · priced at shop`}
                      </div>
                      {item.description && <div className="item-detail">{item.description}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="item-price">{item.total_price > 0 ? formatCurrency(item.total_price) : 'TBC'}</span>
                      <button className="btn btn-danger btn-sm" onClick={() => removeItem(idx)} style={{ padding: '6px 8px' }}>
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="total-line">
                <span className="label">Total</span>
                <span className="amount">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {error && <div style={{ color: 'var(--red)', margin: '8px 0', fontWeight: 700 }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || items.length === 0}>
              {submitting ? 'Creating...' : `Create Order · ${formatCurrency(total)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
