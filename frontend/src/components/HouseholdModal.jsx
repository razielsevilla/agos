import { useState, useEffect } from 'react';
import { X, LifeBuoy, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../api';

// Opened from BarangayDetail's Mid-Flood tab by clicking a street. This is
// the REAL data-entry point for the whole closing-the-loop workflow: every
// mark here is a genuine PATCH /households/{id} call (api.updateHousehold),
// so "where does this number come from" always has a real answer.
//
// This does NOT ask "is this household flooded" — a street already flagged
// Critical/High implies that for all its households; re-confirming it here
// would be redundant. What's genuinely uncertain, and varies household by
// household (unlike flooding), is whether each one has actually been
// reached and gotten to safety yet, and what condition their home was left
// in — two different questions, asked by two different people on the
// ground at two different points in the response, so they get their own
// tabs instead of being crammed into one row:
//
// - Evacuation is the time-critical, rescue-triage question a dispatcher
//   asks while the response is still active: who's safe, who's still out
//   there. It's the tab that matters minute-to-minute.
// - Damage is the slower, assessment-team question, usually only answerable
//   once a household has actually been reached (evacuated or confirmed
//   unable to) — it feeds the post-flood recovery report, not the rescue.
const EVACUATION_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: LifeBuoy, activeColor: 'var(--text-muted)' },
  { value: 'evacuated', label: 'Evacuated', icon: CheckCircle2, activeColor: 'var(--success)' },
  { value: 'unable_to_evacuate', label: 'Unable to Evacuate', icon: XCircle, activeColor: 'var(--danger)' },
];

const DAMAGE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'minor', label: 'Minor' },
  { value: 'severe', label: 'Severe' },
];

const EVAC_BADGE = {
  pending: { label: 'Pending', color: 'var(--text-muted)' },
  evacuated: { label: 'Evacuated', color: 'var(--success)' },
  unable_to_evacuate: { label: 'Unable to Evacuate', color: 'var(--danger)' } };

const TABS = [
  { key: 'evacuation', label: 'Evacuation', icon: LifeBuoy },
  { key: 'damage', label: 'Damage', icon: AlertTriangle },
];

function StatChip({ label, value, color }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: '90px', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-app)' }}>
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: color || 'var(--text-main)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{label}</div>
    </div>
  );
}

