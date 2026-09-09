import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';

// Fix for default marker icons in react-leaflet not showing up properly due to webpack/vite module loading
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function RiskMap() {
  const [streets, setStreets] = useState([]);

  useEffect(() => {
    api.getStreets().then(setStreets).catch(console.error);
  }, []);

  // Approximate center of Cabuyao, Laguna
  const centerPosition = [14.2764, 121.1235];

  return (
    <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Geospatial Risk Map</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Interactive map of monitored waterways and household risk radiuses.</p>
      </header>

      <div className="card" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* We use key={streets.length} to force remount if data loads late, preventing leaflet sizing issues */}
        <MapContainer 
          center={centerPosition} 
          zoom={14} 
          style={{ height: '100%', width: '100%', zIndex: 10 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          {streets.map(street => {
            const isCritical = street.status === 'flagged';
            
            return (
              <div key={street.id}>
                <Marker position={[street.latitude, street.longitude]}>
                  <Popup>
                    <div style={{ fontWeight: 600 }}>{street.name}</div>
                    <div style={{ color: '#64748b' }}>Risk Score: {street.risk_score}</div>
                  </Popup>
                </Marker>
                <Circle 
                  center={[street.latitude, street.longitude]} 
                  radius={isCritical ? 400 : 200}
                  pathOptions={{
                    color: isCritical ? '#dc2626' : '#1e40af',
                    fillColor: isCritical ? '#fca5a5' : '#93c5fd',
                    fillOpacity: 0.4
                  }} 
                />
              </div>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
