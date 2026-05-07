import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast, ToastContainer } from '../components/Toast';

export default function Settings() {
  const { user, logout, patchUser } = useAuth();
  const { toasts, showToast } = useToast();
  const [tab, setTab] = useState('business');
  const [settings, setSettings] = useState({});
  const [pricing, setPricing] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newPrice, setNewPrice] = useState({ category: '', name: '', price: '', unit: '' });
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');

  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'reception', phone: '', email: '' });
  const [showAddUser, setShowAddUser] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', username: '', email: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const startEditProfile = () => {
    setProfileForm({ name: user.name, username: user.username, email: user.email || '' });
    setEditingProfile(true);
    setProfileError('');
    setProfileSuccess('');
  };

  const saveProfile = async () => {
    if (!profileForm.name || !profileForm.username) {
      setProfileError('Name and username are required');
      return;
    }
    try {
      await api.put(`/users/${user.id}`, {
        name: profileForm.name,
        username: profileForm.username,
        email: profileForm.email || null,
      });
      const updated = { ...user, name: profileForm.name, username: profileForm.username, email: profileForm.email || null };
      localStorage.setItem('rosanah_user', JSON.stringify(updated));
      patchUser({ name: updated.name, username: updated.username, email: updated.email });
      setProfileSuccess('Profile updated. Please log in again for changes to take full effect.');
      setEditingProfile(false);
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    }
  };

  useEffect(() => {
    api.get('/settings').then(setSettings);
    if (user.role === 'admin') {
      api.get('/pricing/all').then(setPricing);
      api.get('/users').then(setUsers);
    }
  }, [user.role]);

  async function saveSettings() {
    setSaving(true);
    await api.put('/settings', settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addPricing() {
    if (!newPrice.category || !newPrice.name || !newPrice.price) return;
    await api.post('/pricing', newPrice);
    const updated = await api.get('/pricing/all');
    setPricing(updated);
    setNewPrice({ category: '', name: '', price: '', unit: '' });
    setShowAddPrice(false);
  }

  async function togglePricing(p) {
    await api.put(`/pricing/${p.id}`, { ...p, active: p.active ? 0 : 1 });
    const updated = await api.get('/pricing/all');
    setPricing(updated);
  }

  async function addUser() {
    if (!newUser.name || !newUser.username || !newUser.password) return;
    try {
      await api.post('/users', newUser);
      const updated = await api.get('/users');
      setUsers(updated);
      setNewUser({ name: '', username: '', password: '', role: 'reception', phone: '', email: '' });
      setShowAddUser(false);
      showToast('User created successfully', 'success');
    } catch (e) {
      showToast(e.message || 'Could not create user', 'error');
    }
  }

  async function toggleUser(u) {
    await api.put(`/users/${u.id}`, { ...u, active: u.active ? 0 : 1 });
    const updated = await api.get('/users');
    setUsers(updated);
  }

  async function reopenSetup() {
    const confirmed = window.confirm('This will reopen the setup wizard on next load. Continue?');
    if (!confirmed) return;
    await api.post('/auth/reopen-setup', {});
    localStorage.removeItem('rosanah_token');
    localStorage.removeItem('rosanah_user');
    window.location.href = '/';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <ToastContainer toasts={toasts} />
      <div style={{ padding: '0 16px', background: 'var(--white)', borderBottom: '2px solid var(--gray-100)' }}>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 0 }}>
          {[
            { key: 'business', label: 'Business' },
            ...(user.role === 'admin' ? [
              { key: 'pricing', label: 'Pricing' },
              { key: 'users', label: 'Users' },
              { key: 'messages', label: 'Messages' },
            ] : []),
            { key: 'account', label: 'Account' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '14px 14px', background: 'none', border: 'none',
              borderBottom: `3px solid ${tab === t.key ? 'var(--pink)' : 'transparent'}`,
              color: tab === t.key ? 'var(--pink)' : 'var(--gray-500)',
              fontWeight: 700, fontFamily: 'Nunito', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -2
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="page-content">

        {tab === 'business' && (
          <div>
            {[
              { key: 'business_name', label: 'Business Name' },
              { key: 'business_phone', label: 'Business Phone' },
              { key: 'business_address', label: 'Address' },
              { key: 'whatsapp_number', label: 'WhatsApp Number' },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label>{f.label}</label>
                <input className="form-control" value={settings[f.key] || ''}
                  onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))} />
              </div>
            ))}
            <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        )}

        {tab === 'pricing' && user.role === 'admin' && (
          <div>
            {!showAddPrice ? (
              <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowAddPrice(true)}>
                + Add Pricing Item
              </button>
            ) : (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>New Pricing Item</div>
                <div className="form-group"><label>Category</label>
                  <input className="form-control" placeholder="e.g. Carpets" value={newPrice.category}
                    onChange={e => setNewPrice(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div className="form-group"><label>Name</label>
                  <input className="form-control" placeholder="e.g. Carpet (Large)" value={newPrice.name}
                    onChange={e => setNewPrice(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="form-group"><label>Price (KES)</label>
                    <input className="form-control" type="number" value={newPrice.price}
                      onChange={e => setNewPrice(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="form-group"><label>Unit</label>
                    <input className="form-control" placeholder="kg / sqft / piece" value={newPrice.unit}
                      onChange={e => setNewPrice(f => ({ ...f, unit: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setShowAddPrice(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={addPricing}>Add</button>
                </div>
              </div>
            )}

            {[...new Set(pricing.map(p => p.category))].map(cat => (
              <div key={cat}>
                <div className="section-title">{cat}</div>
                {pricing.filter(p => p.category === cat).map(p => (
                  <div key={p.id} className="card" style={{ marginBottom: 8, opacity: p.active ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>KES {p.price} / {p.unit}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {editingPriceId === p.id ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              className="form-control"
                              type="number"
                              value={editingPriceValue}
                              onChange={e => setEditingPriceValue(e.target.value)}
                              style={{ width: 80, padding: '6px 8px', fontSize: '0.85rem' }}
                              autoFocus
                            />
                            <button className="btn btn-success btn-sm" onClick={async () => {
                              const nextPrice = parseFloat(editingPriceValue);
                              if (Number.isNaN(nextPrice)) return;
                              await api.put(`/pricing/${p.id}`, { price: nextPrice });
                              const updated = await api.get('/pricing/all');
                              setPricing(updated);
                              setEditingPriceId(null);
                            }}>Save</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingPriceId(null)}>✕</button>
                          </div>
                        ) : (
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            setEditingPriceId(p.id);
                            setEditingPriceValue(String(p.price));
                          }}>Edit</button>
                        )}
                        <button onClick={() => togglePricing(p)} className={`btn btn-sm ${p.active ? 'btn-danger' : 'btn-success'}`}>
                          {p.active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && user.role === 'admin' && (
          <div>
            <button
              className="btn btn-primary"
              style={{ marginBottom: 16, width: '100%', fontWeight: 800 }}
              onClick={() => setShowAddUser(true)}
            >
              + Add User
            </button>

            {showAddUser && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 12 }}>New User</div>
                <div className="form-group"><label>Full Name *</label>
                  <input className="form-control" value={newUser.name} onChange={e => setNewUser(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group"><label>Username *</label>
                  <input className="form-control" autoCapitalize="none" value={newUser.username} onChange={e => setNewUser(f => ({ ...f, username: e.target.value }))} />
                </div>
                <div className="form-group"><label>Password *</label>
                  <input className="form-control" type="password" value={newUser.password} onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="form-group"><label>Phone</label>
                  <input className="form-control" type="tel" value={newUser.phone} onChange={e => setNewUser(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="form-group"><label>Email (optional)</label>
                  <input
                    className="form-control"
                    type="email"
                    placeholder="staff@rosanah.co.ke"
                    value={newUser.email || ''}
                    onChange={e => setNewUser(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="form-group"><label>Role</label>
                  <select className="form-control" value={newUser.role} onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))}>
                    <option value="reception">Reception</option>
                    <option value="driver">Driver</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setShowAddUser(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={addUser}>Add User</button>
                </div>
              </div>
            )}

            {users.map(u => (
              <div key={u.id} className="card" style={{ marginBottom: 10, opacity: u.active ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{u.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>@{u.username} · <span style={{ textTransform: 'capitalize' }}>{u.role}</span></div>
                    {u.phone && <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{u.phone}</div>}
                    {u.email && <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{u.email}</div>}
                  </div>
                  {u.username !== 'admin' && (
                    <button onClick={() => toggleUser(u)} className={`btn btn-sm ${u.active ? 'btn-danger' : 'btn-success'}`}>
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'messages' && user.role === 'admin' && (
          <div>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: 16 }}>
              Placeholders: {'{name}'}, {'{items_phrase}'} (e.g. your carpets and duvets), {'{item_breakdown}'} (line items),
              {'{amount}'} (number only — pair with the word KES in your template), {'{amount_full}'} (KES 1,234), {'{review_link}'}, {'{order_id}'}.
            </p>
            {[
              { key: 'pickup_message', label: 'After Pickup (items only, no prices)' },
              { key: 'cleaning_message', label: 'Cleaning started (invoice breakdown)' },
              { key: 'ready_message', label: 'Items Ready' },
              { key: 'payment_message', label: 'Payment Confirmed' },
              { key: 'delivery_message', label: 'After Delivery' },
            ].map(f => (
              <div key={f.key} className="form-group">
                <label>{f.label}</label>
                <textarea className="form-control" rows={3} value={settings[f.key] || ''}
                  onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))} />
              </div>
            ))}
            <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Messages'}
            </button>
          </div>
        )}

        {tab === 'account' && (
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: 'Nunito', fontWeight: 800 }}>My Profile</div>
                {!editingProfile && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={startEditProfile}>
                    Edit
                  </button>
                )}
              </div>

              {profileError && <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 700 }}>{profileError}</div>}
              {profileSuccess && <div style={{ color: 'var(--green)', fontSize: '0.85rem', marginBottom: 8, fontWeight: 700 }}>{profileSuccess}</div>}

              {editingProfile ? (
                <div>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input className="form-control" value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name" />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input className="form-control" value={profileForm.username}
                      onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="Your username" autoCapitalize="none" />
                  </div>
                  <div className="form-group">
                    <label>Email (optional)</label>
                    <input
                      className="form-control"
                      type="email"
                      placeholder="your@email.com"
                      value={profileForm.email || ''}
                      onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingProfile(false)}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={saveProfile}>Save</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Full Name</span>
                    <span style={{ fontWeight: 700 }}>{user.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Username</span>
                    <span style={{ fontWeight: 700 }}>@{user.username}</span>
                  </div>
                  {user.email && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
                      <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Email</span>
                      <span style={{ fontWeight: 700 }}>{user.email}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', border: 'none' }}>
                    <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Role</span>
                    <span style={{
                      background: 'var(--pink-light)', color: 'var(--pink)',
                      padding: '2px 10px', borderRadius: 999,
                      fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize',
                    }}>{user.role}</span>
                  </div>
                </div>
              )}
            </div>
            {user.role === 'admin' && (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: 10 }}
                onClick={reopenSetup}
              >
                Re-run Setup Wizard
              </button>
            )}
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={logout}>
              Sign Out
            </button>
          </div>
        )}
      </div>

      {tab === 'users' && user.role === 'admin' && (
        <button
          type="button"
          aria-label="Add user"
          style={{
            position: 'fixed', bottom: 80, right: 20, width: 56, height: 56,
            borderRadius: '50%', background: 'linear-gradient(135deg, var(--pink), var(--purple))',
            border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(235,25,151,0.4)', zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowAddUser(true)}
        >
          +
        </button>
      )}
    </div>
  );
}
