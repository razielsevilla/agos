import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, AlertTriangle, Clock, MapPin, Send } from 'lucide-react';

export default function AlertMock() {
  const { streetId } = useParams();
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlert(streetId)
      .then(data => {
        setAlertData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [streetId]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading alert payload...</div>;
  if (!alertData) return <div style={{ padding: '2rem' }}>Error loading alert.</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <Link to={`/streets/${streetId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Back to Detail
      </Link>

      <div style={{
        backgroundColor: '#1f2937', // Dark slate for emergency feel
        color: 'white',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{ backgroundColor: '#b91c1c', padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <AlertTriangle size={32} color="white" />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Flood Warning</h2>
            <p style={{ color: '#fecaca', fontSize: '0.875rem', marginTop: '0.25rem' }}>CDRRMO Emergency Bulletin</p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            <Clock size={16} /> Generated: {new Date(alertData.generated_at).toLocaleString()}
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Location</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
              <MapPin size={20} color="#ef4444" /> {alertData.street.name}
            </div>
          </div>

          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem', borderLeft: '4px solid #ef4444' }}>
            <h3 style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Evacuation Directive</h3>
            <p style={{ fontSize: '1rem', lineHeight: 1.5 }}>
              {alertData.suggested_evacuation_route}
            </p>
          </div>

          <div>
            <h3 style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>High Risk Households ({alertData.household_list.length})</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {alertData.household_list.map(hh => (
                <div key={hh.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{hh.address_label}</span>
                  <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.875rem' }}>Rank {hh.risk_rank}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer actions (Simulation only) */}
        <div style={{ padding: '1rem 2rem', backgroundColor: '#111827', borderTop: '1px solid #374151', display: 'flex', justifyContent: 'flex-end' }}>
          <button style={{
            backgroundColor: 'var(--primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <Send size={16} /> Disseminate Alert via SMS
          </button>
        </div>
      </div>
    </div>
  );
}
