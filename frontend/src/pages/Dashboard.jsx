import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, MapPin, ArrowRight, ShieldAlert } from 'lucide-react';
import HelpTip from '../components/HelpTip';
import { PRIORITY_LEVELS, priorityForScore } from '../lib/priority';

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

  const urgentCount = streets.filter(s => ['critical', 'high'].includes(priorityForScore(s.risk_score).key)).length;

  // Group streets by barangay. Each barangay is one card, keyed off its
  // highest-hazard street (there's a 1:1 barangay:street mapping today,
  // but this holds up if a barangay ever gets more than one).
  const byBarangay = {};
  streets.forEach(s => {
    (byBarangay[s.barangay] ||= []).push(s);
  });

  const barangayGroups = Object.entries(byBarangay)
    .map(([barangay, streetList]) => {
      const sorted = [...streetList].sort((a, b) => b.risk_score - a.risk_score);
      return { barangay, topStreet: sorted[0], streetCount: sorted.length };
    })
    .sort((a, b) => b.topStreet.risk_score - a.topStreet.risk_score);

  return (
    <div>
      <header style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div className="icon-circle" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', width: '3rem', height: '3rem' }}>
          <ShieldAlert size={22} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Active Surveillance</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.125rem', fontSize: '0.875rem' }}>
            All 18 barangays &middot; {streets.length} streets monitored &middot; current priority level per area
          </p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {PRIORITY_LEVELS.map((level) => {
          const Icon = level.icon;
          const count = streets.filter(s => priorityForScore(s.risk_score).key === level.key).length;
          return (
            <div
              key={level.key}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
                borderTop: `3px solid ${level.mapColor}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="icon-circle" style={{ backgroundColor: level.tintBg }}>
                  <Icon size={18} color={level.mapColor} />
                </div>
                <HelpTip text={level.tooltip} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{count}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>street{count !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: level.mapColor, marginTop: '0.125rem' }}>{level.shortLabel}</div>
              </div>
            </div>
          );
        })}
      </div>

      {urgentCount > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, var(--danger-light), #fff)',
          border: '1px solid #fecaca',
          borderLeft: '4px solid var(--danger)',
          borderRadius: '0.75rem',
          padding: '1.125rem 1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div className="icon-circle" style={{ backgroundColor: 'var(--danger-light)' }}>
            <AlertTriangle color="var(--danger)" size={20} />
          </div>
          <div>
            <h3 style={{ color: 'var(--danger)', fontSize: '1rem', marginBottom: '0.125rem' }}>Action Required</h3>
            <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>{urgentCount} street(s) are at Critical or High Risk based on fused hazard data. Pre-flood alerts may be necessary.</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {barangayGroups.map(({ barangay, topStreet, streetCount }) => {
          const level = priorityForScore(topStreet.risk_score);
          const Icon = level.icon;
          const pct = Math.round(topStreet.risk_score);
          return (
            <Link
              key={barangay}
              to={`/barangay/${encodeURIComponent(barangay)}`}
              className="card transition-all"
              style={{
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                padding: '1.25rem',
                borderLeft: `4px solid ${level.mapColor}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <MapPin size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '1.1875rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.25 }}>{barangay}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {streetCount} street{streetCount !== 1 ? 's' : ''} monitored
                  </div>
                </div>
                <ArrowRight size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '0.25rem' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Highest Hazard
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{pct}%</div>
                </div>
                <span className={`badge ${level.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Icon size={12} /> {level.shortLabel}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
