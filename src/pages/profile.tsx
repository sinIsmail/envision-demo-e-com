import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import { collection, getDocs, query, where } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Navbar from "@/components/Navbar"

import { auth, db } from "@/firebase/fb"
import { useAuth } from "@/context/AuthContext"
import { ShoppingBag, Heart, Mail, LogOut, Package, ArrowLeft } from "lucide-react"

function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid)
        )
        const snap = await getDocs(q)
        const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() as any }))
        // Sort newest first client-side (avoids needing a composite index)
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

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? "U").toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        <Button variant="ghost" size="sm" className="-ml-2 mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
          <p className="mt-1 text-muted-foreground">Manage your account and orders.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">

          {/* PROFILE CARD */}
          <Card className="h-fit">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <Avatar className="h-24 w-24 text-2xl">
                <AvatarImage src={user?.photoURL ?? ""} alt="Profile" />
                <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-semibold">{user?.displayName ?? "User"}</h2>
              <p className="mt-1 text-sm text-muted-foreground break-all">{user?.email}</p>
              <Badge className="mt-3" variant="secondary">Member</Badge>
              <Separator className="my-4 w-full" />
              <div className="flex w-full justify-around">
                <div className="text-center">
                  <p className="text-2xl font-bold">{orders.length}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
              </div>
              <Separator className="my-4 w-full" />
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignout}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* RIGHT */}
          <div className="space-y-6">

            {/* PERSONAL INFO */}
            <Card>
              <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium break-all">{user?.email ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Package className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="font-medium">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TABS */}
            <Tabs defaultValue="orders">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-4">
                <Card>
                  <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
                  <CardContent>
                    {ordersLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="flex flex-col items-center py-12 text-center">
                        <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                        <h3 className="mt-3 text-lg font-semibold">No orders yet</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Your orders will appear here after checkout.</p>
                        <Button className="mt-4" onClick={() => navigate("/")}>Start Shopping</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((order, idx) => (
                          <React.Fragment key={order.id}>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                  <ShoppingBag className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-semibold text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {order.createdAt?.toDate
                                      ? order.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                      : "—"}
                                    {" · "}{(order.items ?? []).length} item{(order.items ?? []).length !== 1 ? "s" : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 pl-13 sm:pl-0">
                                <Badge>Placed</Badge>
                                <p className="font-bold">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</p>
                              </div>
                            </div>
                            {idx !== orders.length - 1 && <Separator />}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="wishlist" className="mt-4">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Heart className="h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">Your wishlist is empty</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Save products you love.</p>
                    <Button className="mt-6" onClick={() => navigate("/")}>Browse Products</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

          </div>
        </div>
      </main>
    </div>
  )
}

export default Profile
