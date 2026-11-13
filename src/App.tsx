import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom"

import Home from "./pages/home"
import Profile from "./pages/profile"
import Cart from "./pages/cart"
import Admin from "./Admin/admin"
import Login from "./Auth/login"
import Signup from "./Auth/signup"
import ProtectedRoute from "./components/protectedRoute"
import ProductDetail from "./pages/ProductDetail"
import { useAuth } from "./context/AuthContext"
import { ADMIN_UID } from "./components/protectedRoute"

/**
 * Public pages that the admin account should not access.
 * Unauthenticated users pass through freely.
 * Logged-in admin → /Admin.
 */
function AdminRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (user && user.uid === ADMIN_UID) return <Navigate to="/Admin" replace />
  return <>{children}</>
}

/** Redirect already-logged-in admin away from Login/Signup to /Admin */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (user && user.uid === ADMIN_UID) return <Navigate to="/Admin" replace />
  return <>{children}</>
}

export function App() {
  return (
    <BrowserRouter basename={"/"}>
      <Routes>

        {/* ── Public pages (guests welcome, but admin → /Admin) ── */}
        <Route
          path="/"
          element={
            <AdminRedirect>
              <Home />
            </AdminRedirect>
          }
        />

        <Route
          path="/Cart"
          element={
            <AdminRedirect>
              <Cart />
            </AdminRedirect>
          }
        />

        <Route
          path="/product/:id"
          element={
            <AdminRedirect>
              <ProductDetail />
            </AdminRedirect>
          }
        />

        {/* ── Requires login + not admin ── */}
        <Route
          path="/Profile"
          element={
            <ProtectedRoute userOnly>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* ── Admin-only page ── */}
        <Route
          path="/Admin"
          element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* ── Auth pages — redirect logged-in admin to /Admin ── */}
        <Route
          path="/Login"
          element={
            <AuthGate>
              <Login />
            </AuthGate>
          }
        />

        <Route
          path="/Signup"
          element={
            <AuthGate>
              <Signup />
            </AuthGate>
          }
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App