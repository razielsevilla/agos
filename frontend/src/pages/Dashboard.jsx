import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, Info, MapPin, Droplets, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const [streets, setStreets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStreets()
      .then(data => {
        setStreets(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading surveillance feeds...</div>;

  const flaggedStreets = streets.filter(s => s.status === 'flagged');

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Active Surveillance</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Overview of all monitored waterlines and computed risk scores.</p>
      </header>

      {flaggedStreets.length > 0 && (
        <div style={{
          backgroundColor: 'var(--danger-light)',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem'
        }}>
          <AlertTriangle color="var(--danger)" />
          <div>
            <h3 style={{ color: 'var(--danger)', fontSize: '1rem', marginBottom: '0.25rem' }}>Action Required</h3>
            <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>{flaggedStreets.length} street(s) have crossed the critical flood threshold based on fused data. Pre-flood alerts may be necessary.</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {streets.map(street => (
          <Link key={street.id} to={`/streets/${street.id}`} className="transition-all" style={{ textDecoration: 'none' }}>
            <div className="card transition-all" style={{ padding: '1.5rem', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{street.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <MapPin size={14} /> {street.barangay}
                  </div>
                </div>
                <span className={`badge ${street.status === 'flagged' ? 'danger' : street.status === 'watch' ? 'warning' : 'normal'}`}>
                  {street.status}
                </span>
              </div>
              
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Fused Risk Score</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: street.status === 'flagged' ? 'var(--danger)' : 'var(--text-main)', lineHeight: 1 }}>
                    {street.risk_score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ 100</span>
                  </div>
                </div>
                
                <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  View Details <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
