import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicApiBase } from '../utils/api';

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #eb1997 0%, #8b2294 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '24px', fontFamily: 'Nunito Sans, sans-serif',
};

const cardStyle = {
  background: 'white', borderRadius: 24, padding: '36px 28px',
  width: '100%', maxWidth: 420,
  boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
};

function Logo() {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, #eb1997, #8b2294)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px',
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          strokeWidth="1.5" stroke="white" width="28" height="28">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.499z" />
        </svg>
      </div>
      <div style={{
        fontFamily: 'Nunito, sans-serif', fontWeight: 900,
        fontSize: '1.3rem', color: '#eb1997',
      }}>
        Rosanah Cleaners
      </div>
      <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>
        Professional Cleaning Services
      </div>
    </div>
  );
}

const StarIcon = ({ filled, onClick, onHover }) => (
  <svg
    role="presentation"
    onClick={onClick}
    onMouseEnter={onHover}
    viewBox="0 0 24 24"
    fill={filled ? '#eb1997' : 'none'}
    stroke={filled ? '#eb1997' : '#d1d5db'}
    strokeWidth="1.5"
    width="44" height="44"
    style={{ cursor: 'pointer', transition: 'all 0.1s' }}
  >
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
    />
  </svg>
);

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent!',
};

export default function Review() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const customerId = searchParams.get('customer');
  const token = searchParams.get('token');

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const apiBase = getPublicApiBase();

  useEffect(() => {
    if (!orderId) return;
    fetch(`${apiBase}/reviews/check/${orderId}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.id) setAlreadyReviewed(true);
      })
      .catch(() => {});
  }, [orderId, apiBase]);

  async function handleSubmit() {
    if (!rating) { setError('Please select a rating'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/reviews/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: parseInt(orderId, 10),
          customer_id: parseInt(customerId, 10),
          rating,
          comment,
          token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!orderId || !customerId || !token) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>
            Invalid review link.
          </div>
        </div>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <Logo />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#10b981" width="64" height="64" style={{ margin: '0 auto', display: 'block' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.1rem', marginBottom: 6 }}>
              Already Reviewed
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              You have already submitted a review for this order. Thank you!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <Logo />
          <div style={{ textAlign: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#10b981" width="72" height="72" style={{ margin: '0 auto 16px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: '1.3rem', color: '#1f2937', marginBottom: 8 }}>
              Thank You!
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Your feedback means a lot to us. We look forward to serving you again at Rosanah Cleaners!
            </p>
            <div style={{ marginTop: 20, padding: '12px', background: '#fdf2f8', borderRadius: 12 }}>
              <div style={{ fontSize: '0.82rem', color: '#9333ea', fontWeight: 600 }}>
                Rosanah Cleaners · Nairobi, Kenya · 0713497495
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayRating = hovered || rating;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Logo />

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: 'Nunito', fontWeight: 800, fontSize: '1.1rem', color: '#1f2937', marginBottom: 4 }}>
            How was your experience?
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
            Order #{orderId} · Your feedback helps us improve
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map(star => (
            <StarIcon
              key={star}
              filled={star <= displayRating}
              onClick={() => setRating(star)}
              onHover={() => setHovered(star)}
            />
          ))}
        </div>

        <div
          style={{
            textAlign: 'center', marginBottom: 20,
            fontFamily: 'Nunito', fontWeight: 800,
            fontSize: '1rem',
            color: displayRating ? '#eb1997' : '#d1d5db',
            minHeight: 28,
            transition: 'color 0.15s',
          }}
          onMouseLeave={() => setHovered(0)}
        >
          {displayRating ? RATING_LABELS[displayRating] : 'Tap a star to rate'}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block', fontSize: '0.82rem',
            fontWeight: 700, color: '#374151', marginBottom: 8,
          }}
          >
            Tell us more (optional)
          </label>
          <textarea
            style={{
              width: '100%', padding: '12px 14px',
              border: '2px solid #e5e7eb', borderRadius: 12,
              fontSize: '0.95rem', fontFamily: 'Nunito Sans, sans-serif',
              outline: 'none', boxSizing: 'border-box',
              resize: 'none', color: '#1f2937', minHeight: 100,
            }}
            onFocus={e => { e.target.style.borderColor = '#eb1997'; }}
            onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
            placeholder="What did you love? What can we do better?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
          />
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>
            {comment.length}/500
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            color: '#dc2626', padding: '10px 14px',
            borderRadius: 10, fontSize: '0.875rem',
            fontWeight: 600, marginBottom: 16,
          }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !rating}
          style={{
            width: '100%', padding: '15px',
            background: !rating || loading
              ? '#d1d5db'
              : 'linear-gradient(135deg, #eb1997, #8b2294)',
            color: 'white', border: 'none', borderRadius: 12,
            fontSize: '1rem', fontFamily: 'Nunito, sans-serif',
            fontWeight: 800, cursor: !rating || loading ? 'not-allowed' : 'pointer',
            boxShadow: rating && !loading ? '0 4px 16px rgba(235,25,151,0.35)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>

        <p style={{
          textAlign: 'center', color: '#9ca3af',
          fontSize: '0.75rem', marginTop: 16, marginBottom: 0,
        }}
        >
          Rosanah Cleaners · Nairobi, Kenya
        </p>
      </div>
    </div>
  );
}
