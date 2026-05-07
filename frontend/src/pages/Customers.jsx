import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDate } from '../utils/api';

const LOYALTY_STYLES = {
  gold: { bg: '#fef9c3', color: '#854d0e', label: 'Gold' },
  silver: { bg: '#f1f5f9', color: '#475569', label: 'Silver' },
  returning: { bg: 'var(--pink-light)', color: 'var(--pink)', label: 'Returning' },
  new: { bg: 'var(--gray-100)', color: 'var(--gray-500)', label: 'New' },
};

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', location: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [importTab, setImportTab] = useState('single');
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/customers${search ? `?q=${encodeURIComponent(search)}` : ''}`).then(setCustomers).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function resetAddForm() {
    setShowAddForm(false);
    setSaveError('');
    setSaving(false);
    setNewCustomer({ name: '', phone: '', location: '', notes: '' });
    setImportTab('single');
    setBulkText('');
    setBulkPreview([]);
    setBulkSaving(false);
    setBulkResult(null);
  }

  function normalizePhone(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('0')) return `254${d.slice(1)}`;
    if (d.startsWith('254')) return d;
    if (d.length === 9) return `254${d}`;
    return d;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', background: 'var(--white)', borderBottom: '2px solid var(--gray-100)' }}>
        <div className="search-bar" style={{ marginBottom: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>}
        </div>
      </div>

      <div className="page-content">
        {loading ? <div className="spinner" /> : customers.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <p>{search ? 'No customers found' : 'No customers yet'}</p>
          </div>
        ) : (
          customers.map(c => (
            <div key={c.id} className="card" style={{ cursor: 'pointer', marginBottom: 10 }} onClick={() => navigate(`/customers/${c.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1rem' }}>{c.name}</div>
                    {c.loyalty_tier && c.loyalty_tier !== 'new' && (
                      <span style={{
                        background: LOYALTY_STYLES[c.loyalty_tier]?.bg,
                        color: LOYALTY_STYLES[c.loyalty_tier]?.color,
                        padding: '2px 8px', borderRadius: 999,
                        fontSize: '0.72rem', fontWeight: 700,
                      }}>
                        {LOYALTY_STYLES[c.loyalty_tier]?.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: 2 }}>
                    {c.phone}
                    {c.location && <> · {c.location}</>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}>
                    Customer since {formatDate(c.created_at)}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>
          ))
        )}
      </div>

      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            position: 'fixed',
            bottom: 88,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #eb1997, #8b2294)',
            border: 'none',
            color: 'white',
            fontSize: '1.5rem',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(235,25,151,0.4)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            strokeWidth="2" stroke="currentColor" width="24" height="24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      )}

      {showAddForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-end'
        }} onClick={resetAddForm}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '20px 20px 0 0',
              padding: 24, width: '100%', maxHeight: '90vh', overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.1rem' }}>
                Add Customer
              </div>
              <button onClick={resetAddForm}
                style={{ background: 'var(--gray-100)', border: 'none',
                  borderRadius: '50%', width: 32, height: 32, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', background: 'var(--gray-100)',
              borderRadius: 8, padding: 4, marginBottom: 20 }}>
              {['single', 'bulk'].map(t => (
                <button key={t} onClick={() => setImportTab(t)}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: 6,
                    background: importTab === t ? 'white' : 'transparent',
                    fontFamily: 'Nunito', fontWeight: 700, fontSize: '0.85rem',
                    color: importTab === t ? 'var(--pink)' : 'var(--gray-500)',
                    cursor: 'pointer',
                    boxShadow: importTab === t ? 'var(--shadow)' : 'none'
                  }}>
                  {t === 'single' ? 'Single Customer' : 'Bulk Import'}
                </button>
              ))}
            </div>

            {saveError && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px',
                borderRadius: 8, marginBottom: 12, fontWeight: 600, fontSize: '0.875rem' }}>
                {saveError}
              </div>
            )}

            {importTab === 'single' && (
              <>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input className="form-control" placeholder="e.g. Jane Wanjiku"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input className="form-control" type="tel" placeholder="07XXXXXXXX"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input className="form-control" placeholder="e.g. Westlands, Nairobi"
                    value={newCustomer.location}
                    onChange={e => setNewCustomer(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea className="form-control" rows={2}
                    placeholder="Any additional details..."
                    value={newCustomer.notes}
                    onChange={e => setNewCustomer(f => ({ ...f, notes: e.target.value }))} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={resetAddForm}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={saving || !newCustomer.name || !newCustomer.phone}
                    onClick={async () => {
                      setSaving(true);
                      setSaveError('');
                      try {
                        await api.post('/customers', newCustomer);
                        resetAddForm();
                        load();
                      } catch (err) {
                        setSaveError(err.message || 'Failed to save customer');
                      } finally {
                        setSaving(false);
                      }
                    }}
                  >
                    {saving ? 'Saving...' : 'Save Customer'}
                  </button>
                </div>
              </>
            )}

            {importTab === 'bulk' && (
              <div>
                <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: 12 }}>
                  Paste one customer per line. Format:<br/>
                  <strong>Name, Phone</strong> or <strong>Name, Phone, Location</strong><br/>
                  Example: Jane Wanjiku, 0712345678, Westlands, Nairobi
                </p>
                <div className="form-group">
                  <label>Customer List</label>
                  <textarea
                    className="form-control"
                    rows={8}
                    placeholder={
                      "Jane Wanjiku, 0712345678, Westlands\n" +
                      "John Kamau, 0723456789, Kilimani\n" +
                      "Mary Njeri, 0734567890"
                    }
                    value={bulkText}
                    onChange={e => {
                      const value = e.target.value;
                      setBulkText(value);
                      const lines = value.split('\n').filter(l => l.trim());
                      const parsed = lines.map(line => {
                        const parts = line.split(',').map(p => p.trim());
                        return {
                          name: parts[0] || '',
                          phone: parts[1] || '',
                          location: parts[2] || '',
                          valid: !!(parts[0] && parts[1])
                        };
                      });
                      setBulkPreview(parsed);
                    }}
                  />
                </div>

                {bulkPreview.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: 'Nunito', fontWeight: 700,
                      fontSize: '0.82rem', marginBottom: 8, color: 'var(--gray-600)' }}>
                      Preview: {bulkPreview.filter(p => p.valid).length} valid, {' '}
                      {bulkPreview.filter(p => !p.valid).length} invalid
                    </div>
                    <div style={{ maxHeight: 150, overflowY: 'auto',
                      border: '1px solid var(--gray-200)', borderRadius: 8 }}>
                      {bulkPreview.map((p, i) => (
                        <div key={i} style={{
                          padding: '6px 12px', fontSize: '0.8rem',
                          borderBottom: '1px solid var(--gray-100)',
                          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
                          background: p.valid ? 'white' : '#fef2f2',
                          color: p.valid ? 'var(--gray-700)' : '#dc2626'
                        }}>
                          <span>{p.name || '(no name)'}</span>
                          <span>{p.phone || '(no phone)'}</span>
                          <span style={{ color: p.valid ? 'var(--gray-400)' : '#dc2626' }}>{p.location}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {bulkResult && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                    background: '#d1fae5', color: '#065f46', fontWeight: 600,
                    fontSize: '0.875rem'
                  }}>
                    ✓ {bulkResult.created} customers added, {bulkResult.skipped} skipped
                    (already exist/invalid)
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button className="btn btn-secondary" onClick={resetAddForm}>Close</button>
                  <button
                    className="btn btn-primary"
                    disabled={bulkSaving || bulkPreview.filter(p => p.valid).length === 0}
                    onClick={async () => {
                      setBulkSaving(true);
                      setBulkResult(null);
                      let created = 0;
                      let skipped = 0;
                      try {
                        const existing = await api.get('/customers');
                        const existingPhones = new Set(existing.map(c => normalizePhone(c.phone)));
                        const validCustomers = bulkPreview.filter(p => p.valid);
                        for (const c of validCustomers) {
                          const key = normalizePhone(c.phone);
                          if (!key || existingPhones.has(key)) {
                            skipped++;
                            continue;
                          }
                          try {
                            await api.post('/customers', c);
                            created++;
                            existingPhones.add(key);
                          } catch {
                            skipped++;
                          }
                        }
                        setBulkResult({ created, skipped });
                        setBulkText('');
                        setBulkPreview([]);
                        load();
                      } finally {
                        setBulkSaving(false);
                      }
                    }}
                  >
                    {bulkSaving
                      ? 'Importing...'
                      : `Import ${bulkPreview.filter(p => p.valid).length} Customers`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
