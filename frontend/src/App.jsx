import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StreetDetail from './pages/StreetDetail';
import AlertMock from './pages/AlertMock';
import SensorsFeeds from './pages/SensorsFeeds';
import RiskMap from './pages/RiskMap';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="streets/:streetId" element={<StreetDetail />} />
        <Route path="streets/:streetId/alert" element={<AlertMock />} />
        <Route path="feeds" element={<SensorsFeeds />} />
        <Route path="map" element={<RiskMap />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
