import { useState, useCallback, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Waves, LayoutDashboard, Menu } from 'lucide-react'
import StreetsPage from './pages/StreetsPage'
import HouseholdsPage from './pages/HouseholdsPage'
import RecoveryPage from './pages/RecoveryPage'
import AlertPage from './pages/AlertPage'
import './App.css'

function Sidebar({ open, onClose }) {
  const location = useLocation()

  // Auto-close on navigation (mobile UX — don't leave sidebar open after tap)
  useEffect(() => {
    onClose()
  // onClose is stable (useCallback in App), location.pathname is the real trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return (
    <>
      {/* Backdrop — visible on mobile when sidebar is open */}
      <div
        className={`sidebar-overlay${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-icon">
            <Waves size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-name">AGOS</div>
            <div className="brand-sub">Flood Risk System</div>
          </div>
        </div>

        <span className="sidebar-section-label">Navigation</span>

        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <LayoutDashboard size={16} className="nav-icon" />
          Streets Dashboard
        </NavLink>

        <span className="sidebar-section-label" style={{ marginTop: 8 }}>Info</span>
        <div className="nav-link" style={{ cursor: 'default', opacity: 0.5, fontSize: 12 }}>
          <Waves size={14} className="nav-icon" />
          Cabuyao, Laguna POC
        </div>
      </aside>
    </>
  )
}

function Topbar({ onMenuClick }) {
  const loc = useLocation()
  const labels = {
    '/': { title: 'Streets Dashboard', sub: 'Flood risk overview by camera location' },
  }
  const matched = Object.entries(labels).find(([k]) => loc.pathname === k)
  const { title, sub } = matched ? matched[1] : { title: 'AGOS', sub: 'Flood Risk Management' }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Hamburger — hidden on desktop via CSS, visible on mobile */}
        <button
          className="hamburger"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-sub">{sub}</div>
        </div>
      </div>
      <div className="topbar-badge">
        <span className="pulse" />
        <span className="topbar-badge-text">Live Monitor</span>
      </div>
    </header>
  )
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(o => !o)} />
        <Routes>
          <Route path="/" element={<StreetsPage />} />
          <Route path="/streets/:streetId" element={<HouseholdsPage />} />
          <Route path="/streets/:streetId/recovery" element={<RecoveryPage />} />
          <Route path="/streets/:streetId/alert" element={<AlertPage />} />
        </Routes>
      </div>
    </div>
  )
}
