import { useState, useEffect } from 'react';
import { api } from '../api';
import { MapPin, Video, AlertCircle, Activity } from 'lucide-react';

export default function SensorsFeeds() {
  const [streets, setStreets] = useState([]);

  useEffect(() => {
    api.getStreets().then(setStreets).catch(console.error);
  }, []);

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Sensors & Feeds</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Live telemetry and computer vision feeds from surveillance stations.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {streets.map((street, index) => {
          const videoSrc = `http://localhost:8000/videos/flood_${(index % 3) + 1}.mp4`;
          
          return (
          <div key={street.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Video Dataset Player */}
            <div style={{ 
              backgroundColor: '#000', 
              aspectRatio: '16/9', 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid var(--border)'
            }}>
              <video 
                src={videoSrc}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Overlay elements */}
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '0.5rem' }}>
                <span className="badge danger" style={{ backgroundColor: 'rgba(220, 38, 38, 0.9)', color: 'white', border: 'none' }}>REC</span>
                <span className="badge normal" style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none' }}>{street.camera_label}</span>
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
                    <span style={{ color: 'var(--text-muted)' }}>Water Level Est:</span>
                    <span style={{ fontWeight: 600, color: street.water_level_estimate_cm ? 'var(--danger)' : 'var(--text-main)' }}>
                      {street.water_level_estimate_cm !== null ? `${street.water_level_estimate_cm} cm` : 'Not Detected'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Fused Risk Score:</span>
                    <span style={{ fontWeight: 600 }}>{street.risk_score}/100</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Reference Pixel Target:</span>
                    <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{street.reference_object || 'Standard Gauge'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>CV Pipeline:</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>Automated (Active)</span>
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
