import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import { auth } from "@/firebase/fb"
import { useAuth } from "@/context/AuthContext"
import { ShoppingCart, User, LogOut, Menu, X, LogIn, UserPlus } from "lucide-react"
import { readLocalCart } from "@/lib/cartStrorage"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [guestCartCount, setGuestCartCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()

  // Track guest cart count for the badge
  useEffect(() => {
    if (!user) {
      const items = readLocalCart()
      setGuestCartCount(items.reduce((sum, i) => sum + i.quantity, 0))
    }
  }, [user, location])

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  const handleSignout = async () => {
    setOpen(false)
    await signOut(auth)
    navigate("/Login")
  }

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const isActive = (path: string) => location.pathname === path

  if (loading) {
    return (
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur h-16" />
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* LOGO */}
          <button
            onClick={() => go("/")}
            className="text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            Shop<span className="text-primary">.</span>
          </button>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-2">
            {user && (
              <span className="mr-2 text-sm text-muted-foreground hidden lg:block truncate max-w-[180px]">
                {user.displayName ?? user.email}
              </span>
            )}

            {/* Cart — always visible */}
            <button
              onClick={() => go("/Cart")}
              className={`relative flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive("/Cart")
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted border-input"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              Cart
            </button>

            {user ? (
              <>
                <button
                  onClick={() => go("/Profile")}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive("/Profile")
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted border-input"
                  }`}
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={handleSignout}
                  className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => go("/Login")}
                  className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Log In
                </button>
                <button
                  onClick={() => go("/Signup")}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </button>
              </>
            )}
          </nav>

          {/* MOBILE — cart icon + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => go("/Cart")}
              className="relative flex items-center justify-center rounded-md p-2 hover:bg-muted transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {/* Guest cart count badge */}
              {!user && guestCartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {guestCartCount > 9 ? "9+" : guestCartCount}
                </span>
              )}
            </button>

            <button
              className="flex items-center justify-center rounded-md p-2 hover:bg-muted transition-colors"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER — full width slide-down */}
      {open && (
        <div className="fixed inset-0 top-16 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative border-b bg-background shadow-xl">
            <div className="mx-auto max-w-7xl px-4 pb-6 pt-4 space-y-1">

              {/* User info */}
              {user && (
                <div className="mb-3 flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {(user.displayName?.[0] ?? user.email?.[0] ?? "U").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{user.displayName ?? "User"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Nav items */}
              <button
                onClick={() => go("/Cart")}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive("/Cart") ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                Cart
                {!user && guestCartCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {guestCartCount > 9 ? "9+" : guestCartCount}
                  </span>
                )}
              </button>

              {user ? (
                <>
                  <button
                    onClick={() => go("/Profile")}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive("/Profile") ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <User className="h-5 w-5" />
                    Profile
                  </button>

                  <div className="pt-2">
                    <button
                      onClick={handleSignout}
                      className="flex w-full items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => go("/Login")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <LogIn className="h-5 w-5" />
                    Log In
                  </button>
                  <button
                    onClick={() => go("/Signup")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <UserPlus className="h-5 w-5" />
                    Create Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
