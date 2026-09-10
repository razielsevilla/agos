import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAME_STORAGE_KEY = 'agos_duty_officer_name';
const DEFAULT_NAME = 'Duty Officer';

function loadStoredName() {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) || DEFAULT_NAME;
  } catch {
    return DEFAULT_NAME; // private browsing / storage blocked — fall back quietly
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
    } catch {
      // storage unavailable — name still updates for this session, just won't persist
    }
    setSavedName(trimmed);
    setNameInput(trimmed);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  return (
    <div style={{ maxWidth: '480px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h2>Settings</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Account and session.</p>
      </header>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>
            {initialsFor(savedName)}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Cabuyao LGU</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{savedName}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--success-light)', borderRadius: '0.5rem', fontSize: '0.8125rem', color: 'var(--success)' }}>
          <ShieldCheck size={16} /> Signed in — CDRRMO Command Center session active
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
          Duty Officer Name
        </label>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          This is a shared command-center login, not a personal account — set a name here so shift handoffs know who was on duty. Saved on this device only.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            placeholder={DEFAULT_NAME}
            style={{ flex: 1, padding: '0.625rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}
          />
          <button onClick={handleSaveName} className="btn-solid" style={{ minWidth: 'auto', padding: '0 1.25rem' }}>
            {justSaved ? <Check size={16} /> : 'Save'}
          </button>
        </div>
      </div>

      <button onClick={handleLogout} className="btn-solid danger" style={{ width: '100%', justifyContent: 'center' }}>
        <LogOut size={16} /> Log Out
      </button>
    </div>
  );
}
