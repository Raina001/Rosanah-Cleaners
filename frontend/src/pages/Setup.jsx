import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

const steps = ['Business', 'Admin Account', 'Done'];

export default function Setup() {
  const { setSession } = useAuth();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    business_name: 'Rosanah Cleaners',
    admin_name: '',
    username: '',
    email: '',
    password: '',
    confirm_password: ''
  });

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleSubmit() {
    if (!form.admin_name || !form.username || !form.password) {
      setError('Name, username and password are required');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.post('/auth/setup', {
        business_name: form.business_name,
        admin_name: form.admin_name,
        username: form.username,
        email: form.email || undefined,
        password: form.password
      });

      setSession(data.token, data.user);

      setStep(2);
    } catch (err) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '13px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: 12,
    fontSize: '1rem',
    fontFamily: 'Nunito Sans, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1f2937'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #eb1997 0%, #8b2294 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, fontFamily: 'Nunito Sans, sans-serif'
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: 'clamp(22px, 4vw, 36px) clamp(18px, 4vw, 28px)',
        width: '100%', maxWidth: 500,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #eb1997, #8b2294)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="white" width="28" height="28">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25V21m0 0H3.75A2.25 2.25 0 011.5 18.75V7.5A2.25 2.25 0 013.75 5.25h16.5A2.25 2.25 0 0122.5 7.5v11.25A2.25 2.25 0 0120.25 21H15.75m-9 0h9" />
            </svg>
          </div>
          <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.3rem', color: '#eb1997' }}>
            Welcome to Rosanah Cleaners
          </div>
          <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: 4 }}>
            Let&apos;s set up your system - takes 1 minute
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{
                height: 4, borderRadius: 2,
                background: i <= step
                  ? 'linear-gradient(90deg, #eb1997, #8b2294)'
                  : '#e5e7eb',
                marginBottom: 4
              }} />
              <div style={{
                fontSize: '0.68rem', fontWeight: 700,
                color: i <= step ? '#eb1997' : '#9ca3af',
                fontFamily: 'Nunito'
              }}>{s}</div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <h3 style={{ fontFamily: 'Nunito', fontWeight: 800, marginBottom: 6, fontSize: '1.05rem' }}>
              Business Details
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 20 }}>
              Confirm your business name
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Business Name
              </label>
              <input
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#eb1997'; }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                value={form.business_name}
                onChange={e => update('business_name', e.target.value)}
                placeholder="e.g. Rosanah Cleaners"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={!form.business_name}
              style={{
                width: '100%', padding: 15,
                background: !form.business_name ? '#d1d5db' : 'linear-gradient(135deg, #eb1997, #8b2294)',
                color: 'white', border: 'none', borderRadius: 12,
                fontSize: '1rem', fontFamily: 'Nunito', fontWeight: 800,
                cursor: !form.business_name ? 'not-allowed' : 'pointer'
              }}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 style={{ fontFamily: 'Nunito', fontWeight: 800, marginBottom: 6, fontSize: '1.05rem' }}>
              Create Your Admin Account
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: 20 }}>
              This will be your login. Keep these credentials safe.
            </p>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                color: '#dc2626', padding: '10px 14px', borderRadius: 10,
                fontSize: '0.875rem', fontWeight: 600, marginBottom: 16
              }}>
                {error}
              </div>
            )}

            {[
              { label: 'Full Name', field: 'admin_name', type: 'text', placeholder: 'e.g. Jane Rosanah' },
              { label: 'Username', field: 'username', type: 'text', placeholder: 'e.g. janerosanah', hint: 'Used to log in' },
              { label: 'Email (optional)', field: 'email', type: 'email', placeholder: 'your@email.com' },
            ].map(f => (
              <div key={f.field} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  {f.label}
                  {f.hint && <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>- {f.hint}</span>}
                </label>
                <input
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#eb1997'; }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.field]}
                  onChange={e => update(f.field, e.target.value)}
                  autoCapitalize="none"
                />
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Password <span style={{ color: '#9ca3af', fontWeight: 400 }}>- minimum 6 characters</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingRight: 48 }}
                  onFocus={e => { e.target.style.borderColor = '#eb1997'; }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingRight: 48 }}
                  onFocus={e => { e.target.style.borderColor = '#eb1997'; }}
                  onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={form.confirm_password}
                  onChange={e => update('confirm_password', e.target.value)}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  {showConfirm ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setStep(0)}
                style={{
                  padding: 14, background: '#f3f4f6', border: 'none',
                  borderRadius: 12, fontSize: '0.95rem', fontFamily: 'Nunito',
                  fontWeight: 700, cursor: 'pointer', color: '#374151'
                }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: 14,
                  background: loading ? '#d1d5db' : 'linear-gradient(135deg, #eb1997, #8b2294)',
                  color: 'white', border: 'none', borderRadius: 12,
                  fontSize: '1rem', fontFamily: 'Nunito', fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(235,25,151,0.35)'
                }}
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ marginBottom: 16 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#10b981" width="72" height="72" style={{ margin: '0 auto', display: 'block' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.3rem', color: '#1f2937', marginBottom: 8 }}>
              You&apos;re all set!
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Your Rosanah Cleaners system is ready. Taking you to the dashboard...
            </p>
            <div style={{ marginTop: 20 }}>
              <div style={{
                height: 4, borderRadius: 2, overflow: 'hidden',
                background: '#f3f4f6'
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, #eb1997, #8b2294)',
                  animation: 'progress 2.5s linear forwards',
                  width: '0%'
                }} />
              </div>
            </div>
            <style>{`
              @keyframes progress { from { width: 0% } to { width: 100% } }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
