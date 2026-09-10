import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, MapPin, Radar, Zap, ClipboardCheck, LifeBuoy, Bell, Siren, CheckCircle2, XCircle, AlertCircle, FileText, Users, TrendingUp, ChevronRight, Loader2 } from 'lucide-react';
import { priorityForScore } from '../lib/priority';
import HouseholdModal from '../components/HouseholdModal';

// Same three-stage concept as the (temporarily disabled) per-street household
// view, but ranking this barangay's STREETS instead of one street's
// households. The two earlier stages automate different things,
// deliberately:
//   Pre-Flood:  the ALERT/notification is what's automated (moderate risk
//               and above auto-sends; low risk gets a manual override,
//               since that's the one band the system might get wrong).
//   Mid-Flood:  the RESPONSE itself is never automated, at any tier —
//               CDRRMO's actual dispatch coordination is a manual
//               phone/radio process, so an automated alert going out does
//               NOT mean a rescue team has been mobilized. Every street
//               needs a human to click "Initiate Response". Mid-Flood is
//               ALSO where real ground-truth data enters the system: click
//               a street to confirm its households (HouseholdModal, a real
//               PATCH /households/{id} call) — the Post-Flood report below
//               is built entirely from that, not from anything invented.
const STAGES = [
  {
    key: 'pre',
    label: 'Pre-Flood',
    phase: 'Early Warning',
    description: 'Predicts which streets might flood so you can prepare before water levels rise.',
    icon: Radar,
  },
  {
    key: 'active',
    label: 'Mid-Flood',
    phase: 'Active Response',
    description: 'Click a street to confirm household status as field reports come in, and track its response operation.',
    icon: Zap,
  },
  {
    key: 'post',
    label: 'Post-Flood',
    phase: 'Recovery & Reports',
    description: 'A barangay-wide recovery report built from what was actually confirmed during Mid-Flood.',
    icon: ClipboardCheck,
  },
];

// Mid-Flood response lifecycle (mock — no real dispatch-tracking backend,
// same spirit as the Pre-Flood escalation mock below). Every tier starts at
// "pending" and needs a manual "Initiate Response" click — CDRRMO's actual
// dispatch coordination is a manual phone/radio process regardless of risk
// level, so an automated alert going out (Pre-Flood) does NOT mean a rescue
// team has actually been mobilized. Automating the notification is
// reasonable; presuming the response itself already started is not. Once
// initiated, only a human can confirm an operation actually finished, so
// "completed" is always a manual step too. This tracks the RESCUE
// OPERATION's lifecycle — separate from, and complementary to, the
// per-household affected/dry confirmation in HouseholdModal, which is real
// backend data.
const RESPONSE_NEXT_STAGE = { pending: 'ongoing', ongoing: 'completed', completed: 'completed' };

function defaultResponseStage() {
  return 'pending';
}

function StatTile({ icon: Icon, label, value, tint }) {
  return (
    <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <Icon size={14} /> {label}
      </div>
      <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800, color: tint || 'var(--text-main)' }}>{value}</div>
    </div>
  );
}

