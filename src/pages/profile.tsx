
import React from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {auth} from "../firebase/fb"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import {
  ShoppingBag,
  Heart,
  MapPin,
  Mail,
  Phone,
  LogOut,
  Package,
  ArrowLeft,
} from "lucide-react"

const orders = [
  {
    id: "#ORD-1024",
    date: "16 Sep 2026",
    status: "Delivered",
    total: 7999,
    items: 1,
  },
  {
    id: "#ORD-1021",
    date: "10 Sep 2026",
    status: "Shipped",
    total: 32999,
    items: 1,
  },
  {
    id: "#ORD-1018",
    date: "02 Sep 2026",
    status: "Delivered",
    total: 11998,
    items: 2,
  },
]


function Profile() {
 if(auth.currentUser){
  
 }
  return (
    <div className="min-h-screen bg-background">

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

          {/* LOGO */}
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight"
          >
            Shop<span className="text-primary">.</span>
          </Link>

          {/* NAV */}
          <div className="flex items-center gap-2">
            <Button variant="outline" >
              <Link to="/Cart">
                Cart
              </Link>
            </Button>

            <Button >
              <Link to="/Profile">
                Profile
              </Link>
            </Button>
          </div>

        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* BACK */}
        <Button
          variant="ghost"
          
          className="-ml-3 mb-6"
        >
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            My Account
          </h1>

          <p className="mt-2 text-muted-foreground">
            Manage your account, orders and preferences.
          </p>
        </div>

        {/* PROFILE + QUICK STATS */}
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

          {/* PROFILE CARD */}
          <Card className="h-fit">

            <CardContent className="flex flex-col items-center p-6 text-center">

              <Avatar className="h-24 w-24">
                <AvatarImage
                  src="https://github.com/shadcn.png"
                  alt="Profile"
                />
                <AvatarFallback>
                  IS
                </AvatarFallback>
              </Avatar>

              <h2 className="mt-4 text-xl font-semibold">
                {auth.currentUser?.displayName}
              </h2>

              <p className="text-sm text-muted-foreground">
                {auth.currentUser?.email}
              </p>

              <Badge className="mt-3" variant="secondary">
                Premium Member
              </Badge>

              <Button
                variant="outline"
                className="mt-6 w-full"
              >
                Edit Profile
              </Button>

              <Button
                variant="ghost"
                className="mt-2 w-full text-destructive hover:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>

            </CardContent>

          </Card>

          {/* RIGHT CONTENT */}
          <div className="space-y-6">

            {/* ACCOUNT INFO */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Personal Information
                </CardTitle>
              </CardHeader>

              <CardContent>

                <div className="grid gap-6 sm:grid-cols-2">

                  <div className="flex items-start gap-3">
                    <Mail className="mt-1 h-5 w-5 text-muted-foreground" />

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Email
                      </p>
                      <p className="font-medium">
                        {auth.currentUser?.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="mt-1 h-5 w-5 text-muted-foreground" />

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Phone
                      </p>
                      <p className="font-medium">
                        {auth.currentUser?.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-5 w-5 text-muted-foreground" />

                    <div>
                      <p className="text-sm text-muted-foreground">
                        UUID
                      </p>
                      <p className="font-medium">
                        {auth.currentUser?.uid}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Package className="mt-1 h-5 w-5 text-muted-foreground" />

                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Orders
                      </p>
                      <p className="font-medium">
                        12 Orders
                      </p>
                    </div>
                  </div>

                </div>

              </CardContent>
            </Card>

            {/* TABS */}
            <Tabs defaultValue="orders" className="w-full">

              <TabsList className="grid w-full grid-cols-2 ">
                <TabsTrigger value="orders">
                  Orders
                </TabsTrigger>

                <TabsTrigger value="wishlist">
                  Wishlist
                </TabsTrigger>
              </TabsList>

              {/* ORDERS */}
              <TabsContent value="orders" className="mt-6">

                <Card>

                  <CardHeader>
                    <CardTitle>
                      Recent Orders
                    </CardTitle>
                  </CardHeader>

                  <CardContent>

                    <div className="space-y-5">

                      {orders.map((order, index) => (

                        <React.Fragment key={order.id}>

                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                            <div className="flex items-center gap-4">

                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted">
                                <ShoppingBag className="h-5 w-5" />
                              </div>

                              <div>
                                <p className="font-semibold">
                                  {order.id}
                                </p>

                                <p className="text-sm text-muted-foreground">
                                  {order.date} · {order.items}{" "}
                                  {order.items === 1
                                    ? "item"
                                    : "items"}
                                </p>
                              </div>

                            </div>

                            <div className="flex items-center gap-4">

                              <Badge
                                variant={
                                  order.status === "Delivered"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {order.status}
                              </Badge>

                              <p className="font-semibold">
                                ₹{order.total.toLocaleString("en-IN")}
                              </p>

                              <Button
                                variant="outline"
                                size="sm"
                              >
                                View
                              </Button>

                            </div>

                          </div>

                          {index !== orders.length - 1 && (
                            <Separator />
                          )}

                        </React.Fragment>

                      ))}

                    </div>

                  </CardContent>

                </Card>

              </TabsContent>

              {/* WISHLIST */}
              <TabsContent value="wishlist" className="mt-6">

                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">

                    <Heart className="h-12 w-12 text-muted-foreground" />

                    <h3 className="mt-4 text-xl font-semibold">
                      Your wishlist is empty
                    </h3>

                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      Save products you love and come back to
                      them later.
                    </p>

                    <Button  className="mt-6">
                      <Link to="/">
                        Browse Products
                      </Link>
                    </Button>

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
