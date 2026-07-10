import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false, stockOnly = false, teamView = false, complaintsOnly = false }) {
  const { user, loading, canAccessStock, canViewTeam, canAccessComplaints } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-solar-500"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/crm" replace />;
  if (stockOnly && !canAccessStock) return <Navigate to="/crm" replace />;
  if (teamView && !canViewTeam) return <Navigate to="/crm" replace />;
  if (complaintsOnly && !canAccessComplaints) return <Navigate to="/crm" replace />;

  return children;
}
