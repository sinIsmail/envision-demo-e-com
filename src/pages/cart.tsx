import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

import {
  collection, getDocs, updateDoc, deleteDoc,
  addDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/fb";
import { toast } from "@/components/ui/toast";
import { Trash2, Minus, Plus, ShoppingBag, MapPin, Plus as PlusIcon, CheckCircle2, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

const EMPTY_ADDRESS = { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

// ─── Address Form ─────────────────────────────────────────────────────
function AddressForm({ onSave, onCancel }: { onSave: (a: Omit<Address, "id">) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState(EMPTY_ADDRESS);
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
      toast.add({ title: "Fill all required fields", description: "Name, phone, address, city, state and pincode are required." });
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <p className="font-semibold text-sm">New Delivery Address</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="addr-name">Full Name *</Label>
          <Input id="addr-name" placeholder="John Doe" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="addr-phone">Phone *</Label>
          <Input id="addr-phone" placeholder="9876543210" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="addr-line1">Address Line 1 *</Label>
          <Input id="addr-line1" placeholder="House No, Street Name" value={form.line1} onChange={(e) => set("line1", e.target.value)} required />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="addr-line2">Address Line 2 (optional)</Label>
          <Input id="addr-line2" placeholder="Landmark, Area" value={form.line2} onChange={(e) => set("line2", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="addr-city">City *</Label>
          <Input id="addr-city" placeholder="Mumbai" value={form.city} onChange={(e) => set("city", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="addr-state">State *</Label>
          <Input id="addr-state" placeholder="Maharashtra" value={form.state} onChange={(e) => set("state", e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="addr-pincode">Pincode *</Label>
          <Input id="addr-pincode" placeholder="400001" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} required />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving..." : "Save Address"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}><X className="mr-1.5 h-3 w-3" />Cancel</Button>
      </div>
    </form>
  );
}

// ─── Address Picker ───────────────────────────────────────────────────
function AddressPicker({ uid, selectedId, onSelect }: { uid: string; selectedId: string; onSelect: (a: Address) => void }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const addrCol = () => collection(db, "users", uid, "addresses");

  const fetchAddresses = async () => {
    const snap = await getDocs(addrCol());
    const list: Address[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Address));
    setAddresses(list);
    setLoading(false);
    // Auto-select first if nothing selected
    if (list.length === 1) onSelect(list[0]);
  };

  useEffect(() => { fetchAddresses(); }, [uid]);

  const saveAddress = async (form: Omit<Address, "id">) => {
    const ref = await addDoc(addrCol(), { ...form, createdAt: serverTimestamp() });
    const newAddr: Address = { id: ref.id, ...form };
    setAddresses((prev) => [...prev, newAddr]);
    onSelect(newAddr);
    setShowForm(false);
    toast.add({ title: "Address saved ✓", description: `${form.name}, ${form.city}` });
  };

  const deleteAddress = async (id: string) => {
    await deleteDoc(doc(db, "users", uid, "addresses", id));
    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);
    if (selectedId === id) onSelect(updated[0] ?? ({} as Address));
    toast.add({ title: "Address removed" });
  };

  if (loading) return <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto my-4" />;

  return (
    <div className="space-y-3">
      {/* Saved Addresses */}
      {addresses.map((addr) => (
        <div
          key={addr.id}
          onClick={() => onSelect(addr)}
          className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${selectedId === addr.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
            }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {selectedId === addr.id
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                : <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground" />
              }
              <div className="text-sm">
                <p className="font-semibold">{addr.name} · {addr.phone}</p>
                <p className="text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                <p className="text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); deleteAddress(addr.id); }}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Add New Address */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add new delivery address
        </button>
      ) : (
        <AddressForm onSave={saveAddress} onCancel={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ─── Main Cart Page ───────────────────────────────────────────────────
function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartData, setCartData] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  // Load cart
  useEffect(() => {
    if (!user) return;
    const fetchCart = async () => {
      try {
        const snap = await getDocs(collection(db, "cart", user.uid, "items"));
        setCartData(snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name,
            price: Number(data.price),
            quantity: Number(data.quantity),
            image: data.image
          };
        }));
      } catch (err) {
        console.error(err);
        toast.add({ title: "Error", description: "Could not load cart." });
      } finally {
        setLoading(false);
      }
    };
    fetchCart();
  }, [user]);

  const itemRef = (id: string) => doc(db, "cart", user!.uid, "items", id);

  const removeItem = async (id: string) => {
    await deleteDoc(itemRef(id));
    setCartData((prev) => prev.filter((i) => i.id !== id));
  };

  const changeQty = async (id: string, delta: number) => {
    const item = cartData.find((i) => i.id === id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { await removeItem(id); return; }
    await updateDoc(itemRef(id), { quantity: newQty });
    setCartData((prev) => prev.map((i) => i.id === id ? { ...i, quantity: newQty } : i));
  };

  const subtotal = cartData.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 5000 ? 0 : 100;
  const total = subtotal + shipping;

  const checkout = async () => {
    if (!user || cartData.length === 0) return;
    if (!selectedAddress?.id) {
      toast.add({ title: "Select a delivery address", description: "Please choose or add an address before checkout." });
      return;
    }
    try {
      setCheckingOut(true);
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userEmail: user.email ?? "",
        userName: user.displayName ?? "",
        items: cartData.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
        deliveryAddress: {
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          line1: selectedAddress.line1,
          line2: selectedAddress.line2,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
        },
        subtotal,
        shipping,
        total,
        createdAt: serverTimestamp(),
      });
      await Promise.all(cartData.map((i) => deleteDoc(itemRef(i.id))));
      setCartData([]);
      toast.add({ title: "Order placed! 🎉", description: `Delivering to ${selectedAddress.name}, ${selectedAddress.city}.` });
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.add({ title: "Checkout failed", description: err.code === "permission-denied" ? "Please sign in again and retry." : "Something went wrong." });
    } finally {
      setCheckingOut(false);
    }
  };

  // ── Guest wall — show login prompt instead of empty cart ──────────────
  if (!loading && !user) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <ShoppingBag className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Sign in to view your cart</h2>
            <p className="mt-2 text-muted-foreground">
              Create an account or log in to start shopping and track your orders.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={() => navigate("/Login")}>
                Log In
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => navigate("/Signup")}>
                Create Account
              </Button>
            </div>
            <button
              onClick={() => navigate("/")}
              className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Continue Browsing
            </button>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Continue Shopping
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
          <p className="mt-1 text-muted-foreground">{cartData.length} {cartData.length === 1 ? "item" : "items"}</p>
        </div>

        {cartData.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Your cart is empty</h2>
            <p className="mt-2 text-muted-foreground">Add some products before checking out.</p>
            <Button className="mt-6" onClick={() => navigate("/")}>Start Shopping</Button>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

            {/* LEFT COLUMN */}
            <div className="space-y-6">

              {/* CART ITEMS */}
              <Card>
                <CardHeader><CardTitle>Your Items</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {cartData.map((item, index) => (
                      <React.Fragment key={item.id}>
                        <div className="flex gap-4">
                          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="flex flex-1 flex-col justify-between min-w-0">
                            <div className="flex justify-between gap-2">
                              <h3 className="font-semibold leading-tight">{item.name}</h3>
                              <p className="shrink-0 font-bold">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">₹{item.price.toLocaleString("en-IN")} each</p>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center rounded-md border">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => changeQty(item.id, -1)}>
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <div className="flex h-8 w-10 items-center justify-center border-x text-sm font-medium">{item.quantity}</div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => changeQty(item.id, 1)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeItem(item.id)}>
                                <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                        {index !== cartData.length - 1 && <Separator />}
                      </React.Fragment>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* DELIVERY ADDRESS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Address
                    {!selectedAddress?.id && (
                      <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Required</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user && (
                    <AddressPicker
                      uid={user.uid}
                      selectedId={selectedAddress?.id ?? ""}
                      onSelect={(a) => setSelectedAddress(a)}
                    />
                  )}
                </CardContent>
              </Card>

            </div>

            {/* ORDER SUMMARY */}
            <Card className="h-fit lg:sticky lg:top-20">
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{shipping === 0 ? "Free 🎉" : `₹${shipping}`}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{total.toLocaleString("en-IN")}</span>
                  </div>

                  {/* Selected address preview */}
                  {selectedAddress?.id ? (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs">
                      <p className="flex items-center gap-1 font-medium text-primary mb-1">
                        <MapPin className="h-3 w-3" /> Delivering to
                      </p>
                      <p className="font-semibold">{selectedAddress.name}</p>
                      <p className="text-muted-foreground">{selectedAddress.line1}, {selectedAddress.city} — {selectedAddress.pincode}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-xs text-destructive">
                      ⚠ Please select a delivery address to continue
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={checkout}
                    disabled={checkingOut || !selectedAddress?.id}
                  >
                    {checkingOut ? "Placing order..." : !selectedAddress?.id ? "Select Address to Checkout" : "Place Order"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Free shipping on orders above ₹5,000</p>
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </>
  );
}

export default Cart;
