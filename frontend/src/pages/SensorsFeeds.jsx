import { useState, useEffect } from 'react';
import { api } from '../api';
import { MapPin, Video, AlertCircle, PlayCircle } from 'lucide-react';

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
        {streets.map(street => (
          <div key={street.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Mock Video Player */}
            <div style={{ 
              backgroundColor: '#0f172a', 
              aspectRatio: '16/9', 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                 <Video size={32} />
                 <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Feed Offline / Placeholder</span>
                 <span style={{ fontSize: '0.75rem' }}>AGOS-005 Video Dataset Target</span>
              </div>

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

              <button className="transition-all" style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                color: 'var(--primary)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}>
                <PlayCircle size={18} /> Run CV Waterline Detection
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
