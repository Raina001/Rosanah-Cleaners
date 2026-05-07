import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState('');

  useEffect(() => {
    const reason = localStorage.getItem('rosanah_logout_reason');
    if (reason === 'inactivity') {
      setError('You were logged out due to inactivity. Please sign in again.');
      localStorage.removeItem('rosanah_logout_reason');
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordReset() {
    if (!form.username.trim()) {
      setError('Enter your username or email first.');
      return;
    }
    setResetting(true);
    setError('');
    setResetSent('');
    try {
      const data = await api.post('/auth/request-password-reset', { usernameOrEmail: form.username.trim() });
      setResetSent(data.message || 'If an account exists, reset instructions are ready.');
    } catch (err) {
      setError(err.message || 'Could not request password reset');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #eb1997 0%, #8b2294 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: "'Nunito Sans', sans-serif"
    }}>
      {/* Top branding above card */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
          border: '2px solid rgba(255,255,255,0.3)'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="white" width="32" height="32">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25V21m0 0H3.75A2.25 2.25 0 011.5 18.75V7.5A2.25 2.25 0 013.75 5.25h16.5A2.25 2.25 0 0122.5 7.5v11.25A2.25 2.25 0 0120.25 21H15.75m-9 0h9" />
          </svg>
        </div>
        <h1 style={{
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 900,
          fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
          color: 'white',
          margin: 0,
          letterSpacing: '-0.5px'
        }}>Rosanah Cleaners</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', margin: '6px 0 0', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Professional Cleaning Management
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: 'clamp(22px, 4vw, 36px) clamp(18px, 4vw, 28px)',
        width: '100%',
        maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)'
      }}>
        <h2 style={{
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 800,
          fontSize: '1.2rem',
          color: '#1f2937',
          margin: '0 0 6px'
        }}>Welcome back</h2>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 28px' }}>
          Sign in to your account to continue
        </p>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 14px',
            borderRadius: 10,
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: 20
          }}>
            {error}
          </div>
        )}

        {resetSent && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '12px 14px',
            borderRadius: 10,
            fontSize: '0.84rem',
            fontWeight: 600,
            marginBottom: 20
          }}>
            {resetSent}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#374151',
              marginBottom: 8,
              fontFamily: "'Nunito', sans-serif"
            }}>Username or Email</label>
            <input
              style={{
                width: '100%',
                padding: '13px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 12,
                fontSize: '1rem',
                fontFamily: "'Nunito Sans', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
                color: '#1f2937'
              }}
              onFocus={e => e.target.style.borderColor = '#eb1997'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              type="text"
              placeholder="Enter username or email"
              autoCapitalize="none"
              autoComplete="username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#374151',
              marginBottom: 8,
              fontFamily: "'Nunito', sans-serif"
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{
                  width: '100%',
                  padding: '13px 48px 13px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 12,
                  fontSize: '1rem',
                  fontFamily: "'Nunito Sans', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                  color: '#1f2937'
                }}
                onFocus={e => e.target.style.borderColor = '#eb1997'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4
                }}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              background: loading ? '#d1d5db' : 'linear-gradient(135deg, #eb1997, #8b2294)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: '1rem',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.02em',
              transition: 'opacity 0.15s',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(235,25,151,0.35)'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            disabled={resetting}
            onClick={requestPasswordReset}
            style={{
              width: '100%',
              marginTop: 10,
              padding: '12px',
              background: 'transparent',
              color: '#8b2294',
              border: '1px solid #e9d5ff',
              borderRadius: 12,
              fontSize: '0.88rem',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              cursor: resetting ? 'not-allowed' : 'pointer'
            }}
          >
            {resetting ? 'Preparing reset...' : 'Forgot password? Send reset link'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/reset-password" style={{ color: '#8b2294', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}>
              I already have a reset token
            </Link>
          </div>
        </form>

        <div style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid #f3f4f6',
          textAlign: 'center'
        }}>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
            Don't have an account?<br/>
            <strong style={{ color: '#6b7280' }}>Contact your administrator</strong> to get access.
          </p>
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: 24 }}>
        Rosanah Cleaners · Nairobi, Kenya · 0713497495
      </p>
    </div>
  );
}
