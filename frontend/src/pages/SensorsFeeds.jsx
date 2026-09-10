import { useState, useEffect } from 'react';
import { api } from '../api';
import { MapPin, AlertCircle, Activity, Filter } from 'lucide-react';
import CalibratedVideo from '../components/CalibratedVideo';
import { CV_CALIBRATION } from '../cvCalibration';

const VIDEO_BASE_URL = 'http://localhost:8000/videos';

// Cycle demo filler
const DEMO_CYCLE_VIDEOS = ['flood_1.mp4', 'flood_2.mp4', 'flood_3.mp4'];

export default function SensorsFeeds() {
  const [streets, setStreets] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [selectedBarangay, setSelectedBarangay] = useState('');

  useEffect(() => {
    api.getStreets().then(data => {
      setStreets(data);
      if (data.length > 0) {
        const uniqueBarangays = [...new Set(data.map(s => s.barangay))].sort();
        setBarangays(uniqueBarangays);
        setSelectedBarangay(uniqueBarangays[0]); // default to first barangay to avoid loading all videos
      }
    }).catch(console.error);
  }, []);

  const filteredStreets = selectedBarangay === 'All' ? streets : streets.filter(s => s.barangay === selectedBarangay);

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2>Live Sensors</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Live camera feeds from barangay monitoring stations.</p>
      </header>

      {/* Barangay Filter Control Bar */}
      {barangays.length > 0 && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.95rem' }}>
            <Filter size={18} color="var(--primary)" /> 
            <span>Active Region Feed</span>
          </div>
          
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <select
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              style={{
                width: '100%',
                appearance: 'none',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                padding: '0.625rem 2.5rem 0.625rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <option value="All">All Barangays (Bandwidth Heavy)</option>
              {barangays.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid for Selected Barangay */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredStreets.map((street, index) => {
          const videoFilename = street.video_filename || DEMO_CYCLE_VIDEOS[index % DEMO_CYCLE_VIDEOS.length];
          const videoSrc = `${VIDEO_BASE_URL}/${videoFilename}`;
          const calibration = CV_CALIBRATION[videoFilename];
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
                    <Activity size={18} /> Live Sensor Data
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
                      <span style={{ color: 'var(--text-muted)' }}>Estimated Water Level:</span>
                      <span style={{ fontWeight: 600, color: isElevatedReading ? 'var(--danger)' : 'var(--text-main)' }}>
                        {hasReading ? `${Math.abs(waterLevelEstimateCm)} cm ${waterLevelEstimateCm > 0 ? 'above' : waterLevelEstimateCm < 0 ? 'below' : 'at'} reference mark` : 'Not yet calculated'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Peak Flood Risk:</span>
                      <span style={{ fontWeight: 600 }}>{Math.round(street.risk_score)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Camera Reference Object:</span>
                      <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{calibration?.referenceLabel ?? street.reference_object}</span>
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
