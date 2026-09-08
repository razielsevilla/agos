// HouseholdsPage.jsx — AGOS-018 (ranked list) + AGOS-019 (mark affected)
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Home, Layers, RotateCcw, Bell, AlertTriangle, Check, Droplets } from 'lucide-react'

function riskColor(score) {
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function AffectedBadge({ status }) {
  const labels = { unmarked: 'Unmarked', confirmed_affected: 'Affected', confirmed_dry: 'Dry' }
  return <span className={`affected-badge ${status}`}>{labels[status] || status}</span>
}

export default function HouseholdsPage() {
  const { streetId } = useParams()
  const navigate = useNavigate()

  const [street, setStreet] = useState(null)
  const [households, setHouseholds] = useState([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState({}) // { hhId: true } during PATCH

  useEffect(() => {
    Promise.all([
      fetch(`/api/streets/${streetId}`).then(r => r.json()),
      fetch(`/api/streets/${streetId}/households`).then(r => r.json()),
    ]).then(([s, hh]) => {
      setStreet(s)
      setHouseholds(hh)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [streetId])

  async function markHousehold(hhId, status) {
    setMarking(m => ({ ...m, [hhId]: true }))
    try {
      const res = await fetch(`/api/households/${hhId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affected_status: status }),
      })
      const updated = await res.json()
      setHouseholds(prev => prev.map(h => h.id === hhId ? { ...h, ...updated } : h))
    } finally {
      setMarking(m => { const n = { ...m }; delete n[hhId]; return n })
    }
  }

  if (loading) return (
    <div className="page"><div className="loading-state"><div className="spinner" /><span>Loading households…</span></div></div>
  )

  const statusColor = { flagged: '#ef4444', watch: '#f59e0b', normal: '#22c55e' }
  const atRisk = households.filter(h => h.predicted_at_risk).length
  const marked = households.filter(h => h.affected_status !== 'unmarked').length

  return (
    <div className="page animate-in">
      <button className="back-link" onClick={() => navigate('/')}>
        <ArrowLeft size={14} /> Back to Streets
      </button>

      {/* Street header */}
      {street && (
        <div className="card" style={{ marginBottom: 20, border: `1px solid ${statusColor[street.status]}40` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{street.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{street.barangay}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className={`badge badge-${street.status}`}>
                  <span className="badge-dot" />{street.status}
                </span>
                <span className="badge" style={{ background: 'rgba(0,180,216,0.12)', color: 'var(--primary)', border: '1px solid rgba(0,180,216,0.25)' }}>
                  Risk: {Math.round(street.risk_score)}
                </span>
                {street.water_level_estimate_cm && (
                  <span className="badge" style={{ background: 'rgba(72,202,228,0.12)', color: '#48cae4', border: '1px solid rgba(72,202,228,0.25)' }}>
                    <Droplets size={10} /> {street.water_level_estimate_cm} cm (CV est.)
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/streets/${streetId}/recovery`)}>
                <RotateCcw size={13} /> Recovery View
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/streets/${streetId}/alert`)}>
                <Bell size={13} /> Alert View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="stat-chip animate-in">
          <span className="stat-value">{households.length}</span>
          <span className="stat-label">Households</span>
        </div>
        <div className="stat-chip animate-in">
          <span className="stat-value" style={{ color: '#ef4444' }}>{atRisk}</span>
          <span className="stat-label">Predicted at Risk</span>
        </div>
        <div className="stat-chip animate-in">
          <span className="stat-value" style={{ color: '#f59e0b' }}>{marked}</span>
          <span className="stat-label">Marked</span>
        </div>
      </div>

      <div className="section-heading">
        <Layers size={13} /> Ranked Household Risk List
      </div>

      <div className="grid-1">
        {households.map((h, i) => (
          <div
            key={h.id}
            className={`hh-card animate-in ${h.affected_status === 'confirmed_affected' ? 'priority-highlight' : h.affected_status === 'confirmed_dry' ? 'priority-dry' : ''}`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="hh-rank">#{h.risk_rank}</div>

            <div className="hh-info">
              <div className="hh-address">
                <Home size={12} style={{ marginRight: 5 }} />
                {h.address_label}
              </div>
              <div className="hh-details">
                <span className="hh-detail">
                  <Layers size={10} /> {h.elevation_m} m elev.
                </span>
                <span className="hh-detail">
                  {h.ground_floor ? '🏠 Ground floor' : '🏢 Upper floor'}
                </span>
                {h.predicted_at_risk && (
                  <span className="hh-detail" style={{ color: '#ef4444' }}>
                    <AlertTriangle size={10} /> Pre-flood priority
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div className={`hh-score ${riskColor(h.risk_score)}`}>{Math.round(h.risk_score)}</div>
              <AffectedBadge status={h.affected_status} />
            </div>

            {/* Mark affected actions — AGOS-019 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 4 }}>
              <button
                className="btn btn-danger btn-xs"
                disabled={h.affected_status === 'confirmed_affected' || marking[h.id]}
                onClick={() => markHousehold(h.id, 'confirmed_affected')}
                title="Mark as flooded/affected"
              >
                {marking[h.id] ? '…' : <AlertTriangle size={11} />}
              </button>
              <button
                className="btn btn-success btn-xs"
                disabled={h.affected_status === 'confirmed_dry' || marking[h.id]}
                onClick={() => markHousehold(h.id, 'confirmed_dry')}
                title="Mark as dry / unaffected"
              >
                {marking[h.id] ? '…' : <Check size={11} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
