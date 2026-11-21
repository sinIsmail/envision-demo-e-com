import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { formatPrice } from "@/lib/themeUtils";
import {
  readLocalCart,
  removeFromLocalCart,
  updateLocalCartQuantity,
  clearLocalCart,
} from "@/lib/cartStrorage";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/firebase/fb";
import { toast } from "@/components/ui/toast";
import { sendOrderPlacedEmail } from "@/lib/emailService";
import { downloadOrderBill } from "@/lib/pdfBillGenerator";
import { type Order, type AppliedFee, formatOrderId } from "@/types/order";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  MapPin,
  Plus as PlusIcon,
  CheckCircle2,
  X,
  Phone,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────────────
type CartItem = {
  id: string;          // Firestore cart document id OR local composite id
  productId: string;   // Actual product id
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantLabel?: string;
  maxStock?: number;   // Live stock cap fetched from Firestore
};

type LocalCartItem = {
  id: string;
  productId?: string;
  quantity: number;
  variantLabel?: string;
  price?: number;
};

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
};

type Address = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

const PRODUCTS_KEY = "products";

const EMPTY_ADDRESS = {
  name: "",
  phone: "",
  email: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

// ─── Product lookup ───────────────────────────────────────────────────
// First look in localStorage "products" (if your product page already stores
// the full catalog there), then fall back to Firestore products collection.

function readLocalProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((p) => ({
        id: String(p?.id ?? ""),
        name: String(p?.name ?? ""),
        price: Number(p?.price ?? 0),
        image: String(p?.image ?? p?.imageUrl ?? ""),
      }))
      .filter((p) => p.id && p.name);
  } catch (error) {
    console.error("Could not read local products:", error);
    return [];
  }
}

async function getProductsForCart(localItems: LocalCartItem[]): Promise<CartItem[]> {
  const localProducts = readLocalProducts();
  const localMap = new Map(localProducts.map((product) => [product.id, product]));

  const result: CartItem[] = [];

  for (const localItem of localItems) {
    const productId = String(localItem.productId ?? localItem.id);
    let product = localMap.get(productId);
    let maxStock: number | undefined;

    try {
      const productSnap = await getDoc(doc(db, "products", productId));
      if (productSnap.exists()) {
        const data = productSnap.data();

        if (!product) {
          product = {
            id: productSnap.id,
            name: String(data.name ?? ""),
            price: Number(data.price ?? 0),
            image: String(data.images?.[0] ?? data.image ?? data.imageUrl ?? ""),
          };
        }

        // Determine live stock for this item/variant
        if (data.hasVariants && Array.isArray(data.unitVariants) && localItem.variantLabel) {
          const variant = data.unitVariants.find((v: any) => v.label === localItem.variantLabel);
          maxStock = variant ? Number(variant.stock ?? 0) : 0;
        } else {
          maxStock = Number(data.stock ?? 0);
        }
      }
    } catch (error) {
      console.error(`Could not load product ${productId}:`, error);
    }

    if (product) {
      const itemPrice = localItem.price ?? product.price;
      const cappedQty = maxStock !== undefined ? Math.min(localItem.quantity, Math.max(maxStock, 0)) : localItem.quantity;
      result.push({
        id: localItem.id,
        productId,
        name: product.name,
        price: itemPrice,
        quantity: Math.max(1, cappedQty),
        image: product.image,
        variantLabel: localItem.variantLabel,
        maxStock,
      });
    }
  }

  return result;
}

