import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../data/AuthProvider';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" style={{ color: 'var(--app-accent)' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export default ProtectedRoute;
