import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Admin is identified by UID — cannot be spoofed unlike email
export const ADMIN_UID = "TupK2gYT3tg9ZMCtpDLjPavLVgE2";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  /** Pass true on any route that should be inaccessible to the admin account */
  userOnly?: boolean;
}

function ProtectedRoute({ children, adminOnly = false, userOnly = false }: ProtectedRouteProps) {
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

  const isAdmin = user.uid === ADMIN_UID;

  // Admin-only guard — redirect non-admins to home
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  // User-only guard — redirect admin to their dashboard
  if (userOnly && isAdmin) return <Navigate to="/Admin" replace />;

  return <>{children}</>;
}

export default ProtectedRoute;