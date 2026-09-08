// StreetsPage.jsx — AGOS-017: Flagged street list with risk score
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplets, MapPin, ArrowRight, Activity, AlertTriangle, Eye } from 'lucide-react'

function riskColor(score) {
  if (score >= 60) return '#ef4444'
  if (score >= 30) return '#f59e0b'
  return '#22c55e'
}

function RiskRing({ score }) {
  const r = 22, circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color = riskColor(score)
  return (
    <div className="risk-ring-wrap">
      <div className="risk-ring">
        <svg width="54" height="54" viewBox="0 0 54 54">
          <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle cx="27" cy="27" r={r} fill="none" stroke={color}
            strokeWidth="5" strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <div className="risk-ring-label" style={{ color }}>{score}</div>
      </div>
      <span className="risk-caption">Risk</span>
    </div>
  )
}

function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="badge-dot" />
      {status}
    </span>
  )
}

export default function StreetsPage() {
  const [streets, setStreets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/streets')
      .then(r => r.json())
      .then(data => { setStreets(data); setLoading(false) })
      .catch(() => { setError('Could not load streets. Is the backend running?'); setLoading(false) })
  }, [])

  const flagged = streets.filter(s => s.status === 'flagged').length
  const watch   = streets.filter(s => s.status === 'watch').length

  if (loading) return (
    <div className="page">
      <div className="loading-state"><div className="spinner" /><span>Loading streets…</span></div>
    </div>
  )

  if (error) return (
    <div className="page">
      <div className="empty-state" style={{ color: '#ef4444' }}>
        <AlertTriangle size={32} />
        <span>{error}</span>
      </div>
    </div>
  )

  return (
    <div className="page animate-in">
      <div className="page-header">
        <h1>Streets &amp; Risk Overview</h1>
        <p>Camera-monitored locations with fused rainfall risk scores. Click a street to see household risk ranking.</p>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div className="stat-chip animate-in">
          <span className="stat-value" style={{ color: '#ef4444' }}>{flagged}</span>
          <span className="stat-label">Flagged</span>
        </div>
        <div className="stat-chip animate-in">
          <span className="stat-value" style={{ color: '#f59e0b' }}>{watch}</span>
          <span className="stat-label">Watch</span>
        </div>
        <div className="stat-chip animate-in">
          <span className="stat-value">{streets.length}</span>
          <span className="stat-label">Total Streets</span>
        </div>
      </div>

      <div className="grid-2">
        {streets.map((s, i) => (
          <div
            key={s.id}
            className="card card-clickable street-card animate-in"
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={() => navigate(`/streets/${s.id}`)}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate(`/streets/${s.id}`)}
          >
            <div className="street-card-header">
              <div>
                <div className="street-name">{s.name}</div>
                <div className="street-meta">
                  <MapPin size={11} style={{ display: 'inline', marginRight: 3 }} />
                  {s.barangay}
                </div>
                <div style={{ marginTop: 8 }}>
                  <StatusBadge status={s.status} />
                </div>
              </div>
              <RiskRing score={Math.round(s.risk_score)} />
            </div>

            <div className="divider" style={{ margin: '8px 0' }} />

            <div className="street-card-footer">
              <div className="street-footer-info">
                <Activity size={12} />
                Updated {new Date(s.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#00b4d8', fontWeight: 500 }}>
                <Eye size={13} />
                View households
                <ArrowRight size={14} className="arrow-icon" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {streets.length === 0 && (
        <div className="empty-state"><Droplets size={32} /><span>No streets found.</span></div>
      )}
    </div>
  )
}
