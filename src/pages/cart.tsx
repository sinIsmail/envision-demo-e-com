
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { db, auth } from "../firebase/fb";
import { toast } from "@/components/ui/toast";

import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

function Cart() {
  const [cartData, setCartData] = useState<CartItem[]>([]);

  // -----------------------------
  // GET CART ITEMS
  // -----------------------------
  const getProducts = async () => {
    try {
      const userid = auth.currentUser?.uid;

      if (!userid) return;

      const querySnapshot = await getDocs(
        collection(db, "cart", userid, "items")
      );

      const productData: CartItem[] = querySnapshot.docs.map((item) => {
        const data = item.data();

        return {
          id: item.id,
          name: data.name,
          price: Number(data.price),
          quantity: Number(data.quantity),
          image: data.image,
        };
      });

      setCartData(productData);
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  // -----------------------------
  // REMOVE ITEM
  // -----------------------------
  const removeItem = async (id: string) => {
    try {
      const userid = auth.currentUser?.uid;

      if (!userid) return;

      const itemRef = doc(
        db,
        "cart",
        userid,
        "items",
        id
      );

      await deleteDoc(itemRef);

      setCartData((prev) =>
        prev.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  // -----------------------------
  // INCREASE QUANTITY
  // -----------------------------
  const increaseQuantity = async (id: string) => {
    try {
      const userid = auth.currentUser?.uid;

      if (!userid) return;

      const item = cartData.find(
        (item) => item.id === id
      );

      if (!item) return;

      const newQuantity = item.quantity + 1;

      const itemRef = doc(
        db,
        "cart",
        userid,
        "items",
        id
      );

      await updateDoc(itemRef, {
        quantity: newQuantity,
      });

      setCartData((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: newQuantity,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Error increasing quantity:",
        error
      );
    }
  };

  // -----------------------------
  // DECREASE QUANTITY
  // -----------------------------
  const decreaseQuantity = async (id: string) => {
    try {
      const userid = auth.currentUser?.uid;

      if (!userid) return;

      const item = cartData.find(
        (item) => item.id === id
      );

      if (!item) return;

      // Remove when quantity reaches 0
      if (item.quantity <= 1) {
        await removeItem(id);
        return;
      }

      const newQuantity = item.quantity - 1;

      const itemRef = doc(
        db,
        "cart",
        userid,
        "items",
        id
      );

      await updateDoc(itemRef, {
        quantity: newQuantity,
      });

      setCartData((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: newQuantity,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Error decreasing quantity:",
        error
      );
    }
  };
  const checkout = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Write order to Firestore
      await addDoc(collection(db, "orders"), {
        userId: user.uid,
        userEmail: user.email ?? "",
        userName: user.displayName ?? "",
        items: cartData.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        subtotal,
        shipping,
        total,
        createdAt: serverTimestamp(),
      });

      // Clear cart in Firestore
      const cartRef = collection(db, "cart", user.uid, "items");
      const snap = await getDocs(cartRef);
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

      setCartData([]);
      toast.add({ title: "Order placed!", description: "Your order has been placed successfully." });
    } catch (error) {
      console.error("Checkout error:", error);
      toast.add({ title: "Checkout failed", description: "Something went wrong. Please try again." });
    }
  };


  // -----------------------------
  // LOAD CART
  // -----------------------------
  useEffect(() => {
    getProducts();
  }, []);

  // -----------------------------
  // CALCULATIONS
  // -----------------------------
  const subtotal = cartData.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  );

  const shipping = subtotal >= 5000 ? 0 : 100;

  const total = subtotal + shipping;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="container mx-auto px-6 py-8">

      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Shopping Cart
        </h1>

        <p className="mt-2 text-muted-foreground">
          {cartData.length}{" "}
          {cartData.length === 1
            ? "item"
            : "items"}{" "}
          in your cart
        </p>
      </div>

      {/* EMPTY CART */}
      {cartData.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">

          <ShoppingBag className="mb-5 h-12 w-12 text-muted-foreground" />

          <h2 className="text-2xl font-semibold">
            Your cart is empty
          </h2>

          <p className="mt-2 text-muted-foreground">
            Add some products before checking out.
          </p>

          <Button className="mt-6" >
            <Link to="/">
              Start Shopping
            </Link>
          </Button>

        </Card>
      ) : (

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* CART ITEMS */}
          <Card>

            <CardHeader>
              <CardTitle>
                Your Items
              </CardTitle>
            </CardHeader>

            <CardContent>

              <div className="space-y-6">

                {cartData.map((item, index) => (

                  <React.Fragment key={item.id}>

                    <div className="flex gap-4">

                      {/* IMAGE */}
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">

                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />

                      </div>

                      {/* DETAILS */}
                      <div className="flex flex-1 flex-col justify-between">

                        <div className="flex justify-between gap-4">

                          <div>

                            <h3 className="font-semibold">
                              {item.name}
                            </h3>

                            <p className="mt-1 text-sm text-muted-foreground">
                              ₹
                              {item.price.toLocaleString(
                                "en-IN"
                              )}{" "}
                              each
                            </p>

                          </div>

                          <p className="font-semibold">

                            ₹
                            {(
                              item.price *
                              item.quantity
                            ).toLocaleString("en-IN")}

                          </p>

                        </div>

                        {/* CONTROLS */}
                        <div className="mt-3 flex items-center justify-between">

                          <div className="flex items-center rounded-md border">

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-none"
                              onClick={() =>
                                decreaseQuantity(
                                  item.id
                                )
                              }
                            >
                              <Minus className="h-4 w-4" />
                            </Button>

                            <div className="flex h-8 w-10 items-center justify-center border-x text-sm">
                              {item.quantity}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-none"
                              onClick={() =>
                                increaseQuantity(
                                  item.id
                                )
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>

                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              removeItem(item.id)
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>

                        </div>

                      </div>

                    </div>

                    {index !== cartData.length - 1 && (
                      <Separator />
                    )}

                  </React.Fragment>

                ))}

              </div>

            </CardContent>

          </Card>

          {/* ORDER SUMMARY */}
          <Card className="h-fit lg:sticky lg:top-24">

            <CardHeader>
              <CardTitle>
                Order Summary
              </CardTitle>
            </CardHeader>

            <CardContent>

              <div className="space-y-4">

                {/* SUBTOTAL */}
                <div className="flex justify-between">

                  <span className="text-muted-foreground">
                    Subtotal
                  </span>

                  <span>
                    ₹
                    {subtotal.toLocaleString(
                      "en-IN"
                    )}
                  </span>

                </div>

                {/* SHIPPING */}
                <div className="flex justify-between">

                  <span className="text-muted-foreground">
                    Shipping
                  </span>

                  <span>
                    {shipping === 0
                      ? "Free"
                      : `₹${shipping.toLocaleString(
                          "en-IN"
                        )}`}
                  </span>

                </div>

                <Separator />

                {/* TOTAL */}
                <div className="flex justify-between text-lg font-bold">

                  <span>
                    Total
                  </span>

                  <span>
                    ₹
                    {total.toLocaleString(
                      "en-IN"
                    )}
                  </span>

                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={checkout}
                >
                  Checkout
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Shipping is free on orders above ₹5,000
                </p>

              </div>

            </CardContent>

          </Card>

        </div>
      )}
    </div>
  );
}

export default Cart;
