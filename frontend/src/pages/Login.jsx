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
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', backgroundColor: 'var(--bg-app)', padding: '1rem' }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: '380px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src={wordmarkImg} alt="AGOS Wordmark" style={{ height: '48px', width: 'auto', objectFit: 'contain', mixBlendMode: 'multiply', marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
            CDRRMO COMMAND CENTER
          </p>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Municipal Code
          </label>
          <input
            type="text"
            value={municipalCode}
            onChange={(e) => setMunicipalCode(e.target.value)}
            autoFocus
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
          />
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: 'var(--danger-light)', color: 'var(--danger)',
            padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-solid"
          style={{ width: '100%' }}
        >
          <Lock size={16} /> {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
