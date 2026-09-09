import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BarangayDetail from './pages/BarangayDetail';
import StreetDetail from './pages/StreetDetail';
import AlertMock from './pages/AlertMock';
import SensorsFeeds from './pages/SensorsFeeds';
import RiskMap from './pages/RiskMap';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="barangay/:barangayName" element={<BarangayDetail />} />
          {/* Temporarily disabled — StreetDetail.jsx and AlertMock.jsx left intact, just unreachable */}
          {/* <Route path="streets/:streetId" element={<StreetDetail />} /> */}
          {/* <Route path="streets/:streetId/alert" element={<AlertMock />} /> */}
          <Route path="feeds" element={<SensorsFeeds />} />
          <Route path="map" element={<RiskMap />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