export default function HouseholdModal({ street, onClose }) {
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState('evacuation');

  useEffect(() => {
    let cancelled = false;
    api.getHouseholds(street.id)
      .then(data => { if (!cancelled) setHouseholds(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [street.id]);

  const handleUpdate = async (id, updates) => {
    setUpdatingId(id);
    try {
      const updated = await api.updateHousehold(id, updates);
      setHouseholds(prev => prev.map(h => (h.id === id ? updated : h)));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const total = households.length;
  const pendingCount = households.filter(h => h.evacuation_status === 'pending').length;
  const evacuatedCount = households.filter(h => h.evacuation_status === 'evacuated').length;
  const unableCount = households.filter(h => h.evacuation_status === 'unable_to_evacuate').length;
  const priorityPending = households.filter(h => h.predicted_at_risk && h.evacuation_status !== 'evacuated').length;

  const noneCount = households.filter(h => h.damage_level === 'none').length;
  const minorCount = households.filter(h => h.damage_level === 'minor').length;
  const severeCount = households.filter(h => h.damage_level === 'severe').length;
  const unassessedCount = households.filter(h => !h.damage_level).length;

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1.5rem' }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: '680px', width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '1.25rem 1.5rem 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>{street.name}</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                Real-time rescue tracking and damage assessment for this street's households.
              </p>
            </div>
            <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: '0.375rem', color: 'var(--text-muted)', flexShrink: 0 }} title="Close">
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {TABS.map(tab => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.625rem 1rem', fontSize: '0.85rem', fontWeight: 600,
                    color: active ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                    marginBottom: '-1px' }}
                >
                  <TabIcon size={15} />
                  {tab.label}
                  {tab.key === 'evacuation' && total > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{evacuatedCount}/{total}</span>
                  )}
                  {tab.key === 'damage' && total > 0 && unassessedCount > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>{unassessedCount} unassessed</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={20} className="spin" />
            </div>
          ) : households.length === 0 ? (
            <p style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No households recorded for this street.</p>
          ) : activeTab === 'evacuation' ? (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem 0' }}>
                <StatChip label="Pending" value={pendingCount} />
                <StatChip label="Evacuated" value={evacuatedCount} color="var(--success)" />
                <StatChip label="Unable to Evacuate" value={unableCount} color="var(--danger)" />
              </div>
              {priorityPending > 0 && (
                <div style={{ margin: '0.875rem 1.5rem 0', padding: '0.625rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={14} /> {priorityPending} priority household{priorityPending !== 1 ? 's' : ''} still not evacuated
                </div>
              )}

              {households.map(hh => (
                <div key={hh.id} style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.625rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{hh.address_label}</div>
                      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        <span className="badge normal" style={{ fontSize: '0.7rem' }}>Elev: {hh.elevation_m}m</span>
                        {hh.ground_floor && <span className="badge warning" style={{ fontSize: '0.7rem' }}>Ground Flr</span>}
                        {hh.predicted_at_risk && <span className="badge danger" style={{ fontSize: '0.7rem' }}>Priority</span>}
                      </div>
                    </div>
                    {updatingId === hh.id && <Loader2 size={16} className="spin" style={{ flexShrink: 0 }} />}
                  </div>

                  <div style={{ display: 'inline-flex', gap: '0.25rem', backgroundColor: 'var(--bg-app)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                    {EVACUATION_OPTIONS.map(opt => {
                      const OptIcon = opt.icon;
                      const active = hh.evacuation_status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleUpdate(hh.id, { evacuation_status: opt.value })}
                          title={opt.label}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.3rem',
                            padding: '0.4rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600,
                            backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                            color: active ? opt.activeColor : 'var(--text-muted)',
                            boxShadow: active ? 'var(--shadow-sm)' : 'none' }}
                        >
                          <OptIcon size={14} /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 1.5rem 0' }}>
                <StatChip label="Unassessed" value={unassessedCount} />
                <StatChip label="None" value={noneCount} color="var(--success)" />
                <StatChip label="Minor" value={minorCount} color="var(--warning)" />
                <StatChip label="Severe" value={severeCount} color="var(--danger)" />
              </div>
              <p style={{ margin: '0.875rem 1.5rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Record what field teams observe once a household has been reached — this is what the Post-Flood recovery report is built from.
              </p>

              {households.map(hh => {
                const evac = EVAC_BADGE[hh.evacuation_status] || EVAC_BADGE.pending;
                return (
                  <div key={hh.id} style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.625rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>{hh.address_label}</div>
                        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="badge normal" style={{ fontSize: '0.7rem' }}>Elev: {hh.elevation_m}m</span>
                          {hh.ground_floor && <span className="badge warning" style={{ fontSize: '0.7rem' }}>Ground Flr</span>}
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: evac.color }}>{evac.label}</span>
                        </div>
                      </div>
                      {updatingId === hh.id && <Loader2 size={16} className="spin" style={{ flexShrink: 0 }} />}
                    </div>

                    <div style={{ display: 'inline-flex', gap: '0.25rem', backgroundColor: 'var(--bg-app)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                      {DAMAGE_OPTIONS.map(opt => {
                        const active = hh.damage_level === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => handleUpdate(hh.id, { damage_level: opt.value })}
                            style={{
                              padding: '0.4rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: active ? 'var(--bg-surface)' : 'transparent',
                              color: active ? 'var(--text-main)' : 'var(--text-muted)',
                              boxShadow: active ? 'var(--shadow-sm)' : 'none' }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
