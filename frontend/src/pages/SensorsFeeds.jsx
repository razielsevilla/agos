import { useState, useEffect } from 'react';
import { api } from '../api';
import { MapPin, VideoOff, AlertCircle, Activity } from 'lucide-react';
import CalibratedVideo from '../components/CalibratedVideo';
import { CV_CALIBRATION } from '../cvCalibration';

const VIDEO_BASE_URL = 'http://localhost:8000/videos';

export default function SensorsFeeds() {
  const [streets, setStreets] = useState([]);

  useEffect(() => {
    api.getStreets().then(setStreets).catch(console.error);
  }, []);

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2>Live Sensors</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Live telemetry and computer vision feeds from surveillance stations.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {streets.map((street) => {
          const hasFeed = Boolean(street.video_filename);
          const videoSrc = hasFeed ? `${VIDEO_BASE_URL}/${street.video_filename}` : null;
          const hasReading = typeof street.water_level_estimate_cm === 'number';
          const isElevatedReading = hasReading && street.water_level_estimate_cm > 0;

          return (
          <div key={street.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Video Feed */}
            <div style={{
              backgroundColor: '#000',
              aspectRatio: '16/9',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid var(--border)'
            }}>
              {hasFeed ? (
                <CalibratedVideo
                  src={videoSrc}
                  calibration={CV_CALIBRATION[street.video_filename]}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                  <VideoOff size={28} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>No camera feed configured</span>
                </div>
              )}

              {/* Overlay elements */}
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '0.5rem' }}>
                {hasFeed && <span className="badge danger" style={{ backgroundColor: 'rgba(220, 38, 38, 0.9)', color: 'white', border: 'none' }}>REC</span>}
              </div>
            </div>

            {/* Metadata & Actions */}
            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>{street.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    <MapPin size={14} /> {street.barangay}
                  </div>
                </div>
                {street.status === 'flagged' && <AlertCircle color="var(--danger)" size={20} />}
              </div>

              <details style={{
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                transition: 'all 0.2s'
              }}>
                <summary style={{
                  padding: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  outline: 'none'
                }}>
                  <Activity size={18} /> Real-Time Telemetry
                </summary>
                <div style={{
                  padding: '1rem',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Water Level Est (OpenCV):</span>
                    <span style={{ fontWeight: 600, color: isElevatedReading ? 'var(--danger)' : 'var(--text-main)' }}>
                      {hasReading ? `${Math.abs(street.water_level_estimate_cm)} cm ${street.water_level_estimate_cm > 0 ? 'above' : street.water_level_estimate_cm < 0 ? 'below' : 'at'} reference mark` : 'Not calibrated'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Fused Hazard Score:</span>
                    <span style={{ fontWeight: 600 }}>{street.risk_score}/100</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Reference Object:</span>
                    <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{street.reference_object}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>CV Pipeline:</span>
                    <span style={{ fontWeight: 600, color: hasReading ? '#10b981' : 'var(--text-muted)' }}>
                      {hasReading ? 'Calibrated (Phase 1 POC)' : 'Not yet calibrated'}
                    </span>
                  </div>
                </div>
              </details>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
