import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import { auth } from "@/firebase/fb"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Menu, X, ShoppingCart, User, LogOut } from "lucide-react"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const handleSignout = async () => {
    setOpen(false)
    await signOut(auth)
    navigate("/Login")
  }

  const isActive = (path: string) => location.pathname === path

  const navLinks = [
    { to: "/Profile", label: "Profile", icon: <User className="h-4 w-4" /> },
    { to: "/Cart", label: "Cart", icon: <ShoppingCart className="h-4 w-4" /> },
  ]

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* LOGO */}
        <button onClick={() => navigate("/")} className="text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
          Shop<span className="text-primary">.</span>
        </button>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-2">
          {user && (
            <span className="mr-2 text-sm text-muted-foreground hidden lg:block truncate max-w-[160px]">
              {user.displayName ?? user.email}
            </span>
          )}
          {navLinks.map((link) => (
            <Button
              key={link.to}
              variant={isActive(link.to) ? "default" : "outline"}
              size="sm"
              onClick={() => navigate(link.to)}
              className="flex items-center gap-1.5"
            >
              {link.icon}
              {link.label}
            </Button>
          ))}
          <Button variant="destructive" size="sm" onClick={handleSignout} className="flex items-center gap-1.5">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </nav>

        {/* MOBILE HAMBURGER */}
        <button
          className="md:hidden flex items-center justify-center rounded-md p-2 hover:bg-muted transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {open && (
        <div className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
          {user && (
            <p className="px-3 py-2 text-sm text-muted-foreground truncate">
              {user.displayName ?? user.email}
            </p>
          )}
          {navLinks.map((link) => (
            <button
              key={link.to}
              onClick={() => { navigate(link.to); setOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(link.to) ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {link.icon}
              {link.label}
            </button>
          ))}
          <button
            onClick={handleSignout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </header>
  )
}
