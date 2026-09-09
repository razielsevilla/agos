import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Navigation, AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react';

export default function StreetDetail() {
  const { streetId } = useParams();
  const [street, setStreet] = useState(null);
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('pre'); // 'pre' or 'post'

  useEffect(() => {
    loadData();
  }, [streetId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [streetData, householdsData] = await Promise.all([
        api.getStreetDetail(streetId),
        api.getHouseholds(streetId)
      ]);
      setStreet(streetData);
      setHouseholds(householdsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecovery = async () => {
    setView('post');
    try {
      const data = await api.getRecoveryRecord(streetId);
      setHouseholds(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAffected = async (id, status) => {
    try {
      const updated = await api.markAffected(id, status);
      setHouseholds(prev => prev.map(h => h.id === id ? updated : h));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !street) return <div>Loading details...</div>;

  return (
    <div>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{street.name}</h2>
            <span className={`badge ${street.status === 'flagged' ? 'danger' : 'normal'}`} style={{ fontSize: '0.875rem' }}>
              {street.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Camera: {street.camera_label}</p>
        </div>
        
        {street.status === 'flagged' && (
          <Link to={`/streets/${street.id}/alert`} className="transition-all" style={{
            backgroundColor: 'var(--danger)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow)'
          }}>
            <AlertCircle size={18} /> View Alert Payload
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => { setView('pre'); loadData(); }}
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '0.375rem', 
            backgroundColor: view === 'pre' ? 'var(--primary)' : 'transparent',
            color: view === 'pre' ? 'white' : 'var(--text-muted)',
            fontWeight: 600,
            border: view === 'pre' ? 'none' : '1px solid var(--border)'
          }}>
          Pre-Flood Risk List
        </button>
        <button 
          onClick={loadRecovery}
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '0.375rem', 
            backgroundColor: view === 'post' ? 'var(--warning)' : 'transparent',
            color: view === 'post' ? 'white' : 'var(--text-muted)',
            fontWeight: 600,
            border: view === 'post' ? 'none' : '1px solid var(--border)'
          }}>
          Post-Flood Recovery Record
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Rank</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Address</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Risk Basis</th>
              {view === 'pre' ? (
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'right' }}>Event Action</th>
              ) : (
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Outcome</th>
              )}
            </tr>
          </thead>
          <tbody>
            {households.map((hh) => {
              const isPredictedAndAffected = view === 'post' && hh.predicted_at_risk && hh.affected_status === 'confirmed_affected';
              
              return (
                <tr key={hh.id} className="transition-all" style={{ 
                  borderBottom: '1px solid var(--border)', 
                  backgroundColor: isPredictedAndAffected ? 'var(--warning-light)' : 'transparent' 
                }}>
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>#{hh.risk_rank}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{hh.address_label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {hh.id}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span className="badge normal">Elev: {hh.elevation_m}m</span>
                      {hh.ground_floor && <span className="badge warning">Ground Flr</span>}
                      {hh.predicted_at_risk && <span className="badge danger">At Risk</span>}
                    </div>
                  </td>
                  
                  {view === 'pre' ? (
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', backgroundColor: 'var(--bg-app)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                        <button 
                          onClick={() => handleMarkAffected(hh.id, 'confirmed_affected')}
                          className="transition-all"
                          style={{
                            padding: '0.5rem', borderRadius: '0.25rem',
                            backgroundColor: hh.affected_status === 'confirmed_affected' ? 'var(--danger-light)' : 'transparent',
                            color: hh.affected_status === 'confirmed_affected' ? 'var(--danger)' : 'var(--text-muted)',
                          }} title="Mark as Flooded/Affected"
                        >
                          <AlertCircle size={20} />
                        </button>
                        <button 
                          onClick={() => handleMarkAffected(hh.id, 'confirmed_dry')}
                          className="transition-all"
                          style={{
                            padding: '0.5rem', borderRadius: '0.25rem',
                            backgroundColor: hh.affected_status === 'confirmed_dry' ? 'var(--success-light)' : 'transparent',
                            color: hh.affected_status === 'confirmed_dry' ? 'var(--success)' : 'var(--text-muted)',
                          }} title="Mark as Safe/Dry"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                      </div>
                    </td>
                  ) : (
                    <td style={{ padding: '1rem' }}>
                      {hh.affected_status === 'confirmed_affected' ? (
                         <span className="badge danger" style={{ padding: '0.5rem 0.75rem' }}><AlertCircle size={14} style={{ marginRight: '0.25rem' }}/> Affected</span>
                      ) : hh.affected_status === 'confirmed_dry' ? (
                         <span className="badge success" style={{ padding: '0.5rem 0.75rem' }}><CheckCircle2 size={14} style={{ marginRight: '0.25rem' }}/> Dry</span>
                      ) : (
                         <span className="badge normal" style={{ padding: '0.5rem 0.75rem' }}><CircleDashed size={14} style={{ marginRight: '0.25rem' }}/> Unmarked</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
