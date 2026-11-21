import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase/fb";
import { useAuth } from "@/context/AuthContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { collection, getDocs } from "firebase/firestore";
import {
  Package,
  AlertTriangle,
  ShoppingBag,
  TrendingUp,
  Store,
  LogOut,
  Layers,
  Users,
  Settings as SettingsIcon,
  Code,
  Palette,
} from "lucide-react";

import { ProductsTab } from "./tabs/ProductsTab";
import { InventoryTab } from "./tabs/InventoryTab";
import { UsersTab } from "./tabs/UsersTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { DesignTab } from "./tabs/DesignTab";
import { SiteSettingsTab } from "./tabs/SiteSettingsTab";
import { DeveloperTab } from "./tabs/DeveloperTab";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [activeTab, setActiveTab] = useState("products");

  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStockCount: 0,
    totalOrders: 0,
    totalRevenue: 0,
    loading: true,
  });

  const loadStats = async () => {
    try {
      const [prodSnap, orderSnap] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "orders")),
      ]);

      let lowCount = 0;
      prodSnap.docs.forEach((d) => {
        const data = d.data();
        const stock =
          data.hasVariants && data.unitVariants
            ? data.unitVariants.reduce(
                (sum: number, v: any) => sum + (Number(v.stock) || 0),
                0
              )
            : Number(data.stock) || 0;
        if (stock < 5) lowCount++;
      });

      let revenue = 0;
      orderSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.status !== "cancelled") {
          revenue += Number(data.total) || 0;
        }
      });

      setStats({
        totalProducts: prodSnap.size,
        lowStockCount: lowCount,
        totalOrders: orderSnap.size,
        totalRevenue: revenue,
        loading: false,
      });
    } catch (err) {
      console.warn("Could not load stats:", err);
      setStats((p) => ({ ...p, loading: false }));
    }
  };

  useEffect(() => {
    loadStats();
  }, [activeTab]);

  const handleSignout = async () => {
    await signOut(auth);
    localStorage.removeItem("token");
    navigate("/Login");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ADMIN HEADER */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.brandName}
                className="h-8 w-auto object-contain rounded"
              />
            ) : null}
            <span className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {settings.brandName || "Shop."}
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                Admin
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="hidden text-xs text-muted-foreground md:block">
                {user.email}
              </span>
            )}
            <button
              onClick={() => navigate("/")}
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Back to</span> Store
            </button>
            <button
              onClick={handleSignout}
              className="rounded-lg bg-destructive px-3 py-1.5 text-xs sm:text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign</span> Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Admin Operations Center
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage inventory, add stock, update product photos, and fulfill orders.
            </p>
          </div>
        </div>

        {/* Executive KPI Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Products */}
          <Card
            onClick={() => setActiveTab("products")}
            className="cursor-pointer hover:border-primary/50 transition-all p-4 shadow-sm bg-card hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Catalog Products</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats.loading ? "..." : stats.totalProducts}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Active catalog items</p>
            </div>
          </Card>

          {/* Card 2: Stock Alerts (Clickable to jump to inventory) */}
          <Card
            onClick={() => setActiveTab("inventory")}
            className={`cursor-pointer transition-all p-4 shadow-sm bg-card hover:shadow-md border ${
              stats.lowStockCount > 0
                ? "border-amber-300/80 bg-amber-50/10 dark:border-amber-900/50 hover:border-amber-400"
                : "hover:border-primary/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Stock Alerts</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                stats.lowStockCount > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" : "bg-muted text-muted-foreground"
              }`}>
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-2xl font-bold tracking-tight ${stats.lowStockCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
                {stats.loading ? "..." : stats.lowStockCount}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stats.lowStockCount > 0 ? "Items need restocking" : "All stocks healthy"}
              </p>
            </div>
          </Card>

          {/* Card 3: Total Orders */}
          <Card
            onClick={() => setActiveTab("orders")}
            className="cursor-pointer hover:border-primary/50 transition-all p-4 shadow-sm bg-card hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Orders Count</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats.loading ? "..." : stats.totalOrders}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Customer orders recorded</p>
            </div>
          </Card>

          {/* Card 4: Store Revenue */}
          <Card
            onClick={() => setActiveTab("orders")}
            className="cursor-pointer hover:border-primary/50 transition-all p-4 shadow-sm bg-card hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Revenue Generated</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold tracking-tight text-foreground truncate block">
                {stats.loading ? "..." : `₹${stats.totalRevenue.toLocaleString("en-IN")}`}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Excludes cancelled orders</p>
            </div>
          </Card>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="flex w-max min-w-full sm:w-auto sm:min-w-0 p-1 bg-muted/60">
              <TabsTrigger value="products" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                Products & Catalog
              </TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                ⚡ Quick Stock & Inventory
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs sm:text-sm flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" />
                Orders & Delivery
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="design" className="text-xs sm:text-sm flex items-center gap-1.5 font-semibold text-primary">
                <Palette className="h-4 w-4" />
                🎨 Design & Appearance
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm flex items-center gap-1.5">
                <SettingsIcon className="h-4 w-4" />
                Store Settings
              </TabsTrigger>
              <TabsTrigger value="developer" className="text-xs sm:text-sm flex items-center gap-1.5">
                <Code className="h-4 w-4" />
                Developer & API
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryTab />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="design">
            <DesignTab />
          </TabsContent>

          <TabsContent value="settings">
            <SiteSettingsTab />
          </TabsContent>

          <TabsContent value="developer">
            <DeveloperTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
