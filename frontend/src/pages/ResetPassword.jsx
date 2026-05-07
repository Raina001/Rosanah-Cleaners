import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Reset token is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/complete-password-reset', { token: token.trim(), password });
      setSuccess('Password updated successfully. You can now sign in with the new password.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #eb1997 0%, #8b2294 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Nunito Sans, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        maxWidth: 420,
        width: '100%',
        padding: 28,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)'
      }}>
        <h2 style={{ margin: 0, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#1f2937' }}>Reset Password</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: 8 }}>
          Paste your reset token, set a new password, then return to sign in.
        </p>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 12px', borderRadius: 10, marginBottom: 14 }}>{error}</div>}
        {success && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '10px 12px', borderRadius: 10, marginBottom: 14 }}>{success}</div>}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.84rem', fontWeight: 700, color: '#374151' }}>Reset token</label>
            <input
              className="form-control"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste reset token"
              autoCapitalize="none"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.84rem', fontWeight: 700, color: '#374151' }}>New password</label>
            <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.84rem', fontWeight: 700, color: '#374151' }}>Confirm new password</label>
            <input className="form-control" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" />
          </div>

          <button className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Updating password...' : 'Update password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <Link to="/" style={{ color: '#8b2294', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
