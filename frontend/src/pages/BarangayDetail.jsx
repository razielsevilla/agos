import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, MapPin, Send, CheckCircle2 } from 'lucide-react';
import HelpTip from '../components/HelpTip';
import { priorityForScore } from '../lib/priority';

// Same three-stage concept as the (temporarily disabled) per-street household
// view, but ranking this barangay's STREETS instead of one street's
// households. All three stages read the same live hazard data — unlike
// households, streets have no per-item "mark affected/dry" action in the
// backend, so there's no separate mutable state to show per stage.
const STAGES = [
  { key: 'pre', label: 'Pre-Flood Priority List' },
  { key: 'active', label: 'During Flood Response' },
  { key: 'post', label: 'Post-Flood Recovery Record' },
];

export default function BarangayDetail() {
  const { barangayName } = useParams();
  const decodedName = decodeURIComponent(barangayName);
  const [streets, setStreets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('pre');
  // Mock-only: no backend endpoint for street-level notification, so this is
  // local UI state that resets on refresh — same spirit as the "Disseminate
  // Alert via SMS" button on the alert payload mock.
  const [notifiedIds, setNotifiedIds] = useState(new Set());

  useEffect(() => {
    api.getStreets()
      .then(data => {
        setStreets(
          data
            .filter(s => s.barangay === decodedName)
            .sort((a, b) => b.risk_score - a.risk_score)
        );
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [decodedName]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading streets...</div>;

  const stageStatusText = {
    pre: 'Not yet monitored — this list is for planning ahead of the flood.',
    post: 'Recovery prioritization uses the same ranking, highest hazard first.',
  }[stage];

  const toggleNotified = (streetId) => {
    setNotifiedIds(prev => {
      const next = new Set(prev);
      next.has(streetId) ? next.delete(streetId) : next.add(streetId);
      return next;
    });
  };

  return (
    <div>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <header style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div className="icon-circle" style={{ backgroundColor: 'var(--primary-light)', width: '3rem', height: '3rem' }}>
          <MapPin size={22} color="var(--primary)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{decodedName}</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.125rem', fontSize: '0.875rem' }}>
            {streets.length} monitored street{streets.length !== 1 ? 's' : ''} in this barangay, ranked by hazard
          </p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        {STAGES.map(s => (
          <button
            key={s.key}
            onClick={() => setStage(s.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: stage === s.key ? 'var(--primary)' : 'transparent',
              color: stage === s.key ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              border: stage === s.key ? 'none' : '1px solid var(--border)'
            }}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Priority #</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Street</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                Hazard Basis
                <HelpTip text="Fused hazard score and priority level for this street, computed from the illustrative rainfall input." />
              </th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: stage === 'active' ? 'right' : 'left' }}>
                {stage === 'active' ? 'Action' : 'Status'}
              </th>
            </tr>
          </thead>
          <tbody>
            {streets.map((street, i) => {
              const level = priorityForScore(street.risk_score);
              const Icon = level.icon;
              const pct = Math.round(street.risk_score);
              return (
                <tr key={street.id} className="transition-all" style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>#{i + 1}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{street.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {street.id}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>{pct}%</span>
                      <span className={`badge ${level.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Icon size={12} /> {level.shortLabel}
                      </span>
                    </div>
                  </td>
                  {stage === 'active' ? (
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {notifiedIds.has(street.id) ? (
                        <span className="badge success" style={{ padding: '0.5rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <CheckCircle2 size={14} /> Notified
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleNotified(street.id)}
                          className="transition-all"
                          style={{
                            padding: '0.5rem 0.875rem',
                            borderRadius: '0.375rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                          }}
                        >
                          <Send size={14} /> Notify Barangay
                        </button>
                      )}
                    </td>
                  ) : (
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {stageStatusText}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
