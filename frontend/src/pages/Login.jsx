import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import wordmarkImg from '../assets/wordmark.jpg';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [municipalCode, setMunicipalCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(municipalCode, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', backgroundColor: 'var(--bg-app)', padding: '1rem' }}>
      
      {/* Logo Outside the Card */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <img src={wordmarkImg} alt="AGOS Wordmark" style={{ height: '110px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply', marginBottom: '0.75rem' }} />
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          CDRRMO Command Center
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem', boxShadow: 'var(--shadow-lg)' }}>
        <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-main)', fontSize: '1.25rem' }}>Secure Sign In</h3>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Municipal Code
          </label>
          <input
            type="text"
            value={municipalCode}
            onChange={(e) => setMunicipalCode(e.target.value)}
            autoFocus
            required
            placeholder="e.g. CABUYAO-CDRRMO"
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.95rem' }}
          />
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: 'var(--danger-light)', color: 'var(--danger)',
            padding: '0.875rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            <ShieldAlert size={16} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-solid"
          style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', display: 'flex', justifyContent: 'center' }}
        >
          {submitting ? 'Authenticating...' : 'Access Dashboard'} <Lock size={16} />
        </button>
      </form>
    </div>
  );
}
