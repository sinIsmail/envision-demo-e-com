import { useState, useEffect, useRef, useMemo } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { signOut } from "firebase/auth"
import { collection, onSnapshot, getDocs } from "firebase/firestore"
import { auth, db } from "@/firebase/fb"
import { useAuth } from "@/context/AuthContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { useTheme } from "@/components/theme-provider"
import {
  ShoppingCart,
  User,
  LogOut,
  Menu,
  X,
  LogIn,
  UserPlus,
  Sun,
  Moon,
  Search,
  ArrowRight,
} from "lucide-react"
import { readLocalCart } from "@/lib/cartStrorage"
import { formatPrice } from "@/lib/themeUtils"
import type { Product } from "@/types/product"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [showBanner, setShowBanner] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, loading } = useAuth()
  const { settings } = useSiteSettings()
  const { theme, setTheme } = useTheme()

  // ─── Search Bar State & Suggestions ──────────────────────────────────────
  const urlQuery = searchParams.get("q") ?? ""
  const [searchVal, setSearchVal] = useState(urlQuery)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestProducts, setSuggestProducts] = useState<Product[]>([])
  const desktopSearchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)

  // Sync with URL query parameter
  useEffect(() => {
    setSearchVal(urlQuery)
  }, [urlQuery])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const inDesktop = desktopSearchRef.current?.contains(target)
      const inMobile = mobileSearchRef.current?.contains(target)
      if (!inDesktop && !inMobile) {
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Lazy load products for search preview suggestions
  const handleSearchFocus = async () => {
    setIsFocused(true)
    if (suggestProducts.length === 0) {
      try {
        const snap = await getDocs(collection(db, "products"))
        const prods = snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id }))
        setSuggestProducts(prods)
      } catch (err) {
        console.warn("Could not load search suggestions:", err)
      }
    }
  }

  // Filter suggestions matching searchVal
  const suggestions = useMemo(() => {
    const q = searchVal.trim().toLowerCase()
    if (!q) return []
    return suggestProducts
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      )
      .slice(0, 5)
  }, [searchVal, suggestProducts])

  // Handle typing in search input
  const handleSearchChange = (val: string) => {
    setSearchVal(val)
    if (location.pathname === "/") {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (val.trim()) {
            next.set("q", val)
          } else {
            next.delete("q")
          }
          return next
        },
        { replace: true }
      )
    }
  }

  // Handle submitting search
  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    setIsFocused(false)
    const q = searchVal.trim()
    if (location.pathname === "/") {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (q) next.set("q", q)
        else next.delete("q")
        return next
      })
      document.getElementById("store-catalog")?.scrollIntoView({ behavior: "smooth" })
    } else {
      navigate(q ? `/?q=${encodeURIComponent(q)}` : "/")
    }
  }

  const handleSelectSuggestion = (pId: string) => {
    setIsFocused(false)
    navigate(`/product/${pId}`)
  }

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

      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur shadow-2xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* LOGO — dynamic from Firestore */}
          <button
            onClick={() => go("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 cursor-pointer"
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

          {/* ── DESKTOP SEARCH BAR (Beside Brand Logo) ── */}
          <div ref={desktopSearchRef} className="hidden md:flex flex-1 max-w-md lg:max-w-lg mx-6 relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder='Search "honey", "vegetables", "milk"...'
                value={searchVal}
                onFocus={handleSearchFocus}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full h-10 pl-10 pr-9 rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 focus:bg-background text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground h-5 w-5 flex items-center justify-center rounded-full bg-muted/70 cursor-pointer"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </form>

            {/* Suggestions Dropdown (Desktop) */}
            {isFocused && searchVal.trim() && suggestions.length > 0 && (
              <div className="absolute top-12 left-0 right-0 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 divide-y divide-border/60">
                  {suggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSuggestion(item.id)}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors"
                    >
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border/60">
                        {item.images?.[0] || item.image ? (
                          <img
                            src={item.images?.[0] || item.image}
                            alt={item.name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <Search className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                        {item.category && (
                          <span className="text-[10px] font-semibold text-primary block truncate">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-foreground">
                          {formatPrice(item.price, settings.currency, settings.currencyLocale)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  onClick={handleSearchSubmit}
                  className="border-t border-border/60 bg-muted/30 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-muted cursor-pointer flex items-center justify-between"
                >
                  <span>See all matching results for &quot;{searchVal}&quot;</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}
          </div>

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

        {/* ── MOBILE SEARCH BAR (Quick-Commerce Style, Thumb-Friendly) ── */}
        <div ref={mobileSearchRef} className="md:hidden px-4 pb-2.5 pt-0 relative">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder='Search products, groceries...'
              value={searchVal}
              onFocus={handleSearchFocus}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-9 rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 focus:bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground h-5 w-5 flex items-center justify-center rounded-full bg-muted/70 cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </form>

          {/* Suggestions Dropdown (Mobile) */}
          {isFocused && searchVal.trim() && suggestions.length > 0 && (
            <div className="absolute top-12 left-4 right-4 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 max-h-72 overflow-y-auto">
              <div className="p-2 divide-y divide-border/60">
                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item.id)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border/60">
                      {item.images?.[0] || item.image ? (
                        <img
                          src={item.images?.[0] || item.image}
                          alt={item.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Search className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                      {item.category && (
                        <span className="text-[10px] font-semibold text-primary block truncate">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-foreground">
                        {formatPrice(item.price, settings.currency, settings.currencyLocale)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div
                onClick={handleSearchSubmit}
                className="border-t border-border/60 bg-muted/30 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-muted cursor-pointer flex items-center justify-between"
              >
                <span>See all results for &quot;{searchVal}&quot;</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {open && (
        <div className="fixed inset-0 top-[108px] md:top-16 z-40 md:hidden">
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
