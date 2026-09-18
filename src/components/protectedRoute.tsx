import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Admin is identified by UID — cannot be spoofed unlike email
const ADMIN_UID = "TupK2gYT3tg9ZMCtpDLjPavLVgE2";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Wait for Firebase to resolve auth state before deciding
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/Login" replace />;

  // Admin-only guard — redirect non-admins to home
  if (adminOnly && user.uid !== ADMIN_UID) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;