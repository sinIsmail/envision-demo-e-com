import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }:any) {
  const isLoggedIn = localStorage.getItem("token");

  return isLoggedIn ? children : <Navigate to="/Login" replace />;
}

export default ProtectedRoute;