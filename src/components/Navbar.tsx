import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import { collection, onSnapshot } from "firebase/firestore"
import { auth, db } from "@/firebase/fb"
import { useAuth } from "@/context/AuthContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { useTheme } from "@/components/theme-provider"
import { ShoppingCart, User, LogOut, Menu, X, LogIn, UserPlus, Sun, Moon } from "lucide-react"
import { readLocalCart } from "@/lib/cartStrorage"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [showBanner, setShowBanner] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const { settings } = useSiteSettings()
  const { theme, setTheme } = useTheme()

  // Track dynamic cart count in real time for authenticated users and guests
  useEffect(() => {
    if (!user) {
      const items = readLocalCart()
      setCartCount(items.reduce((sum, i) => sum + i.quantity, 0))
      return
    }
    const cartRef = collection(db, "cart", user.uid, "items")
    const unsubscribe = onSnapshot(
      cartRef,
      (snap) => {
        const total = snap.docs.reduce((sum, d) => sum + (Number(d.data().quantity) || 0), 0)
        setCartCount(total)
      },
      (err) => {
        console.error("Cart count error:", err)
      }
    )
    return () => unsubscribe()
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

  // Dynamic context-aware banner selection:
  // - Visitors / Guests: show pre-signup promo banner
  // - Authenticated Members: immediately hide sign-up promo, show member banner if enabled
  const activeBanner = !user
    ? settings.promoBannerEnabled !== false && settings.promoBannerText
      ? {
          text: settings.promoBannerText,
          linkText: settings.promoBannerLinkText,
          linkUrl: settings.promoBannerLinkUrl || "/Signup",
        }
      : null
    : settings.memberBannerEnabled === true && settings.memberBannerText
    ? {
        text: settings.memberBannerText,
        linkText: settings.memberBannerLinkText,
        linkUrl: settings.memberBannerLinkUrl || "/",
      }
    : null

  if (loading) {
    return (
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur h-16" />
    )
  }

  return (
    <>
      {/* ── TOP ANNOUNCEMENT & PROMO BANNER (Context-Aware: Guest vs Member) ── */}
      {showBanner && activeBanner && (
        <div className="bg-foreground text-background text-xs py-2 px-4 text-center font-medium flex items-center justify-center relative transition-all">
          <span>
            {activeBanner.text}{" "}
            {activeBanner.linkText && (
              <button
                onClick={() => navigate(activeBanner.linkUrl)}
                className="underline font-bold hover:opacity-80 transition-opacity ml-1.5"
              >
                {activeBanner.linkText}
              </button>
            )}
          </span>
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 text-xs p-1"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* LOGO — dynamic from Firestore */}
          <button
            onClick={() => go("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.brandName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-2xl font-bold tracking-tight">
                {settings.brandName}
              </span>
            )}
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
              className={`relative flex items-center gap-2 rounded-full border px-4 py-1.5 h-9 text-sm font-semibold transition-all shadow-2xs ${
                isActive("/Cart")
                  ? "bg-primary/10 text-primary border-primary ring-2 ring-primary/20"
                  : "border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-primary/50"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground px-1.5 shadow-xs leading-none">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {user ? (
              <>
                <button
                  onClick={() => go("/Profile")}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 h-9 text-sm font-semibold transition-all shadow-2xs ${
                    isActive("/Profile")
                      ? "bg-primary/10 text-primary border-primary ring-2 ring-primary/20"
                      : "border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-primary/50"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={handleSignout}
                  className="flex items-center gap-1.5 rounded-full border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-4 py-1.5 h-9 text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all shadow-2xs"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => go("/Login")}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-4 py-1.5 h-9 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Log In</span>
                </button>
                <button
                  onClick={() => go("/Signup")}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 h-9 text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all shadow-xs"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Sign Up</span>
                </button>
              </>
            )}
            {/* Theme Toggle (Dark / Light) */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              )}
            </button>
          </nav>

          {/* MOBILE — theme toggle + cart icon + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-foreground hover:bg-muted transition-colors shadow-2xs"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => go("/Cart")}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-muted transition-colors shadow-2xs"
              aria-label="Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground px-1 shadow-xs">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-muted transition-colors shadow-2xs"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {open && (
        <div className="fixed inset-0 top-16 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative border-b bg-background shadow-xl">
            <div className="mx-auto max-w-7xl px-4 pb-6 pt-4 space-y-1">

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

              <button
                onClick={() => go("/Cart")}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive("/Cart") ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1.5">
                    {cartCount > 99 ? "99+" : cartCount}
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
