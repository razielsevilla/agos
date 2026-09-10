import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, MapPin, ArrowRight } from 'lucide-react';
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

  if (loading) return <div style={{ padding: '2rem' }}>Loading live sensors...</div>;

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
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-main)' }}>City Overview</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Monitoring all {Object.keys(byBarangay).length} neighborhoods and {streets.length} streets
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {PRIORITY_LEVELS.map((level) => {
          const Icon = level.icon;
          const count = streets.filter(s => priorityForScore(s.risk_score).key === level.key).length;
          return (
            <div
              key={level.key}
              className="card transition-all"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${level.badgeClass}`}>
                  <Icon size={13} /> {level.shortLabel}
                </span>
                <HelpTip text={level.tooltip} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                <span style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>{count}</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>street{count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>

      {urgentCount > 0 && (
        <div style={{
          borderLeft: '2px solid var(--danger)',
          padding: '0.125rem 0 0.125rem 1rem',
          marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--danger)', fontSize: '0.9375rem', marginBottom: '0.125rem', fontWeight: 700 }}>Action Required</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{urgentCount} street(s) are at Critical or High Risk based on current conditions. Pre-disaster alerts may be necessary.</p>
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
                padding: '1.25rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <MapPin size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>{barangay}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {streetCount} street{streetCount !== 1 ? 's' : ''} monitored
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '0.25rem' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Peak Flood Risk
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>{pct}%</div>
                </div>
                <span className={`badge ${level.badgeClass}`}>
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
