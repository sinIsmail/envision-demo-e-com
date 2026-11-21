import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { signOut, updateProfile } from "firebase/auth"
import { collection, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import Navbar from "@/components/Navbar"

import { auth, db } from "@/firebase/fb"
import { useAuth } from "@/context/AuthContext"
import {
  ShoppingBag,
  Mail,
  LogOut,
  Package,
  ArrowLeft,
  ChevronRight,
  FileText,
  Phone,
  User as UserIcon,
  Edit3,
  AlertCircle,
} from "lucide-react"

import { type Order, effectiveStatus } from "@/types/order"
import { OrderStatusBadge } from "@/Admin/components/OrderStatusBadge"
import { OrderDetailModal } from "@/pages/OrderDetailModal"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { downloadOrderBill } from "@/lib/pdfBillGenerator"

function Profile() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { settings } = useSiteSettings()

  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Profile data states
  const [profileName, setProfileName] = useState<string>(user?.displayName || "")
  const [profilePhone, setProfilePhone] = useState<string>(user?.phoneNumber || "")

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [formName, setFormName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  // Fetch Firestore user doc
  useEffect(() => {
    if (!user) return
    let isMounted = true

    const fetchProfile = async () => {
      try {
        const userRef = doc(db, "users", user.uid)
        const snap = await getDoc(userRef)
        if (snap.exists() && isMounted) {
          const data = snap.data()
          const name = data.name || user.displayName || ""
          const phone = data.phone || user.phoneNumber || ""
          setProfileName(name)
          setProfilePhone(phone)
          setFormName(name)
          setFormPhone(phone)
        } else if (isMounted) {
          const name = user.displayName || ""
          const phone = user.phoneNumber || ""
          setProfileName(name)
          setProfilePhone(phone)
          setFormName(name)
          setFormPhone(phone)
        }
      } catch (err) {
        console.error("Error fetching user profile:", err)
      }
    }

    fetchProfile()
    return () => {
      isMounted = false
    }
  }, [user])

  // Fetch orders
  useEffect(() => {
    if (!user) return
    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid)
        )
        const snap = await getDocs(q)
        const fetched = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Order))
        fetched.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0
          const bTime = b.createdAt?.toMillis?.() ?? 0
          return bTime - aTime
        })
        setOrders(fetched)
      } catch (err) {
        console.error("Orders fetch error:", err)
      } finally {
        setOrdersLoading(false)
      }
    }
    fetchOrders()
  }, [user])

  const handleSignout = async () => {
    await signOut(auth)
    navigate("/Login")
  }

  const openEditModal = () => {
    setFormName(profileName)
    setFormPhone(profilePhone)
    setFormError("")
    setEditModalOpen(true)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const cleanName = formName.trim()
    const cleanPhone = formPhone.trim()

    if (cleanName.length < 2) {
      setFormError("Please enter your full name (at least 2 characters).")
      return
    }

    const digitsOnly = cleanPhone.replace(/\D/g, "")
    if (digitsOnly.length < 10) {
      setFormError("Please enter a valid phone number with at least 10 digits.")
      return
    }

    setFormError("")
    setSaving(true)
    try {
      // 1. Update Firestore user document
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: cleanName,
          phone: cleanPhone,
          email: user.email ?? "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )

      // 2. Update Firebase Auth displayName
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: cleanName,
        })
      }

      // 3. Refresh AuthContext state across the app
      await refreshUser()

      setProfileName(cleanName)
      setProfilePhone(cleanPhone)
      setEditModalOpen(false)

      toast.add({
        title: "Profile updated ✓",
        description: "Your name and phone number have been saved successfully.",
      })
    } catch (err: any) {
      console.error("Profile save error:", err)
      setFormError(err.message || "Failed to update profile. Please try again.")
      toast.add({
        title: "Update failed",
        description: "Could not save your profile changes.",
      })
    } finally {
      setSaving(false)
    }
  }

  const displayName = profileName || user?.displayName || "User"
  const initials = displayName
    ? displayName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0] ?? "U").toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">My Account</h1>
            <p className="mt-1 text-muted-foreground text-sm">Manage your contact information, profile, and order history.</p>
          </div>
          <Button onClick={openEditModal} className="rounded-full px-5 gap-2 shrink-0 self-start sm:self-auto font-bold active:scale-95 shadow-md">
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
          {/* PROFILE CARD */}
          <Card className="h-fit rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl overflow-hidden">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <Avatar className="h-24 w-24 text-2xl border-2 border-primary/20 shadow-md">
                <AvatarImage src={user?.photoURL ?? ""} alt="Profile" />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <h2 className="mt-4 text-xl font-bold">{displayName}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground break-all">{user?.email}</p>

              {/* Phone display */}
              {profilePhone ? (
                <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>{profilePhone}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-0.5 rounded-full transition-colors"
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>Add phone number</span>
                </button>
              )}

              <Badge className="mt-3 rounded-full px-3 py-0.5 font-bold" variant="secondary">
                Member
              </Badge>

              <Separator className="my-4 w-full" />

              <div className="flex w-full justify-around">
                <div className="text-center">
                  <p className="text-2xl font-black">{orders.length}</p>
                  <p className="text-xs text-muted-foreground font-medium">Orders</p>
                </div>
              </div>

              <Separator className="my-4 w-full" />

              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full gap-1.5 text-xs mb-2 font-semibold active:scale-95"
                onClick={openEditModal}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold active:scale-95"
                onClick={handleSignout}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* PERSONAL INFO */}
            <Card className="rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your name and contact phone number used for delivery and order notices
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full gap-1.5 text-xs font-semibold active:scale-95" onClick={openEditModal}>
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Details
                </Button>
              </CardHeader>

              <CardContent>
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Full Name */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Full Name</p>
                      <p className="font-semibold text-sm text-foreground truncate mt-0.5">
                        {displayName}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Phone Number</p>
                      {profilePhone ? (
                        <p className="font-semibold text-sm text-foreground truncate mt-0.5">
                          {profilePhone}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Not provided
                          </span>
                          <button
                            type="button"
                            onClick={openEditModal}
                            className="text-xs text-primary font-semibold underline hover:opacity-80"
                          >
                            Add Phone
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Email</p>
                      <p className="font-semibold text-sm text-foreground break-all mt-0.5">
                        {user?.email ?? "—"}
                      </p>
                    </div>
                  </div>

                  {/* Total Orders */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Package className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
                      <p className="font-semibold text-sm text-foreground mt-0.5">
                        {orders.length} order{orders.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {!profilePhone && (
                  <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Phone number is required for placing orders</p>
                      <p className="text-[11px] text-amber-900/80 dark:text-amber-200 mt-0.5">
                        Store delivery and checkout confirmation require a valid contact phone number. Please add your phone number above.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/40 shrink-0" onClick={openEditModal}>
                      Add Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ORDERS TAB */}
            <Tabs defaultValue="orders">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="orders">Orders</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-4">
                <Card className="rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl overflow-hidden">
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    {!ordersLoading && orders.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Tap an order to view details, invoice, and track shipment status
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {ordersLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="flex flex-col items-center py-12 text-center">
                        <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                        <h3 className="mt-3 text-lg font-semibold">No orders yet</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Your orders will appear here after checkout.
                        </p>
                        <Button className="mt-4 rounded-full font-bold px-6 active:scale-95 shadow-md" onClick={() => navigate("/")}>
                          Start Shopping
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order, idx) => {
                          const status = effectiveStatus(order)
                          return (
                            <React.Fragment key={order.id}>
                              {/* Clickable order row */}
                              <div
                                className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-zinc-800/40 p-4 cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-zinc-800/80 hover:shadow-md hover:border-black/20 dark:hover:border-white/20"
                                onClick={() => setSelectedOrder(order)}
                              >
                                {/* Icon */}
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                                  <ShoppingBag className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm">
                                    #{order.id.slice(-8).toUpperCase()}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {order.createdAt?.toDate
                                      ? order.createdAt
                                          .toDate()
                                          .toLocaleDateString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                          })
                                      : "—"}
                                    {" · "}
                                    {(order.items ?? []).length} item
                                    {(order.items ?? []).length !== 1 ? "s" : ""}
                                  </p>
                                </div>

                                {/* Status + Total + Arrow */}
                                <div className="flex items-center gap-2.5 shrink-0">
                                  <OrderStatusBadge status={status} />
                                  <p className="font-bold text-sm hidden sm:block">
                                    ₹{Number(order.total ?? 0).toLocaleString("en-IN")}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      downloadOrderBill(order, settings)
                                    }}
                                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 active:scale-95 transition-all"
                                    title="Download Bill (PDF)"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Bill (PDF)</span>
                                  </button>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                              </div>
                              {idx !== orders.length - 1 && <Separator className="my-0" />}
                            </React.Fragment>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Edit Profile Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Profile Details</DialogTitle>
            <DialogDescription className="text-xs">
              Update your display name and contact phone number. Phone number is required for order confirmation and delivery.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            {formError && (
              <div className="rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full Name *</Label>
              <Input
                id="profile-name"
                type="text"
                placeholder="Your full name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="rounded-full px-4.5"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Phone Number *</Label>
              <Input
                id="profile-phone"
                type="tel"
                placeholder="e.g. 9876543210 or +91 9876543210"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                required
                className="rounded-full px-4.5"
              />
              <p className="text-[11px] text-muted-foreground">
                Must be at least 10 digits. Used for delivery coordination and order updates.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email (Account ID)</Label>
              <Input
                id="profile-email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed rounded-full px-4.5"
              />
              <p className="text-[11px] text-muted-foreground">
                Email is tied to your account login.
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={saving}
                className="rounded-full font-semibold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="rounded-full font-bold gap-1.5 active:scale-95 shadow-md">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  )
}

export default Profile
