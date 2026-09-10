import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';
import { PRIORITY_LEVELS, priorityForScore } from '../lib/priority';

// Fix for default marker icons in react-leaflet not showing up properly due to webpack/vite module loading
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow });

// Streets are spread across the whole city (lakeshore to upland), not clustered
// near one point, so the map must fit itself to whatever markers are loaded
// instead of relying on a fixed center/zoom.
function FitToStreets({ streets }) {
  const map = useMap();

  useEffect(() => {
    if (streets.length === 0) return;
    const bounds = streets.map(s => [s.latitude, s.longitude]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [streets, map]);

  return null;
}

export default function RiskMap() {
  const [streets, setStreets] = useState([]);

  useEffect(() => {
    api.getStreets().then(setStreets).catch(console.error);
  }, []);

  // Approximate center of Cabuyao, Laguna — used only until FitToStreets adjusts the view
  const centerPosition = [14.2764, 121.1235];

  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2>Flood Map</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Interactive map of monitored waterways, colored by priority level.</p>
      </header>

      <div className="card" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* We use key={streets.length} to force remount if data loads late, preventing leaflet sizing issues */}
        <MapContainer
          center={centerPosition}
          zoom={14}
          style={{ height: '100%', width: '100%', zIndex: 10 }}
        >
          <FitToStreets streets={streets} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          {streets.map(street => {
            const level = priorityForScore(street.risk_score);

            return (
              <div key={street.id}>
                <Marker position={[street.latitude, street.longitude]}>
                  <Popup>
                    <div style={{ fontWeight: 600 }}>{street.name}</div>
                    <div style={{ color: '#64748b' }}>{level.shortLabel} &middot; Hazard Score: {street.risk_score}</div>
                  </Popup>
                </Marker>
                <Circle
                  center={[street.latitude, street.longitude]}
                  radius={level.mapRadius}
                  pathOptions={{
                    color: level.mapColor,
                    fillColor: level.mapFillColor,
                    fillOpacity: 0.4
                  }}
                />
              </div>
            );
          })}
        </MapContainer>

        {/* Legend overlay — sits above the Leaflet canvas (zIndex 10) */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 20,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          boxShadow: 'var(--shadow)',
          padding: '0.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Priority Level
          </div>
          {PRIORITY_LEVELS.map(level => (
            <div key={level.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '9999px',
                backgroundColor: level.mapFillColor,
                border: `2px solid ${level.mapColor}`,
                flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 500, whiteSpace: 'nowrap' }}>{level.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
