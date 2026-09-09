import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAuth({ children }) {
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>
        Checking session…
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
