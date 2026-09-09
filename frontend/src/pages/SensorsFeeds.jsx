import { useState, useEffect } from 'react';
import { api } from '../api';
import { MapPin, AlertCircle, Activity } from 'lucide-react';
import CalibratedVideo from '../components/CalibratedVideo';
import { CV_CALIBRATION } from '../cvCalibration';

const VIDEO_BASE_URL = 'http://localhost:8000/videos';

// Only 3 real clips exist for many more streets — cycled here as demo filler
// (flood_1 -> flood_2 -> flood_3 -> flood_1...) for streets with no
// specifically-matched camera (street.video_filename is null for those; see
// cv/README.md for which streets have a real, calibrated match instead).
const DEMO_CYCLE_VIDEOS = ['flood_1.mp4', 'flood_2.mp4', 'flood_3.mp4'];

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
        {streets.map((street, index) => {
          const videoFilename = street.video_filename || DEMO_CYCLE_VIDEOS[index % DEMO_CYCLE_VIDEOS.length];
          const videoSrc = `${VIDEO_BASE_URL}/${videoFilename}`;
          const calibration = CV_CALIBRATION[videoFilename];
          // Telemetry describes the footage actually playing on this card, not
          // the street it's attached to — most cards cycle demo filler
          // unrelated to that street (only 3 real clips exist for many more
          // streets), so street.water_level_estimate_cm/reference_object
          // would show a real but unrelated per-barangay rainfall figure next
          // to a video it has nothing to do with.
          const hasReading = typeof calibration?.waterLevelEstimateCm === 'number';
          const waterLevelEstimateCm = calibration?.waterLevelEstimateCm;
          const isElevatedReading = hasReading && waterLevelEstimateCm > 0;

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
              <CalibratedVideo
                src={videoSrc}
                calibration={CV_CALIBRATION[videoFilename]}
                autoPlay
                loop
                muted
                playsInline
              />

              {/* Overlay elements */}
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '0.5rem' }}>
                <span className="badge danger" style={{ backgroundColor: 'rgba(220, 38, 38, 0.9)', color: 'white', border: 'none' }}>REC</span>
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

              <div style={{
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Activity size={18} /> Real-Time Telemetry
                </div>
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
                      {hasReading ? `${Math.abs(waterLevelEstimateCm)} cm ${waterLevelEstimateCm > 0 ? 'above' : waterLevelEstimateCm < 0 ? 'below' : 'at'} reference mark` : 'Not calibrated'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Fused Hazard Score:</span>
                    <span style={{ fontWeight: 600 }}>{street.risk_score}/100</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Reference Object:</span>
                    <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{calibration?.referenceLabel ?? street.reference_object}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>CV Pipeline:</span>
                    <span style={{ fontWeight: 600, color: hasReading ? '#10b981' : 'var(--text-muted)' }}>
                      {hasReading ? 'Calibrated (Phase 1 POC)' : 'Not yet calibrated'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
