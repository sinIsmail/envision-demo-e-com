import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/fb";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageURL from "@/components/imageUrl";

import {
  collection,
  addDoc,
  getCountFromServer,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase/fb";
import { toast } from "@/components/ui/toast";

// ---------- XLSX export (lazy import) ----------
async function exportToExcel(rows: any[], filename: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, filename);
}

// =============================================
// TAB 1 — ADD PRODUCT
// =============================================
function ProductsTab() {
  const [product, setProduct] = useState({
    proName: "",
    proPrice: "",
    proStock: "",
    proDescription: "",
  });
  const [loading, setLoading] = useState(false);
  const [imgURL, setImgURL] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProducts = async () => {
    const snap = await getDocs(collection(db, "products"));
    setProducts(snap.docs.map((d) => ({ docId: d.id, ...d.data() })));
  };

  useEffect(() => { fetchProducts(); }, []);

  const addProductHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imgURL) {
      toast.add({ title: "Image required", description: "Please select a product image." });
      return;
    }
    try {
      setLoading(true);
      const productCollection = collection(db, "products");
      const snapshot = await getCountFromServer(productCollection);
      const generatedId = String(snapshot.data().count + 1).padStart(2, "0");

      await addDoc(productCollection, {
        id: generatedId,
        name: product.proName,
        price: Number(product.proPrice),
        stock: Number(product.proStock),
        description: product.proDescription,
        image: imgURL,
      });

      setProduct({ proName: "", proPrice: "", proStock: "", proDescription: "" });
      setImgURL("");
      toast.add({ title: "Product added", description: `Product ${generatedId} published.` });
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.add({ title: "Upload failed", description: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (docId: string) => {
    try {
      setDeleting(docId);
      await deleteDoc(doc(db, "products", docId));
      setProducts((prev) => prev.filter((p) => p.docId !== docId));
      toast.add({ title: "Deleted", description: "Product removed." });
    } catch (error) {
      console.error(error);
      toast.add({ title: "Delete failed", description: "Could not delete product." });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">

      {/* ADD FORM */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Add New Product</CardTitle>
          <CardDescription>Upload and publish directly to Firestore.</CardDescription>
        </CardHeader>
        <form onSubmit={addProductHandler}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" placeholder="e.g. Wireless Keyboard" value={product.proName}
                onChange={(e) => setProduct({ ...product, proName: e.target.value })}
                disabled={loading} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Key features..." value={product.proDescription}
                onChange={(e) => setProduct({ ...product, proDescription: e.target.value })}
                disabled={loading} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input id="price" type="number" step="0.01" min="0" placeholder="0.00"
                  value={product.proPrice}
                  onChange={(e) => setProduct({ ...product, proPrice: e.target.value })}
                  disabled={loading} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" type="number" min="0" placeholder="0"
                  value={product.proStock}
                  onChange={(e) => setProduct({ ...product, proStock: e.target.value })}
                  disabled={loading} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product Image</Label>
              <ImageURL onSelectImg={(file) => setImgURL(file)} />
              {imgURL && <p className="break-all text-xs text-muted-foreground">{imgURL}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Publishing..." : "Upload Product"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* PRODUCT LIST */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">All Products</CardTitle>
          <CardDescription>{products.length} product(s) in store</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No products yet.</p>
            )}
            {products.map((p) => (
              <div key={p.docId} className="flex items-center gap-4 rounded-lg border p-3">
                <img src={p.image} alt={p.name} className="h-14 w-14 rounded-md object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-sm text-muted-foreground">₹{Number(p.price).toLocaleString("en-IN")} · Stock: {p.stock}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleting === p.docId}
                  onClick={() => deleteProduct(p.docId)}
                >
                  {deleting === p.docId ? "..." : "Delete"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

// =============================================
// TAB 2 — USERS
// =============================================
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err: any) {
        console.error(err);
        if (err.code === "permission-denied") {
          setError("permission-denied");
        } else {
          setError("unknown");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return (
    <div className="flex justify-center p-8">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (error === "permission-denied") {
    return (
      <Card className="shadow-md">
        <CardContent className="py-10 text-center space-y-3">
          <p className="text-lg font-semibold text-destructive">⚠ Permission Denied</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Firestore rules are blocking this read. Go to{" "}
            <strong>Firebase Console → Firestore → Rules</strong> and set:
          </p>
          <pre className="mx-auto max-w-md rounded-md bg-muted p-3 text-left text-xs text-muted-foreground whitespace-pre-wrap">
{`match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null
    && request.auth.uid == userId;
}`}
          </pre>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Registered Users</CardTitle>
        <CardDescription>
          {users.length} user(s) total
          {users.length === 0 && " — Users appear here when they sign up or log in."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">#</th>
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">Email</th>
                <th className="pb-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">
                  No users yet. Users are saved automatically when they sign up or log in.
                </td></tr>
              )}
              {users.map((u, i) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="py-3 pr-4 text-muted-foreground">{i + 1}</td>
                  <td className="py-3 pr-4 font-medium">{u.name || "—"}</td>
                  <td className="py-3 pr-4">{u.email || "—"}</td>
                  <td className="py-3 text-muted-foreground">
                    {u.createdAt?.toDate
                      ? u.createdAt.toDate().toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// TAB 3 — ORDERS

// =============================================
type DateFilter = "today" | "7days" | "all";

function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>("all");

  const fetchOrders = async (f: DateFilter) => {
    setLoading(true);
    try {
      let q;
      const col = collection(db, "orders");

      if (f === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        q = query(col, where("createdAt", ">=", Timestamp.fromDate(start)), orderBy("createdAt", "desc"));
      } else if (f === "7days") {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        q = query(col, where("createdAt", ">=", Timestamp.fromDate(start)), orderBy("createdAt", "desc"));
      } else {
        q = query(col, orderBy("createdAt", "desc"));
      }

      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.add({ title: "Error", description: "Could not load orders." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(filter); }, [filter]);

  const handleExport = async () => {
    const rows = orders.map((o, i) => ({
      "#": i + 1,
      "Order ID": o.id,
      "Customer": o.userName || o.userEmail || "—",
      "Email": o.userEmail || "—",
      "Items": (o.items ?? []).map((it: any) => `${it.name} x${it.quantity}`).join(", "),
      "Subtotal (₹)": o.subtotal ?? 0,
      "Shipping (₹)": o.shipping ?? 0,
      "Total (₹)": o.total ?? 0,
      "Date": o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("en-IN") : "—",
    }));
    const today = new Date().toISOString().slice(0, 10);
    await exportToExcel(rows, `orders-${filter}-${today}.xlsx`);
    toast.add({ title: "Downloaded", description: `orders-${filter}-${today}.xlsx` });
  };

  const filterLabel: Record<DateFilter, string> = {
    today: "Today",
    "7days": "Last 7 Days",
    all: "All Time",
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Orders</CardTitle>
            <CardDescription>{orders.length} order(s) · {filterLabel[filter]}</CardDescription>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {(["today", "7days", "all"] as DateFilter[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {filterLabel[f]}
              </Button>
            ))}
          </div>

          {/* Export Button */}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={orders.length === 0}>
            ⬇ Export Excel
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Loading orders...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">#</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Items</th>
                  <th className="pb-3 pr-4 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No orders found.</td></tr>
                )}
                {orders.map((o, i) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-3 pr-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{o.userName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{o.userEmail || ""}</p>
                    </td>
                    <td className="py-3 pr-4 max-w-[200px]">
                      <p className="truncate text-muted-foreground text-xs">
                        {(o.items ?? []).map((it: any) => `${it.name} ×${it.quantity}`).join(", ")}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold">
                      ₹{Number(o.total ?? 0).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 text-muted-foreground whitespace-nowrap">
                      {o.createdAt?.toDate
                        ? o.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// ROOT ADMIN PAGE
// =============================================
export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleSignout = async () => {
    await signOut(auth);
    localStorage.removeItem("token");
    navigate("/Login");
  };

  return (
    <div className="min-h-screen bg-muted/30">

      {/* ADMIN HEADER */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <span className="text-xl font-bold tracking-tight">
            Shop<span className="text-primary">.</span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">Admin</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to Store
            </button>
            <button
              onClick={handleSignout}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Manage products, users, and orders</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products">
          <TabsList className="mb-6">
            <TabsTrigger value="products">📦 Products</TabsTrigger>
            <TabsTrigger value="users">👥 Users</TabsTrigger>
            <TabsTrigger value="orders">🧾 Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