export default function BarangayDetail() {
  const { barangayName } = useParams();
  const decodedName = decodeURIComponent(barangayName);
  const [streets, setStreets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('pre');
  // Mock-only: no backend endpoint for escalation, local UI state that
  // resets on refresh — same spirit as the alert payload mock elsewhere.
  const [escalatedIds, setEscalatedIds] = useState(new Set());
  // Mid-Flood response lifecycle per street — see RESPONSE_NEXT_STAGE above.
  const [responseStages, setResponseStages] = useState({});
  // Which street's household-confirmation modal is open (Mid-Flood only).
  const [activeHouseholdStreet, setActiveHouseholdStreet] = useState(null);
  // Post-Flood barangay-wide report data — REAL confirmed household status
  // per street (api.getRecoveryRecord, the same backend endpoint
  // StreetDetail.jsx uses), fetched on demand when that tab opens.
  const [recoveryByStreet, setRecoveryByStreet] = useState({});
  const [reportLoading, setReportLoading] = useState(false);

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

  useEffect(() => {
    if (stage !== 'post' || streets.length === 0) return;
    let cancelled = false;
    setReportLoading(true);
    Promise.all(streets.map(s => api.getRecoveryRecord(s.id).then(hh => [s.id, hh])))
      .then(entries => {
        if (!cancelled) setRecoveryByStreet(Object.fromEntries(entries));
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });
    return () => { cancelled = true; };
  }, [stage, streets]);

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

  const getResponseStage = (street) => responseStages[street.id] || defaultResponseStage();
  const advanceResponse = (street) => {
    const current = getResponseStage(street);
    setResponseStages(prev => ({ ...prev, [street.id]: RESPONSE_NEXT_STAGE[current] }));
  };

  // Aggregate barangay-wide recovery report — real evacuation/damage status
  // only. Flood-affected status isn't tracked here at all: a street already
  // flagged Critical/High implies its households were affected, so
  // re-confirming that would be redundant. What's worth aggregating is
  // what's genuinely uncertain and varies per household: has everyone been
  // reached and gotten to safety, and what shape are the houses in.
  let barangayReport = null;
  const perStreetSummary = [];
  if (stage === 'post' && !reportLoading) {
    let total = 0, evacuated = 0, unableToEvacuate = 0, pending = 0;
    let priorityStillNeedingHelp = 0;
    const damageCounts = { none: 0, minor: 0, severe: 0, unassessed: 0 };
    for (const street of streets) {
      const households = recoveryByStreet[street.id] || [];
      let streetEvacuated = 0, streetUnable = 0, streetPending = 0;
      for (const h of households) {
        total++;
        if (h.evacuation_status === 'evacuated') { evacuated++; streetEvacuated++; }
        else if (h.evacuation_status === 'unable_to_evacuate') { unableToEvacuate++; streetUnable++; }
        else { pending++; streetPending++; }

        if (h.predicted_at_risk && h.evacuation_status !== 'evacuated') priorityStillNeedingHelp++;

        damageCounts[h.damage_level || 'unassessed']++;
      }
      if (households.length > 0) {
        perStreetSummary.push({ street, evacuated: streetEvacuated, unable: streetUnable, pending: streetPending });
      }
    }
    if (total > 0) {
      barangayReport = { total, evacuated, unableToEvacuate, pending, priorityStillNeedingHelp, damageCounts };
    }
  }

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

      {stage === 'post' && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
            <FileText size={20} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{decodedName} — Post-Flood Recovery Report</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Built entirely from household status confirmed during Mid-Flood — not estimated or invented. Every number below traces back to a specific household an operator marked.
              </p>
            </div>
          </div>

          {reportLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <Loader2 size={16} className="spin" /> Compiling barangay report...
            </div>
          ) : !barangayReport ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No household data available for this barangay.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatTile icon={Users} label="Households Tracked" value={barangayReport.total} />
                <StatTile icon={CheckCircle2} label="Evacuated" value={barangayReport.evacuated} tint="var(--success)" />
                <StatTile icon={XCircle} label="Unable to Evacuate" value={barangayReport.unableToEvacuate} tint={barangayReport.unableToEvacuate > 0 ? 'var(--danger)' : undefined} />
                <StatTile icon={LifeBuoy} label="Pending Contact" value={barangayReport.pending} tint={barangayReport.pending > 0 ? 'var(--warning)' : undefined} />
              </div>

              {barangayReport.priorityStillNeedingHelp > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1rem', backgroundColor: 'var(--danger-light)', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                  <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
                  {barangayReport.priorityStillNeedingHelp} modeled priority household{barangayReport.priorityStillNeedingHelp !== 1 ? 's' : ''} in this barangay {barangayReport.priorityStillNeedingHelp !== 1 ? "haven't" : "hasn't"} been evacuated yet — the model flagged {barangayReport.priorityStillNeedingHelp !== 1 ? 'these as' : 'this as a'} highest-vulnerability. Switch to Mid-Flood to follow up.
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  <TrendingUp size={14} /> Damage Observed
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                    — as reported at point of rescue contact, not a full assessment
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-app)', borderRadius: '0.375rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>None</span>
                    <span style={{ fontWeight: 600 }}>{barangayReport.damageCounts.none}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-app)', borderRadius: '0.375rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Minor</span>
                    <span style={{ fontWeight: 600 }}>{barangayReport.damageCounts.minor}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-app)', borderRadius: '0.375rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Severe</span>
                    <span style={{ fontWeight: 600 }}>{barangayReport.damageCounts.severe}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-app)', borderRadius: '0.375rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Not yet assessed</span>
                    <span style={{ fontWeight: 600 }}>{barangayReport.damageCounts.unassessed}</span>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>Per-Street Breakdown</div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Street</th>
                        <th style={{ padding: '0.625rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Evacuated</th>
                        <th style={{ padding: '0.625rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Unable</th>
                        <th style={{ padding: '0.625rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perStreetSummary.map(({ street, evacuated, unable, pending }) => (
                        <tr key={street.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.625rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>{street.name}</td>
                          <td style={{ padding: '0.625rem 1rem', textAlign: 'right', color: evacuated > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{evacuated}</td>
                          <td style={{ padding: '0.625rem 1rem', textAlign: 'right', color: unable > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{unable}</td>
                          <td style={{ padding: '0.625rem 1rem', textAlign: 'right', color: pending > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{pending}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {streets.map((street, i) => {
          const level = priorityForScore(street.risk_score);
          const Icon = level.icon;
          const pct = Math.round(street.risk_score);
          const clickable = stage === 'active';
          return (
            <div
              key={street.id}
              className="card transition-all"
              onClick={clickable ? () => setActiveHouseholdStreet(street) : undefined}
              style={{
                padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '1rem', cursor: clickable ? 'pointer' : 'default',
              }}
            >
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-main)' }}>{street.name}</span>
                    {clickable && <ChevronRight size={16} color="var(--text-muted)" />}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
                    ID: {street.id}{clickable && ' · Click to confirm households'}
                  </div>
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

                {stage !== 'post' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '220px' }}>
                    {stage === 'active' ? (() => {
                      const rStage = getResponseStage(street);
                      if (rStage === 'pending') {
                        return (
                          <button
                            onClick={(e) => { e.stopPropagation(); advanceResponse(street); }}
                            className="btn-solid danger"
                            style={{ padding: '0.5rem 1rem', minWidth: 'auto', fontSize: '0.85rem' }}
                          >
                            <LifeBuoy size={14} /> Initiate Response
                          </button>
                        );
                      }
                      if (rStage === 'ongoing') {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', alignItems: 'flex-end' }}>
                            <span className="badge warning">
                              <Zap size={12} /> Response Ongoing
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); advanceResponse(street); }}
                              className="btn-solid"
                              style={{ padding: '0.5rem 1rem', minWidth: 'auto', fontSize: '0.85rem' }}
                            >
                              <CheckCircle2 size={14} /> Mark as Completed
                            </button>
                          </div>
                        );
                      }
                      return (
                        <span className="badge success">
                          <CheckCircle2 size={14} /> Response Completed
                        </span>
                      );
                    })() : level.key === 'low' ? (
                      /* Low risk gets no automated alert — the system isn't
                         confident enough at this tier to fire one on its own,
                         so it's a manual call for an operator who sees
                         something on the ground to make. */
                      escalatedIds.has(street.id) ? (
                        <span className="badge danger" style={{ padding: '0.5rem 0.875rem' }}>
                          <CheckCircle2 size={14} /> Escalated to Rescue
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleEscalated(street.id); }}
                          className="btn-solid danger"
                          style={{ padding: '0.5rem 1rem', minWidth: 'auto', fontSize: '0.85rem' }}
                        >
                          <Siren size={14} /> Alert & Rescue
                        </button>
                      )
                    ) : (
                      <span className="badge success" style={{ opacity: 0.9 }}>
                        <Bell size={12} /> Automated Alert Sent
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeHouseholdStreet && (
        <HouseholdModal street={activeHouseholdStreet} onClose={() => setActiveHouseholdStreet(null)} />
      )}
    </div>
  );
}
