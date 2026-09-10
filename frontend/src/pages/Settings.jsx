import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, Check, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAME_STORAGE_KEY = 'agos_duty_officer_name';
const DEFAULT_NAME = 'Duty Officer';

function loadStoredName() {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) || DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME;
  }
}

function initialsFor(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OP';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [savedName, setSavedName] = useState(loadStoredName);
  const [nameInput, setNameInput] = useState(savedName);
  const [justSaved, setJustSaved] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim() || DEFAULT_NAME;
    try {
      localStorage.setItem(NAME_STORAGE_KEY, trimmed);
    } catch {}
    setSavedName(trimmed);
    setNameInput(trimmed);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>Settings</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Account and session management.</p>
      </header>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Command Center Profile</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', backgroundColor: 'var(--success-light)', borderRadius: '9999px', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>
            <ShieldCheck size={14} /> Signed In
          </div>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: '50%', 
            backgroundColor: 'var(--primary)', color: 'white', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '1.5rem', fontWeight: 700, flexShrink: 0
          }}>
            {initialsFor(savedName)}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.125rem' }}>Cabuyao LGU Command Center</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active Duty Officer: <span style={{ fontWeight: 600 }}>{savedName}</span></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Shift Handoff</h3>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              <User size={16} color="var(--primary)" />
              Shift Duty Officer Name
            </label>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              This is a shared command-center terminal. Set the active officer name here so shift handoffs know who is currently operating the dashboard. Saved on this device only.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                placeholder={DEFAULT_NAME}
                style={{ flex: 1, maxWidth: '400px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none' }}
              />
              <button onClick={handleSaveName} className="btn-solid" style={{ minWidth: '150px' }}>
                {justSaved ? <><Check size={16} /> Saved</> : 'Update Name'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem', borderColor: '#fecaca', backgroundColor: '#fff5f5' }}>
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#991b1b' }}>End Session</h3>
            <p style={{ fontSize: '0.875rem', color: '#b91c1c', marginTop: '0.25rem' }}>Securely log out of the command center terminal.</p>
          </div>
          <button onClick={handleLogout} className="btn-solid danger" style={{ minWidth: 'auto', padding: '0.75rem 1.5rem' }}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
