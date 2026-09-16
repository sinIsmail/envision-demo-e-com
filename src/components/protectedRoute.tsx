import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Wait for Firebase to resolve auth state before deciding
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/Login" replace />;
}

export default ProtectedRoute;