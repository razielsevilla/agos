// RecoveryPage.jsx — AGOS-020: Post-flood recovery-priority record (closing the loop)
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Home, AlertTriangle, Layers, CheckCircle } from 'lucide-react'

function AffectedBadge({ status }) {
  const labels = { unmarked: 'Unmarked', confirmed_affected: 'Confirmed Affected', confirmed_dry: 'Confirmed Dry' }
  return <span className={`affected-badge ${status}`}>{labels[status] || status}</span>
}

export default function RecoveryPage() {
  const { streetId } = useParams()
  const navigate = useNavigate()
  const [street, setStreet] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/streets/${streetId}`).then(r => r.json()),
      fetch(`/api/streets/${streetId}/recovery-record`).then(r => r.json()),
    ]).then(([s, rec]) => {
      setStreet(s); setRecords(rec); setLoading(false)
    }).catch(() => setLoading(false))
  }, [streetId])

  if (loading) return (
    <div className="page"><div className="loading-state"><div className="spinner" /><span>Loading recovery record…</span></div></div>
  )

  const topPriority = records.filter(h => h.predicted_at_risk && h.affected_status === 'confirmed_affected')
  const rest = records.filter(h => !(h.predicted_at_risk && h.affected_status === 'confirmed_affected'))

  return (
    <div className="page animate-in">
      <button className="back-link" onClick={() => navigate(`/streets/${streetId}`)}>
        <ArrowLeft size={14} /> Back to Households
      </button>

      {/* Closing the loop banner */}
      <div className="loop-banner animate-in">
        <div className="loop-icon">🔁</div>
        <div className="loop-text">
          <strong>Closing the Loop</strong> — This is the <em>same household list</em> from the pre-flood risk ranking, now re-sorted post-event.
          Households that were <strong>predicted at-risk AND confirmed affected</strong> surface first — CDRRMO's immediate relief-prioritization starting point.
        </div>
      </div>

      {street && (
        <div style={{ marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          Post-flood recovery record for <strong style={{ color: 'var(--primary)' }}>{street.name}</strong>
        </div>
      )}

      {topPriority.length > 0 && (
        <>
          <div className="section-heading" style={{ color: '#ef4444' }}>
            <AlertTriangle size={13} /> Immediate Relief Priority ({topPriority.length})
          </div>
          <div className="grid-1" style={{ marginBottom: 24 }}>
            {topPriority.map((h, i) => (
              <div
                key={h.id}
                className="hh-card priority-highlight animate-in"
                style={{ animationDelay: `${i * 40}ms`, border: '1px solid rgba(239,68,68,0.5)' }}
              >
                <div className="hh-rank" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                  #{h.risk_rank}
                </div>
                <div className="hh-info">
                  <div className="hh-address"><Home size={12} style={{ marginRight: 5 }} />{h.address_label}</div>
                  <div className="hh-details">
                    <span className="hh-detail"><Layers size={10} /> {h.elevation_m} m</span>
                    <span className="hh-detail">{h.ground_floor ? '🏠 Ground floor' : '🏢 Upper floor'}</span>
                    <span className="hh-detail" style={{ color: '#ef4444' }}>
                      <AlertTriangle size={10} /> Pre-flood priority
                    </span>
                  </div>
                  {h.marked_at && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      Marked {new Date(h.marked_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <AffectedBadge status={h.affected_status} />
              </div>
            ))}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <div className="section-heading">
            <CheckCircle size={13} /> Remaining Households ({rest.length})
          </div>
          <div className="grid-1">
            {rest.map((h, i) => (
              <div key={h.id} className={`hh-card animate-in ${h.affected_status === 'confirmed_dry' ? 'priority-dry' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}>
                <div className="hh-rank">#{h.risk_rank}</div>
                <div className="hh-info">
                  <div className="hh-address"><Home size={12} style={{ marginRight: 5 }} />{h.address_label}</div>
                  <div className="hh-details">
                    <span className="hh-detail"><Layers size={10} /> {h.elevation_m} m</span>
                    <span className="hh-detail">{h.ground_floor ? '🏠 Ground floor' : '🏢 Upper floor'}</span>
                  </div>
                  {h.marked_at && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      Marked {new Date(h.marked_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <AffectedBadge status={h.affected_status} />
              </div>
            ))}
          </div>
        </>
      )}

      {topPriority.length === 0 && records.length > 0 && (
        <div className="empty-state">
          <RotateCcw size={32} />
          <span>No households confirmed affected yet. Go back and mark households as flooded to build the relief-priority list.</span>
        </div>
      )}
    </div>
  )
}
