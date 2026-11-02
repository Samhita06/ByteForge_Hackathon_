import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider.jsx';
import { PageSkeleton } from '../../components/feedback/skeleton.jsx';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8"><PageSkeleton /></div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function GuestRoute() {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8"><PageSkeleton /></div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function PublicHomeRoute() {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8"><PageSkeleton /></div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
