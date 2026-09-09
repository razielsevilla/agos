import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, MapPin, Radar, Zap, ClipboardCheck, Download, Loader2, LifeBuoy, Footprints, Clock, Eye, Bell, Siren, CheckCircle2 } from 'lucide-react';
import HelpTip from '../components/HelpTip';
import { priorityForScore } from '../lib/priority';
import { downloadPdnaCsv } from '../lib/pdnaExport';

// Illustrative operational status per priority tier, shown during the
// "During Flood Response" stage — there's no real dispatch-tracking backend,
// so this is a display-only readout derived from the same hazard score
// already computed for the street, not separately fabricated per-street data.
const OPERATIONAL_STATUS = {
  critical: { label: 'Rescue Team Deployed', icon: LifeBuoy, badgeClass: 'danger' },
  high: { label: 'Ongoing Evacuation', icon: Footprints, badgeClass: 'warning' },
  moderate: { label: 'On Standby', icon: Clock, badgeClass: 'primary' },
  low: { label: 'Monitoring', icon: Eye, badgeClass: 'normal' },
};

// Same three-stage concept as the (temporarily disabled) per-street household
// view, but ranking this barangay's STREETS instead of one street's
// households. All three stages read the same live hazard data — unlike
// households, streets have no per-item "mark affected/dry" action in the
// backend, so there's no separate mutable state to show per stage.
const STAGES = [
  {
    key: 'pre',
    label: 'Pre-Flood Priority List',
    phase: 'Pre-Disaster — Early Warning & Vulnerability Ranking',
    description: 'Rainfall input is fused with street elevation data to predict flood onset and rank at-risk areas before water levels rise.',
    icon: Radar,
  },
  {
    key: 'active',
    label: 'During Flood Response',
    phase: 'Mid-Disaster — Real-Time Operational Response',
    description: 'Live hazard scores stream to this dashboard so responders can dispatch targeted alerts and log verified conditions in a single click.',
    icon: Zap,
  },
  {
    key: 'post',
    label: 'Post-Flood Recovery Record',
    phase: 'Post-Disaster — Closing the Loop & Recovery',
    description: 'This ranking becomes a timestamped record the LGU can use to prioritize relief distribution and rehabilitation without running manual surveys from scratch.',
    icon: ClipboardCheck,
  },
];

export default function BarangayDetail() {
  const { barangayName } = useParams();
  const decodedName = decodeURIComponent(barangayName);
  const [streets, setStreets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('pre');
  const [downloadingId, setDownloadingId] = useState(null);
  // Mock-only: no backend endpoint for escalation, local UI state that
  // resets on refresh — same spirit as the alert payload mock elsewhere.
  const [escalatedIds, setEscalatedIds] = useState(new Set());

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

  const currentStage = STAGES.find(s => s.key === stage);
  const StageIcon = currentStage.icon;

  const stageStatusText = {
    post: 'Recovery prioritization uses the same ranking, highest hazard first.',
  }[stage];

  const toggleEscalated = (streetId) => {
    setEscalatedIds(prev => {
      const next = new Set(prev);
      next.has(streetId) ? next.delete(streetId) : next.add(streetId);
      return next;
    });
  };

  const handleDownloadPdna = async (street) => {
    setDownloadingId(street.id);
    try {
      const households = await api.getHouseholds(street.id);
      downloadPdnaCsv(street, households);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
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

      <div className="card" style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.875rem',
        padding: '1.125rem 1.25rem',
        marginBottom: '1.25rem',
        backgroundColor: 'var(--primary-light)',
        border: '1px solid #bfdbfe',
      }}>
        <div className="icon-circle" style={{ backgroundColor: 'var(--bg-surface)', width: '2.25rem', height: '2.25rem', flexShrink: 0 }}>
          <StageIcon size={18} color="var(--primary)" />
        </div>
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{currentStage.phase}</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{currentStage.description}</p>
        </div>
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
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: stage === 'post' ? 'right' : 'left' }}>
                {stage === 'active' ? 'Operational Status' : stage === 'post' ? 'PDNA Sample Report' : 'Alert Status'}
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
                    <td style={{ padding: '1rem' }}>
                      {(() => {
                        const op = OPERATIONAL_STATUS[level.key];
                        const OpIcon = op.icon;
                        return (
                          <span className={`badge ${op.badgeClass}`} style={{ padding: '0.5rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            <OpIcon size={14} /> {op.label}
                          </span>
                        );
                      })()}
                    </td>
                  ) : stage === 'post' ? (
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDownloadPdna(street)}
                        disabled={downloadingId === street.id}
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
                          opacity: downloadingId === street.id ? 0.7 : 1,
                        }}
                        title="Downloads a CSV: household/location/elevation fields are real; damage, needs, and relief-status fields are synthetic demo data, clearly labeled (SYNTHETIC) in every column — not a real survey result."
                      >
                        {downloadingId === street.id ? (
                          <Loader2 size={14} className="spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        Download PDNA Sample
                      </button>
                    </td>
                  ) : stage === 'post' ? (
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {stageStatusText}
                    </td>
                  ) : (
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span className="badge success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Bell size={12} /> Automated Alert Sent
                        </span>
                        {escalatedIds.has(street.id) ? (
                          <span className="badge danger" style={{ padding: '0.5rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                            <CheckCircle2 size={14} /> Escalated to Rescue & Authorities
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleEscalated(street.id)}
                            className="transition-all"
                            style={{
                              padding: '0.5rem 0.875rem',
                              borderRadius: '0.375rem',
                              backgroundColor: 'var(--danger)',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.8125rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                            }}
                          >
                            <Siren size={14} /> Alert Rescue & Authorities
                          </button>
                        )}
                      </div>
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
