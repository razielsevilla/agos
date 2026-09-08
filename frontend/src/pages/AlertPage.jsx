// AlertPage.jsx — AGOS-021: Mocked alert output screen for DRRMO/resident
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, MapPin, Home, Navigation, Clock, AlertTriangle, ShieldAlert } from 'lucide-react'

export default function AlertPage() {
  const { streetId } = useParams()
  const navigate = useNavigate()
  const [alert, setAlert] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/streets/${streetId}/alert`)
      .then(r => r.json())
      .then(data => { setAlert(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [streetId])

  if (loading) return (
    <div className="page"><div className="loading-state"><div className="spinner" /><span>Loading alert…</span></div></div>
  )
  if (!alert) return null

  return (
    <div className="page animate-in">
      <button className="back-link" onClick={() => navigate(`/streets/${streetId}`)}>
        <ArrowLeft size={14} /> Back to Households
      </button>

      <div className="alert-card animate-in">
        {/* Header */}
        <div className="alert-agency">
          <ShieldAlert size={12} style={{ display: 'inline', marginRight: 4 }} />
          Barangay DRRMO — Flood Alert
        </div>
        <div className="alert-card-title">
          <AlertTriangle size={20} />
          FLOOD ALERT — {alert.street.status.toUpperCase()}
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="info-row" style={{ marginBottom: 8 }}>
            <span className="info-label"><MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />Location</span>
            <span className="info-value">{alert.street.name}</span>
          </div>
          <div className="info-row" style={{ marginBottom: 8 }}>
            <span className="info-label"><Bell size={13} style={{ display: 'inline', marginRight: 4 }} />Risk Score</span>
            <span className="info-value" style={{ color: '#ef4444', fontWeight: 700 }}>{alert.street.risk_score} / 100</span>
          </div>
          <div className="info-row">
            <span className="info-label"><Clock size={13} style={{ display: 'inline', marginRight: 4 }} />Generated</span>
            <span className="info-value">{new Date(alert.generated_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Evacuation route */}
        <div className="evac-box">
          <div className="evac-label"><Navigation size={10} style={{ display: 'inline', marginRight: 4 }} />Suggested Evacuation Route</div>
          {alert.suggested_evacuation_route}
        </div>

        {/* At-risk households */}
        <div style={{ marginTop: 24 }}>
          <div className="section-heading">
            <Home size={13} /> Priority Households ({alert.household_list.length})
          </div>
          <div className="grid-1">
            {alert.household_list.map((h, i) => (
              <div key={h.id}
                className={`hh-card animate-in ${h.predicted_at_risk ? 'priority-highlight' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}>
                <div className="hh-rank" style={h.predicted_at_risk ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' } : {}}>
                  #{h.risk_rank}
                </div>
                <div className="hh-info">
                  <div className="hh-address">{h.address_label}</div>
                  {h.predicted_at_risk && (
                    <div className="hh-details">
                      <span className="hh-detail" style={{ color: '#ef4444' }}>
                        <AlertTriangle size={10} /> Pre-flood risk priority
                      </span>
                    </div>
                  )}
                </div>
                {h.predicted_at_risk && (
                  <span className="badge badge-flagged" style={{ flexShrink: 0 }}>
                    <span className="badge-dot" /> Priority
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, padding: '12px 16px', background: 'rgba(0,0,0,0.25)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          ⚠️ This alert is generated from illustrative/synthetic data for the AGOS hackathon MVP demonstration.
          Household data and risk rankings are not CDRRMO-validated. Real deployment requires partnership with Cabuyao CDRRMO.
        </div>
      </div>
    </div>
  )
}