// ─── Address Form ─────────────────────────────────────────────────────
function AddressForm({
  onSave,
  onCancel,
  defaultPhone = "",
}: {
  onSave: (a: Omit<Address, "id">) => Promise<void>;
  onCancel: () => void;
  defaultPhone?: string;
}) {
  const [form, setForm] = useState({
    ...EMPTY_ADDRESS,
    phone: defaultPhone || "",
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.name ||
      !form.phone ||
      !form.line1 ||
      !form.city ||
      !form.state ||
      !form.pincode
    ) {
      toast.add({
        title: "Fill all required fields",
        description:
          "Name, phone, address, city, state and pincode are required.",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <p className="font-semibold text-sm">New Delivery Address</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="addr-name">Full Name *</Label>
          <Input
            id="addr-name"
            placeholder="John Doe"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="addr-phone">Phone *</Label>
          <Input
            id="addr-phone"
            placeholder="9876543210"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="addr-email">Email Address (for order receipts & tracking)</Label>
          <Input
            id="addr-email"
            type="email"
            placeholder="your-email@example.com"
            value={form.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="addr-line1">Address Line 1 *</Label>
          <Input
            id="addr-line1"
            placeholder="House No, Street Name"
            value={form.line1}
            onChange={(e) => set("line1", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="addr-line2">Address Line 2 (optional)</Label>
          <Input
            id="addr-line2"
            placeholder="Landmark, Area"
            value={form.line2}
            onChange={(e) => set("line2", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="addr-city">City *</Label>
          <Input
            id="addr-city"
            placeholder="Mumbai"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="addr-state">State *</Label>
          <Input
            id="addr-state"
            placeholder="Maharashtra"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="addr-pincode">Pincode *</Label>
          <Input
            id="addr-pincode"
            placeholder="400001"
            value={form.pincode}
            onChange={(e) => set("pincode", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving..." : "Save Address"}
        </Button>

        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="mr-1.5 h-3 w-3" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Address Picker ───────────────────────────────────────────────────
function AddressPicker({
  uid,
  selectedId,
  onSelect,
  defaultPhone = "",
  onAddressSaved,
}: {
  uid: string;
  selectedId: string;
  onSelect: (a: Address) => void;
  defaultPhone?: string;
  onAddressSaved?: (phone: string) => void;
}) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const addrCol = () => collection(db, "users", uid, "addresses");

  const fetchAddresses = async () => {
    try {
      const snap = await getDocs(addrCol());

      const list: Address[] = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Address),
      );

      setAddresses(list);
      setLoading(false);

      if (list.length === 1) onSelect(list[0]);
    } catch (error) {
      console.error(error);
      toast.add({
        title: "Could not load addresses",
        description: "Please try again.",
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [uid]);

  const saveAddress = async (form: Omit<Address, "id">) => {
    const ref = await addDoc(addrCol(), {
      ...form,
      createdAt: serverTimestamp(),
    });

    const newAddr: Address = { id: ref.id, ...form };

    setAddresses((prev) => [...prev, newAddr]);
    onSelect(newAddr);
    setShowForm(false);

    if (onAddressSaved && form.phone) {
      onAddressSaved(form.phone);
    }

    toast.add({
      title: "Address saved ✓",
      description: `${form.name}, ${form.city}`,
    });
  };

  const deleteAddress = async (id: string) => {
    await deleteDoc(doc(db, "users", uid, "addresses", id));

    const updated = addresses.filter((a) => a.id !== id);
    setAddresses(updated);

    if (selectedId === id) {
      onSelect(updated[0] ?? ({} as Address));
    }

    toast.add({ title: "Address removed" });
  };

  if (loading) {
    return (
      <div className="mx-auto my-4 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((addr) => (
        <div
          key={addr.id}
          onClick={() => onSelect(addr)}
          className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
            selectedId === addr.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {selectedId === addr.id ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground" />
              )}

              <div className="text-sm">
                <p className="font-semibold">
                  {addr.name} · {addr.phone}
                </p>
                <p className="text-muted-foreground">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteAddress(addr.id);
              }}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
              aria-label={`Delete ${addr.name}'s address`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <PlusIcon className="h-4 w-4" />
          Add new delivery address
        </button>
      ) : (
        <AddressForm
          onSave={saveAddress}
          onCancel={() => setShowForm(false)}
          defaultPhone={defaultPhone}
        />
      )}
    </div>
  );
}

// ─── Main Cart Page ───────────────────────────────────────────────────
function Cart() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSiteSettings();

  const [cartData, setCartData] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [placedOrderSuccess, setPlacedOrderSuccess] = useState<Order | null>(null);

  // User phone state & check
  const [userPhone, setUserPhone] = useState<string>("");
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [modalPhoneInput, setModalPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Load user phone from Firestore profile or Auth
  useEffect(() => {
    if (!user) {
      setUserPhone("");
      return;
    }
    let isMounted = true;
    const loadUserPhone = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && isMounted) {
          const phone = snap.data().phone || "";
          setUserPhone(phone);
          setModalPhoneInput(phone);
        } else if (user.phoneNumber && isMounted) {
          setUserPhone(user.phoneNumber);
          setModalPhoneInput(user.phoneNumber);
        }
      } catch (err) {
        console.warn("Could not load user phone:", err);
      }
    };
    loadUserPhone();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Load guest cart OR sync guest cart into Firestore after login.
  useEffect(() => {
    let cancelled = false;

    const loadCart = async () => {
      setLoading(true);

      try {
        const localCart = readLocalCart();

        // Guest: resolve product ids from the local cart.
        if (!user) {
          const items = await getProductsForCart(localCart);

          if (!cancelled) {
            setCartData(items);
            setLoading(false);
          }

          return;
        }

        // User logged in: move any guest items into their Firestore cart.
        if (localCart.length > 0) {
          const localItems = await getProductsForCart(localCart);

          if (localItems.length > 0) {
            const cartCol = collection(db, "cart", user.uid, "items");
            const existingSnap = await getDocs(cartCol);

            const existingByKey = new Map<
              string,
              { docId: string; quantity: number }
            >();

            existingSnap.docs.forEach((d) => {
              const data = d.data();
              const pId = String(data.productId ?? data.productid ?? d.id);
              const vLabel = data.variantLabel ? String(data.variantLabel) : "";
              const key = vLabel ? `${pId}_${vLabel}` : pId;

              existingByKey.set(key, {
                docId: d.id,
                quantity: Number(data.quantity ?? 0),
              });
            });

            for (const item of localItems) {
              const itemKey = item.variantLabel ? `${item.productId}_${item.variantLabel}` : item.productId;
              const existing = existingByKey.get(itemKey);

              if (existing) {
                await updateDoc(
                  doc(db, "cart", user.uid, "items", existing.docId),
                  {
                    quantity: existing.quantity + item.quantity,
                    productId: item.productId,
                    productid: item.productId,
                  },
                );
              } else {
                await addDoc(cartCol, {
                  productId: item.productId,
                  productid: item.productId,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  image: item.image,
                  variantLabel: item.variantLabel ?? null,
                  updatedAt: serverTimestamp(),
                });
              }
            }
          }

          // Do this only after the local items have been processed.
          clearLocalCart();
        }

        // Load the user's final Firestore cart.
        const snap = await getDocs(
          collection(db, "cart", user.uid, "items"),
        );

        // Fetch live stock for all cart items in parallel
        const rawItems = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            productId: String(data.productId ?? data.productid ?? d.id),
            name: String(data.name ?? ""),
            price: Number(data.price ?? 0),
            quantity: Math.max(1, Number(data.quantity ?? 1)),
            image: String(data.image ?? data.imageUrl ?? ""),
            variantLabel: data.variantLabel ? String(data.variantLabel) : undefined,
          };
        });

        // Fetch live stock for each unique product
        const uniqueProductIds = [...new Set(rawItems.map((i) => i.productId))];
        const stockMap = new Map<string, any>(); // productId -> full product data
        await Promise.all(
          uniqueProductIds.map(async (pid) => {
            try {
              const pSnap = await getDoc(doc(db, "products", pid));
              if (pSnap.exists()) stockMap.set(pid, pSnap.data());
            } catch {/* ignore */}
          })
        );

        const items: CartItem[] = [];
        const stockWarnings: string[] = [];

        for (const raw of rawItems) {
          const pData = stockMap.get(raw.productId);
          let maxStock: number | undefined;

          if (pData) {
            if (pData.hasVariants && Array.isArray(pData.unitVariants) && raw.variantLabel) {
              const v = pData.unitVariants.find((v: any) => v.label === raw.variantLabel);
              maxStock = v ? Number(v.stock ?? 0) : 0;
            } else {
              maxStock = Number(pData.stock ?? 0);
            }
          }

          let qty = raw.quantity;
          if (maxStock !== undefined && qty > maxStock) {
            if (maxStock === 0) {
              // Out of stock — skip (or keep at 0 so user sees it)
              stockWarnings.push(`"${raw.name}${raw.variantLabel ? ` (${raw.variantLabel})` : ""}" is out of stock and was removed from your cart.`);
              // Remove from Firestore in background
              deleteDoc(doc(db, "cart", user.uid, "items", raw.id)).catch(console.warn);
              continue;
            }
            stockWarnings.push(`"${raw.name}${raw.variantLabel ? ` (${raw.variantLabel})` : ""}" quantity adjusted to ${maxStock} (only ${maxStock} in stock).`);
            qty = maxStock;
            // Update Firestore in background
            updateDoc(doc(db, "cart", user.uid, "items", raw.id), { quantity: maxStock }).catch(console.warn);
          }

          items.push({ ...raw, quantity: qty, maxStock });
        }

        if (!cancelled) {
          setCartData(items);
          setLoading(false);
          // Show stock warnings after a brief delay
          if (stockWarnings.length > 0) {
            setTimeout(() => {
              stockWarnings.forEach((msg) => toast.add({ title: "Stock updated", description: msg }));
            }, 500);
          }
        }
      } catch (error) {
        console.error("Cart load error:", error);

        if (!cancelled) {
          toast.add({
            title: "Could not load cart",
            description: "Please refresh and try again.",
          });
          setLoading(false);
        }
      }
    };

    loadCart();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Remove one product from the cart.
  const removeItem = async (item: CartItem) => {
    try {
      if (user) {
        await deleteDoc(
          doc(db, "cart", user.uid, "items", item.id),
        );
      } else {
        removeFromLocalCart(item.id);
      }

      setCartData((prev) =>
        prev.filter((cartItem) => cartItem.id !== item.id),
      );
    } catch (error) {
      console.error(error);
      toast.add({
        title: "Could not remove item",
        description: "Please try again.",
      });
    }
  };

  // Increase/decrease quantity.
  const changeQty = async (item: CartItem, delta: number) => {
    const newQty = item.quantity + delta;

    try {
      if (newQty <= 0) {
        await removeItem(item);
        return;
      }

      // Enforce stock cap
      if (item.maxStock !== undefined && newQty > item.maxStock) {
        toast.add({
          title: "Stock limit reached",
          description: `Only ${item.maxStock} in stock for "${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""}".`,
        });
        return;
      }

      if (user) {
        await updateDoc(
          doc(db, "cart", user.uid, "items", item.id),
          {
            quantity: newQty,
            updatedAt: serverTimestamp(),
          },
        );
      } else {
        updateLocalCartQuantity(item.id, newQty);
      }

      setCartData((prev) =>
        prev.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: newQty }
            : cartItem,
        ),
      );
    } catch (error) {
      console.error(error);
      toast.add({
        title: "Could not update quantity",
        description: "Please try again.",
      });
    }
  };

  const subtotal = cartData.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Dynamic Billing Fees & Delivery Charge (Admin controlled)
  const activeBillingFees: AppliedFee[] = React.useMemo(() => {
    if (settings.billingFees && settings.billingFees.length > 0) {
      return settings.billingFees
        .filter((fee) => fee.enabled)
        .map((fee) => {
          const isWaived = Boolean(fee.waiveAbove && fee.waiveAbove > 0 && subtotal >= fee.waiveAbove);
          return {
            id: fee.id,
            name: fee.name,
            amount: isWaived ? 0 : Number(fee.amount) || 0,
            waived: isWaived,
          };
        });
    }

    // Fallback to single delivery charge settings
    const feeDelivery = Number(settings.deliveryCharge ?? 25);
    const waiveThreshold = Number(settings.freeDeliveryAbove ?? 999);
    const isWaived = waiveThreshold > 0 && subtotal >= waiveThreshold;
    return [
      {
        id: "fee_delivery",
        name: settings.deliveryChargeLabel || "Delivery",
        amount: isWaived ? 0 : feeDelivery,
        waived: isWaived,
      },
    ];
  }, [settings.billingFees, settings.deliveryCharge, settings.deliveryChargeLabel, settings.freeDeliveryAbove, subtotal]);

  const totalFees = React.useMemo(() => {
    return activeBillingFees.reduce((acc, f) => acc + (f.waived ? 0 : f.amount), 0);
  }, [activeBillingFees]);

  const freeDeliveryAbove = Number(settings.freeDeliveryAbove ?? 999);
  const deliveryChargeLabel = settings.deliveryChargeLabel || "Delivery";
  const shipping = totalFees;
  const total = subtotal + totalFees;

  const goToLogin = () => {
    navigate("/Login", {
      state: { from: "/cart", reason: "checkout" },
    });
  };

  const goToSignup = () => {
    navigate("/Signup", {
      state: { from: "/cart", reason: "checkout" },
    });
  };

  const handleSaveUserPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanPhone = modalPhoneInput.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      setPhoneError("Please enter a valid phone number (at least 10 digits).");
      return;
    }

    setPhoneError("");
    setSavingPhone(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          phone: cleanPhone,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setUserPhone(cleanPhone);
      setPhoneModalOpen(false);

      toast.add({
        title: "Phone number saved ✓",
        description: "Your phone number has been linked to your profile.",
      });

      // If user already has address selected, proceed to confirm order
      if (selectedAddress?.id && cartData.length > 0) {
        executeCheckout(cleanPhone);
      }
    } catch (err: any) {
      console.error("Save phone error:", err);
      setPhoneError(err.message || "Failed to save phone number.");
    } finally {
      setSavingPhone(false);
    }
  };

  const checkout = async (overridePhone?: string) => {
    if (!user) {
      goToLogin();
      return;
    }

    if (cartData.length === 0) return;

    // ── 1. Check if user has a phone number before confirming order ──
    let activePhone = (overridePhone || userPhone).trim();
    if (!activePhone) {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().phone) {
          activePhone = String(userSnap.data().phone).trim();
          setUserPhone(activePhone);
        } else if (user.phoneNumber) {
          activePhone = user.phoneNumber.trim();
          setUserPhone(activePhone);
        }
      } catch (err) {
        console.warn("Could not check user phone in checkout:", err);
      }
    }

    if (!activePhone) {
      toast.add({
        title: "Phone number required",
        description: "Please provide your phone number before confirming your order.",
      });
      setModalPhoneInput(selectedAddress?.phone || "");
      setPhoneError("");
      setPhoneModalOpen(true);
      return;
    }

    // ── 2. Check if delivery address is selected ──────────────────────────
    if (!selectedAddress?.id) {
      toast.add({
        title: "Select a delivery address",
        description: "Please choose or add an address before checkout.",
      });
      return;
    }

    // ── 3. Proceed to execute checkout ────────────────────────────────────
    executeCheckout(activePhone);
  };

  const executeCheckout = async (activePhone: string) => {
    if (!selectedAddress?.id || !user) return;

    try {
      setCheckingOut(true);
      let placedOrderId = "";
      let placedOrderNumber = 1;
      let placedOrderSeqId = "01";

      // ── Atomic transaction: verify stock, increment counter & place order ───
      await runTransaction(db, async (tx) => {
        // Group cart items by productId so we know which products to read
        type LineItem = { variantLabel?: string; quantity: number; name: string };
        const linesByProduct = new Map<string, LineItem[]>();
        for (const item of cartData) {
          const lines = linesByProduct.get(item.productId) ?? [];
          lines.push({ variantLabel: item.variantLabel, quantity: item.quantity, name: item.name });
          linesByProduct.set(item.productId, lines);
        }
        const productIds = Array.from(linesByProduct.keys());

        // ══════════════════════════════════════════════════════════════════════
        // STEP 1: ALL READS MUST OCCUR FIRST BEFORE ANY WRITES (FIRESTORE RULE)
        // ══════════════════════════════════════════════════════════════════════
        const counterRef = doc(db, "metadata", "orders");
        const [counterSnap, ...productSnaps] = await Promise.all([
          tx.get(counterRef),
          ...productIds.map((id) => tx.get(doc(db, "products", id))),
        ]);

        // ══════════════════════════════════════════════════════════════════════
        // STEP 2: PROCESS READ DATA & VALIDATE INVENTORY
        // ══════════════════════════════════════════════════════════════════════
        // Determine sequential order number
        let nextSeq = 1;
        if (counterSnap.exists()) {
          const raw = counterSnap.data().lastOrderNumber;
          nextSeq = (typeof raw === "number" ? raw : Number(raw) || 0) + 1;
        }
        const formattedSeqId = String(nextSeq).padStart(2, "0");
        placedOrderNumber = nextSeq;
        placedOrderSeqId = formattedSeqId;

        // Verify stock and prepare product write updates
        type ProductUpdate = { pid: string; data: any };
        const productUpdates: ProductUpdate[] = [];

        for (let i = 0; i < productIds.length; i++) {
          const pid = productIds[i];
          const snap = productSnaps[i];
          const lines = linesByProduct.get(pid)!;

          if (!snap.exists()) {
            const name = lines[0]?.name ?? pid;
            throw new Error(`Product "${name}" no longer exists.`);
          }

          const data = snap.data() as any;

          if (data.hasVariants && Array.isArray(data.unitVariants)) {
            // Variant product: check & decrement per-variant stock
            const updatedVariants: any[] = data.unitVariants.map((v: any) => ({ ...v }));

            for (const line of lines) {
              if (!line.variantLabel) continue;
              const varIdx = updatedVariants.findIndex((v: any) => v.label === line.variantLabel);
              if (varIdx === -1) {
                throw new Error(`Variant "${line.variantLabel}" of "${data.name}" was not found.`);
              }
              const currentVariantStock = Number(updatedVariants[varIdx].stock ?? 0);
              if (currentVariantStock < line.quantity) {
                throw new Error(
                  `"${data.name} (${line.variantLabel})" only has ${currentVariantStock} in stock, but you ordered ${line.quantity}.`
                );
              }
              updatedVariants[varIdx].stock = currentVariantStock - line.quantity;
            }

            const newTotalStock = updatedVariants.reduce(
              (sum: number, v: any) => sum + (Number(v.stock) || 0),
              0
            );

            productUpdates.push({
              pid,
              data: {
                unitVariants: updatedVariants,
                stock: newTotalStock,
              },
            });
          } else {
            // Plain product: check & decrement top-level stock
            const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
            const currentStock = Number(data.stock ?? 0);
            if (currentStock < totalQty) {
              throw new Error(
                `"${data.name}" only has ${currentStock} in stock, but you ordered ${totalQty}.`
              );
            }
            productUpdates.push({
              pid,
              data: {
                stock: currentStock - totalQty,
              },
            });
          }
        }

        // ══════════════════════════════════════════════════════════════════════
        // STEP 3: ALL WRITES ARE EXECUTED AFTER ALL READS HAVE COMPLETED
        // ══════════════════════════════════════════════════════════════════════
        // 1. Write incremented sequential counter
        tx.set(counterRef, { lastOrderNumber: nextSeq }, { merge: true });

        // 2. Write product inventory stock updates
        for (const update of productUpdates) {
          tx.update(doc(db, "products", update.pid), update.data);
        }

        // 3. Write the order document
        const customerEmail =
          selectedAddress.email?.trim() ||
          user.email ||
          user.providerData?.find((p) => p.email)?.email ||
          "";

        const orderRef = doc(collection(db, "orders"));
        placedOrderId = orderRef.id;
        tx.set(orderRef, {
          userId: user.uid,
          userEmail: customerEmail,
          userName: user.displayName ?? selectedAddress.name ?? "",
          userPhone: activePhone,
          orderNumber: nextSeq,
          orderId: formattedSeqId,
          items: cartData.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            ...(item.variantLabel && { variantLabel: item.variantLabel }),
          })),
          deliveryAddress: {
            name: selectedAddress.name,
            phone: selectedAddress.phone || activePhone,
            email: customerEmail,
            line1: selectedAddress.line1,
            line2: selectedAddress.line2,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
          },
          subtotal,
          shipping: totalFees,
          billingFees: activeBillingFees,
          total,
          status: "placed",
          createdAt: serverTimestamp(),
        });
      });
      // ─────────────────────────────────────────────────────────────────────

      // Clear cart items from Firestore
      await Promise.all(
        cartData.map((item) =>
          deleteDoc(doc(db, "cart", user.uid, "items", item.id))
        )
      );

      // Trigger asynchronous order confirmation email
      const customerEmail =
        selectedAddress.email?.trim() ||
        user.email ||
        user.providerData?.find((p) => p.email)?.email ||
        "";

      const customerName =
        selectedAddress.name?.trim() ||
        user.displayName?.trim() ||
        (customerEmail ? customerEmail.split("@")[0] : "") ||
        "Valued Customer";

      const placedOrderObj: Order = {
        id: placedOrderId || "ORD-" + Date.now().toString().slice(-6),
        orderNumber: placedOrderNumber,
        orderId: placedOrderSeqId,
        userId: user.uid,
        userName: customerName,
        userEmail: customerEmail,
        items: cartData.map((item) => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          variantLabel: item.variantLabel,
        })),
        deliveryAddress: {
          name: selectedAddress.name || customerName,
          phone: selectedAddress.phone || activePhone,
          email: customerEmail,
          line1: selectedAddress.line1,
          line2: selectedAddress.line2,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
        },
        subtotal,
        shipping: totalFees,
        billingFees: activeBillingFees,
        total,
        status: "placed",
        createdAt: null,
      };

      setPlacedOrderSuccess(placedOrderObj);

      // (Automatic PDF download cancelled — customer can download on demand via the button on confirmation card)

      if (customerEmail) {
        sendOrderPlacedEmail({
          toEmail: customerEmail,
          toName: customerName,
          orderId: `#${placedOrderSeqId}`,
          orderDate: new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          brandName: settings.brandName || "Shop.",
          items: cartData.map((it) => ({
            name: it.name,
            variantLabel: it.variantLabel,
            quantity: it.quantity,
            lineTotal: formatPrice(it.price * it.quantity, settings.currency, settings.currencyLocale),
          })),
          fees: activeBillingFees.map((f) => ({
            name: f.name,
            amount: formatPrice(f.amount, settings.currency, settings.currencyLocale),
            waived: f.waived,
          })),
          subtotal: formatPrice(subtotal, settings.currency, settings.currencyLocale),
          total: formatPrice(total, settings.currency, settings.currencyLocale),
          deliveryAddress: {
            name: selectedAddress.name || customerName,
            phone: selectedAddress.phone || activePhone,
            line1: selectedAddress.line1,
            line2: selectedAddress.line2 || undefined,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
          },
        }, settings)
          .then((res) => {
            if (res.success) {
              console.info("[Email] Confirmation email sent successfully to", customerEmail);
              toast.add({
                title: "Order Placed Successfully! 🎉✉️",
                description: `Confirmation email sent to ${customerEmail}.`,
              });
            } else {
              console.warn("[Email] Automated order email notice:", res.message);
              toast.add({
                title: "Order Placed! 🎉",
                description: `Order #${placedOrderSeqId} confirmed.`,
              });
            }
          })
          .catch((emailErr) => {
            console.warn("[Email] Could not send order placed notification:", emailErr);
          });
      } else {
        toast.add({
          title: "Order placed & Invoice Generated! 📄🎉",
          description: `Delivering to ${selectedAddress.name}, ${selectedAddress.city}.`,
        });
      }

      setCartData([]);
    } catch (err: any) {
      console.error("Checkout error:", err);

      toast.add({
        title: "Checkout failed",
        description:
          err?.message && !err.message.includes("permission")
            ? err.message
            : err?.code === "permission-denied"
            ? "Please sign in again and retry."
            : "Something went wrong.",
      });
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
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Continue Shopping
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Shopping Cart
          </h1>

          <p className="mt-1 text-muted-foreground">
            {cartData.length}{" "}
            {cartData.length === 1 ? "item" : "items"}
          </p>
        </div>

        {placedOrderSuccess ? (
          <Card className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-xl mx-auto shadow-2xl border border-slate-200/80 dark:border-white/10 rounded-[32px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Order Confirmed! 🎉
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Order Reference:{" "}
              <strong className="text-foreground font-mono font-bold text-base px-2.5 py-0.5 rounded-lg bg-muted/70 border">
                {formatOrderId(placedOrderSuccess)}
              </strong>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
              A detailed confirmation email has been dispatched to{" "}
              <strong>{placedOrderSuccess.userEmail || "your email address"}</strong>.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button
                variant="outline"
                className="flex-1 gap-2 border-primary/40 font-bold text-primary hover:bg-primary/5 rounded-full h-12 active:scale-95 transition-all"
                onClick={() => downloadOrderBill(placedOrderSuccess, settings)}
              >
                📄 Download PDF Bill
              </Button>
              <Button
                className="flex-1 font-bold rounded-full h-12 active:scale-95 transition-all"
                onClick={() => {
                  setPlacedOrderSuccess(null);
                  navigate("/");
                }}
              >
                Continue Shopping
              </Button>
            </div>
          </Card>
        ) : cartData.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" />

            <h2 className="text-2xl font-semibold">
              Your cart is empty
            </h2>

            <p className="mt-2 text-muted-foreground">
              Add some products before checking out.
            </p>

            <Button className="mt-6" onClick={() => navigate("/")}>
              Start Shopping
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* CART ITEMS */}
              <Card className="rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl overflow-hidden">
                <CardHeader>
                  <CardTitle>Your Items</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="space-y-5">
                    {cartData.map((item, index) => (
                      <React.Fragment key={item.productId}>
                        <div className="flex gap-4">
                          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 p-2 flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ShoppingBag className="h-7 w-7 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col justify-between">
                            <div className="flex justify-between gap-2">
                              <div>
                                <h3 className="font-semibold leading-tight">
                                  {item.name}
                                </h3>
                                {item.variantLabel && (
                                  <Badge variant="outline" className="mt-1 text-[11px] font-medium rounded-full">
                                    {item.variantLabel}
                                  </Badge>
                                )}
                              </div>

                              <p className="shrink-0 font-bold">
                                {formatPrice(item.price * item.quantity, settings.currency, settings.currencyLocale)}
                              </p>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.price, settings.currency, settings.currencyLocale)} each
                            </p>

                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center rounded-full border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/80 p-0.5 shadow-2xs">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 transition-colors active:scale-95"
                                    onClick={() => changeQty(item, -1)}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>

                                  <div className="flex h-7 min-w-8 px-1 items-center justify-center text-xs font-semibold text-foreground">
                                    {item.quantity}
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-zinc-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                                    onClick={() => changeQty(item, 1)}
                                    disabled={item.maxStock !== undefined && item.quantity >= item.maxStock}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                {item.maxStock !== undefined && item.maxStock <= 5 && item.maxStock > 0 && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Only {item.maxStock} left
                                  </span>
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive h-8 px-2.5 rounded-full"
                                onClick={() => removeItem(item)}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Remove
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

              {/* DELIVERY ADDRESS ONLY FOR LOGGED-IN USERS */}
              {user ? (
                <Card className="rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Delivery Address

                      {!selectedAddress?.id && (
                        <span className="ml-2 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                          Required
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <AddressPicker
                      uid={user.uid}
                      selectedId={selectedAddress?.id ?? ""}
                      onSelect={(address) =>
                        setSelectedAddress(address)
                      }
                      defaultPhone={userPhone}
                      onAddressSaved={(phone) => {
                        if (!userPhone) {
                          setUserPhone(phone);
                          setDoc(
                            doc(db, "users", user.uid),
                            { phone, updatedAt: serverTimestamp() },
                            { merge: true }
                          ).catch(console.warn);
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {/* ORDER SUMMARY */}
            <Card className="h-fit lg:sticky lg:top-20 rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal
                    </span>

                    <span>
                      {formatPrice(subtotal, settings.currency, settings.currencyLocale)}
                    </span>
                  </div>

                  {/* Dynamic Billing Fees Breakdown */}
                  {activeBillingFees.map((fee) => (
                    <div key={fee.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{fee.name}</span>
                      <span className={fee.waived ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                        {fee.waived
                          ? "Free 🎉"
                          : formatPrice(fee.amount, settings.currency, settings.currencyLocale)}
                      </span>
                    </div>
                  ))}

                  {freeDeliveryAbove > 0 && shipping > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add {formatPrice(Math.max(0, freeDeliveryAbove - subtotal), settings.currency, settings.currencyLocale)} more
                      for free {deliveryChargeLabel.toLowerCase()}.
                    </p>
                  )}

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>

                    <span>
                      {formatPrice(total, settings.currency, settings.currencyLocale)}
                    </span>
                  </div>

                  {/* Contact Phone Status */}
                  {user && (
                    userPhone ? (
                      <div className="flex items-center justify-between text-xs py-1 text-muted-foreground px-0.5">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                          Contact Phone:
                        </span>
                        <span className="font-semibold text-foreground">{userPhone}</span>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            Phone number required
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setModalPhoneInput(selectedAddress?.phone || "");
                              setPhoneError("");
                              setPhoneModalOpen(true);
                            }}
                            className="underline font-bold text-primary hover:opacity-80 cursor-pointer"
                          >
                            Add Phone
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          A contact phone number is required before confirming your order.
                        </p>
                      </div>
                    )
                  )}

                  {user && selectedAddress?.id ? (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs">
                      <p className="mb-1 flex items-center gap-1 font-medium text-primary">
                        <MapPin className="h-3 w-3" />
                        Delivering to
                      </p>

                      <p className="font-semibold">
                        {selectedAddress.name}
                      </p>

                      <p className="text-muted-foreground">
                        {selectedAddress.line1},{" "}
                        {selectedAddress.city} —{" "}
                        {selectedAddress.pincode}
                      </p>
                    </div>
                  ) : user ? (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                      ⚠ Please select a delivery address to
                      continue
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs">
                      Login or create an account to place your
                      order.
                    </div>
                  )}

                  {user ? (
                    <Button
                      className="w-full rounded-full h-13 font-black text-sm sm:text-base shadow-xl active:scale-95 transition-all bg-primary text-primary-foreground hover:brightness-110 hover:shadow-2xl cursor-pointer"
                      size="lg"
                      onClick={() => checkout()}
                      disabled={
                        checkingOut ||
                        cartData.length === 0
                      }
                    >
                      {checkingOut
                        ? "Placing order..."
                        : !userPhone
                          ? "Add Phone to Place Order"
                          : !selectedAddress?.id
                            ? "Select Address to Checkout"
                            : "Place Order"}
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <Button
                        size="lg"
                        className="rounded-full h-12 font-bold active:scale-95 transition-all bg-primary text-primary-foreground hover:brightness-110 shadow-md"
                        onClick={goToLogin}
                      >
                        Log In
                      </Button>

                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-full h-12 font-bold active:scale-95 transition-all border-2 border-primary/40 text-primary hover:bg-primary/10"
                        onClick={goToSignup}
                      >
                        Sign Up
                      </Button>
                    </div>
                  )}

                  {freeDeliveryAbove > 0 && (
                    <p className="text-center text-xs text-muted-foreground">
                      Free {deliveryChargeLabel.toLowerCase()} on orders above {formatPrice(freeDeliveryAbove, settings.currency, settings.currencyLocale)}.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Phone Number Modal Required before Checkout */}
      <Dialog open={phoneModalOpen} onOpenChange={setPhoneModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Phone Number Required
            </DialogTitle>
            <DialogDescription>
              A valid phone number is required to confirm your order for courier delivery coordination and order updates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveUserPhone} className="space-y-4 pt-2">
            {phoneError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{phoneError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="checkout-phone-input">Mobile Phone Number *</Label>
              <Input
                id="checkout-phone-input"
                type="tel"
                placeholder="e.g. 9876543210 or +91 9876543210"
                value={modalPhoneInput}
                onChange={(e) => setModalPhoneInput(e.target.value)}
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Must be at least 10 digits. This will also be saved to your user profile for future orders.
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPhoneModalOpen(false)}
                disabled={savingPhone}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingPhone} className="gap-1.5 font-bold">
                {savingPhone ? "Saving..." : "Save Phone & Place Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Cart;
