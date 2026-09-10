import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, Navigation, AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react';
import HelpTip from '../components/HelpTip';
import { priorityForScore } from '../lib/priority';

// Three stages of the closing-the-loop workflow (docs/scope.md):
//   pre    — before the flood: read-only priority list for evacuation planning
//   active — during the flood: operators confirm each household affected/dry
//   post   — after the flood: recovery-priority record from what was confirmed
const STAGES = [
  { key: 'pre', label: 'Pre-Flood Priority List' },
  { key: 'active', label: 'Mid-Flood Response' },
  { key: 'post', label: 'Post-Flood Recovery Record' },
];

export default function StreetDetail() {
  const { streetId } = useParams();
  const [street, setStreet] = useState(null);
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('pre');

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

  const goToStage = async (key) => {
    setStage(key);
    if (key === 'post') {
      try {
        const data = await api.getRecoveryRecord(streetId);
        setHouseholds(data);
      } catch (err) {
        console.error(err);
      }
    } else {
      loadData();
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

  const level = priorityForScore(street.risk_score);
  const Icon = level.icon;
  const isUrgent = level.key === 'critical' || level.key === 'high';

  return (
    <div>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: 500 }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{street.name}</h2>
            <span className={`badge ${level.badgeClass}`} style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <Icon size={14} /> {level.label}
              <HelpTip text={level.tooltip} />
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Camera: {street.camera_label}</p>
        </div>

        {isUrgent && (
          <Link to={`/streets/${street.id}/alert`} className="transition-all" style={{
            backgroundColor: 'var(--danger)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: 'var(--shadow)'
          }}>
            <AlertCircle size={18} /> View Alert Payload
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        {STAGES.map(s => (
          <button
            key={s.key}
            onClick={() => goToStage(s.key)}
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
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Address</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                Hazard Basis
                <HelpTip text="Why this household was ranked this way: how low it sits and whether it's on the ground floor." />
              </th>
              {stage === 'active' ? (
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Confirm Status
                </th>
              ) : stage === 'post' ? (
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Outcome</th>
              ) : (
                <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Status</th>
              )}
            </tr>
          </thead>
          <tbody>
            {households.map((hh) => {
              const isPredictedAndAffected = stage === 'post' && hh.predicted_at_risk && hh.affected_status === 'confirmed_affected';

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
                      {hh.predicted_at_risk && (
                        <span className="badge danger" style={{ display: 'inline-flex', alignItems: 'center' }}>
                          Priority Household
                          <HelpTip text="Modeled among the first households that would need evacuation assistance if this street floods." />
                        </span>
                      )}
                    </div>
                  </td>

                  {stage === 'active' ? (
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
                  ) : stage === 'post' ? (
                    <td style={{ padding: '1rem' }}>
                      {hh.affected_status === 'confirmed_affected' ? (
                         <span className="badge danger"><AlertCircle size={14} /> Affected</span>
                      ) : hh.affected_status === 'confirmed_dry' ? (
                         <span className="badge success"><CheckCircle2 size={14} /> Dry</span>
                      ) : (
                         <span className="badge normal"><CircleDashed size={14} /> Unmarked</span>
                      )}
                    </td>
                  ) : (
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Not yet monitored — this list is for planning ahead of the flood.
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
