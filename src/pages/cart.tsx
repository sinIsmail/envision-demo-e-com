import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

import {
  collection, getDocs, updateDoc, deleteDoc,
  addDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/fb";
import { toast } from "@/components/ui/toast";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cartData, setCartData] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  // LOAD CART
  useEffect(() => {
    if (!user) return;
    const fetchCart = async () => {
      try {
        const snap = await getDocs(collection(db, "cart", user.uid, "items"));
        const items: CartItem[] = snap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, name: data.name, price: Number(data.price), quantity: Number(data.quantity), image: data.image };
        });
        setCartData(items);
      } catch (err) {
        console.error("Cart fetch error:", err);
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

  const subtotal = cartData.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shipping = subtotal >= 5000 ? 0 : 100;
  const total = subtotal + shipping;

  const checkout = async () => {
    if (!user || cartData.length === 0) return;
    try {
      setCheckingOut(true);
      // Write order to Firestore
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userEmail: user.email ?? "",
        userName: user.displayName ?? "",
        items: cartData.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
        subtotal,
        shipping,
        total,
        createdAt: serverTimestamp(),
      });
      // Clear cart
      await Promise.all(cartData.map((i) => deleteDoc(itemRef(i.id))));
      setCartData([]);
      toast.add({ title: "Order placed! 🎉", description: "Your order has been placed successfully." });
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.add({ title: "Checkout failed", description: err.code === "permission-denied" ? "Please sign in again and try." : "Something went wrong." });
    } finally {
      setCheckingOut(false);
    }
  };

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
          <p className="mt-1 text-muted-foreground">{cartData.length} {cartData.length === 1 ? "item" : "items"} in your cart</p>
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

            {/* CART ITEMS */}
            <Card>
              <CardHeader><CardTitle>Your Items</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {cartData.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <div className="flex gap-4">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex flex-1 flex-col justify-between min-w-0">
                          <div className="flex justify-between gap-2">
                            <h3 className="font-semibold leading-tight">{item.name}</h3>
                            <p className="shrink-0 font-semibold">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
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
                  <Button className="w-full" size="lg" onClick={checkout} disabled={checkingOut}>
                    {checkingOut ? "Placing order..." : "Checkout"}
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
