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
    label: 'Before Flood',
    phase: 'Early Warning',
    description: 'Predicts which streets might flood so you can prepare before water levels rise.',
    icon: Radar,
  },
  {
    key: 'active',
    label: 'During Flood',
    phase: 'Active Response',
    description: 'Live updates to help you dispatch rescue teams and send alerts to the most dangerous areas.',
    icon: Zap,
  },
  {
    key: 'post',
    label: 'After Flood',
    phase: 'Recovery & Reports',
    description: 'Save a record of the flood to help plan relief distribution and repairs.',
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

      <header style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <MapPin size={20} color="var(--text-muted)" />
        <div>
          <h2 style={{ color: 'var(--text-main)' }}>{decodedName}</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.125rem', fontSize: '0.875rem' }}>
            {streets.length} monitored street{streets.length !== 1 ? 's' : ''} in this area, ordered by risk
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

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.125rem 0 1.25rem 1rem',
        marginBottom: '1.25rem',
        borderLeft: '2px solid var(--primary)',
      }}>
        <StageIcon size={16} color="var(--primary)" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>{currentStage.phase}</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{currentStage.description}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {streets.map((street, i) => {
          const level = priorityForScore(street.risk_score);
          const Icon = level.icon;
          const pct = Math.round(street.risk_score);
          return (
            <div key={street.id} className="card transition-all" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: '1 1 min-content' }}>
                <div style={{
                  width: '3rem', height: '3rem', borderRadius: '50%',
                  backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1.125rem', border: '2px solid var(--border)'
                }}>
                  #{i + 1}
                </div>
                <div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{street.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>ID: {street.id}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: '2 1 min-content', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>Flood Risk</span>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{pct}%</span>
                    <span className={`badge ${level.badgeClass}`} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                      <Icon size={14} /> {level.shortLabel}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '220px' }}>
                  {stage === 'active' ? (
                    (() => {
                      const op = OPERATIONAL_STATUS[level.key];
                      const OpIcon = op.icon;
                      return (
                        <span className={`badge ${op.badgeClass}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                          <OpIcon size={16} /> {op.label}
                        </span>
                      );
                    })()
                  ) : stage === 'post' ? (
                    <button
                      onClick={() => handleDownloadPdna(street)}
                      disabled={downloadingId === street.id}
                      className="btn-solid"
                      style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', minWidth: 'auto' }}
                      title="Downloads a spreadsheet with location and damage estimates."
                    >
                      {downloadingId === street.id ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <Download size={16} />
                      )}
                      Download Damage Report
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', alignItems: 'flex-end' }}>
                      <span className="badge success" style={{ opacity: 0.9 }}>
                        <Bell size={12} /> Automated Alert Sent
                      </span>
                      {escalatedIds.has(street.id) ? (
                        <span className="badge danger" style={{ padding: '0.5rem 0.875rem' }}>
                          <CheckCircle2 size={14} /> Escalated to Rescue
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleEscalated(street.id)}
                          className="btn-solid danger"
                          style={{ padding: '0.5rem 1rem', minWidth: 'auto', fontSize: '0.85rem' }}
                        >
                          <Siren size={14} /> Alert Rescue
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
