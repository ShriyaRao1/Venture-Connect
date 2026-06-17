import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-56px)]">
      <div className="w-8 h-8 rounded-full border-2 border-[#2a2a2a] border-t-[#00c853] spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  // Admin trying to access non-admin routes → send to admin panel
  if (user.role === 'admin' && !allowedRoles?.includes('admin')) {
    return <Navigate to="/admin" replace />;
  }

  // Role restriction (e.g. founder-only routes)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
}
