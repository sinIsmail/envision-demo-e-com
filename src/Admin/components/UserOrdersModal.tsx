import { useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, increment, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase/fb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Order, type OrderStatus, STATUS_LABELS, effectiveStatus } from "@/types/order";
import { OrderStatusBadge } from "@/Admin/components/OrderStatusBadge";
import { toast } from "@/components/ui/toast";
import {
  X,
  Package,
  ChevronRight,
  MapPin,
  Clock,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Ban,
  Phone,
  Trash2,
} from "lucide-react";

const TRACKING_STEPS: OrderStatus[] = [
  "placed",
  "being_packed",
  "ready_for_shipment",
  "out_for_delivery",
  "shipped",
];

// ─── Status step pipeline ─────────────────────────────────────────────────────
const STATUS_STEP_ICONS: Record<OrderStatus, React.ReactNode> = {
  placed: <ShoppingBag className="h-4 w-4" />,
  being_packed: <Package className="h-4 w-4" />,
  ready_for_shipment: <Truck className="h-4 w-4" />,
  out_for_delivery: <Truck className="h-4 w-4" />,
  shipped: <CheckCircle2 className="h-4 w-4" />,
  cancelled: <Ban className="h-4 w-4" />,
};

interface Props {
  user: { id: string; name?: string; email?: string; phone?: string };
  onClose: () => void;
}

export function UserOrdersModal({ user, onClose }: Props) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch on first mount
  useState(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, "orders"), where("userId", "==", user.id));
        const snap = await getDocs(q);
        const fetched = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Order))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          });
        setOrders(fetched);
      } catch (err) {
        console.error(err);
        toast.add({ title: "Error", description: "Could not load user orders." });
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  });

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingId(orderId);
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });

      // If cancelled, restore stock for items
      if (newStatus === "cancelled") {
        const ord = orders?.find((o) => o.id === orderId);
        if (ord?.items && ord.items.length > 0) {
          const stockPromises = ord.items.map(async (item) => {
            if (!item.productId) return;
            try {
              await updateDoc(doc(db, "products", item.productId), {
                stock: increment(item.quantity),
              });
            } catch (err) {
              console.warn("Stock restore error:", err);
            }
          });
          await Promise.all(stockPromises);
        }
      }

      setOrders((prev) =>
        prev ? prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)) : prev
      );
      toast.add({ title: "Status updated", description: STATUS_LABELS[newStatus] });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Update failed", description: "Could not update status." });
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      setUpdatingId(orderId);
      await deleteDoc(doc(db, "orders", orderId));
      setOrders((prev) => (prev ? prev.filter((o) => o.id !== orderId) : []));
      toast.add({
        title: "Order Deleted",
        description: `Order #${orderId.slice(-6).toUpperCase()} was deleted.`,
      });
    } catch (err: any) {
      console.error(err);
      toast.add({ title: "Error", description: err.message || "Could not delete order." });
    } finally {
      setUpdatingId(null);
    }
  };

  const displayName = user.name || user.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel — full screen on mobile, right-drawer on sm+ */}
      <div className="relative z-10 flex h-full w-full flex-col bg-background shadow-2xl overflow-hidden sm:max-w-2xl sm:ml-auto">

        {/* Header */}
        <div className="flex items-center gap-4 border-b px-6 py-5 bg-gradient-to-r from-primary/10 to-background shrink-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{displayName}</h2>
            {user.name && user.email && (
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            )}
            {user.phone && (
              <p className="text-xs text-muted-foreground mt-0.5">📞 {user.phone}</p>
            )}
            {orders && (
              <Badge variant="secondary" className="mt-1">
                {orders.length} order{orders.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading && (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {!loading && orders?.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-lg font-semibold">No orders yet</p>
              <p className="mt-1 text-sm text-muted-foreground">This user hasn't placed any orders.</p>
            </div>
          )}

          {orders?.map((order) => {
            const status = effectiveStatus(order);
            const isCancelled = status === "cancelled";
            const currentStepIndex = TRACKING_STEPS.indexOf(status);
            const isExpanded = expandedId === order.id;
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                  isCancelled ? "border-rose-200/60 bg-rose-50/10 dark:border-rose-950/50" : ""
                }`}
              >
                {/* Order header row */}
                <div className="flex items-start gap-3 px-4 py-4 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {order.createdAt?.toDate
                          ? order.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}</span>
                    </div>
                    {/* Status + total on mobile go below */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <OrderStatusBadge status={status} />
                      <p className="font-bold text-sm">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 self-center transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-4 space-y-5 bg-muted/20">

                    {/* Status Stepper or Cancelled Alert */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Order Progress
                      </p>
                      {isCancelled ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                            <Ban className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-destructive text-xs">Order Cancelled</p>
                            <p className="text-[11px] text-muted-foreground">
                              This order has been cancelled and items were restored to inventory.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0 overflow-x-auto">
                          {TRACKING_STEPS.map((s, idx) => {
                            const isCompleted = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;
                            return (
                              <div key={s} className="flex items-center flex-1 last:flex-none min-w-0">
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                                      isCompleted
                                        ? isCurrent
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-green-500 bg-green-500 text-white"
                                        : "border-muted-foreground/30 bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {STATUS_STEP_ICONS[s]}
                                  </div>
                                  <span className={`hidden sm:block text-[10px] text-center leading-tight max-w-[56px] ${isCompleted ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                    {STATUS_LABELS[s]}
                                  </span>
                                </div>
                                {idx < TRACKING_STEPS.length - 1 && (
                                  <div className={`h-0.5 flex-1 mb-0 sm:mb-5 mx-1 transition-colors ${idx < currentStepIndex ? "bg-green-500" : "bg-muted-foreground/20"}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Update Status Buttons */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Update Status
                      </p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {TRACKING_STEPS.filter((s) => s !== "placed").map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant={status === s ? "default" : "outline"}
                            disabled={isUpdating || status === s || isCancelled}
                            onClick={() => updateStatus(order.id, s)}
                            className="text-xs"
                          >
                            {isUpdating && status !== s ? "..." : STATUS_LABELS[s]}
                          </Button>
                        ))}
                        <div className="flex items-center gap-1.5 ml-auto">
                          {!isCancelled && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isUpdating}
                              onClick={() => updateStatus(order.id, "cancelled")}
                              className="text-xs flex items-center gap-1"
                            >
                              <Ban className="h-3 w-3" />
                              Cancel
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isUpdating}
                            onClick={() => deleteOrder(order.id)}
                            className="text-xs text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center gap-1"
                            title="Permanently Delete Order"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Items list */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Items
                      </p>
                      <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 rounded-lg border bg-card p-2">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="h-10 w-10 rounded-md object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} · ₹{Number(item.price).toLocaleString("en-IN")} each
                              </p>
                            </div>
                            <p className="text-sm font-semibold shrink-0">
                              ₹{Number(item.price * item.quantity).toLocaleString("en-IN")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="rounded-lg border bg-card p-3 space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₹{Number(order.subtotal ?? 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{order.shipping === 0 ? "Free" : `₹${order.shipping}`}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t pt-1.5 mt-1.5">
                        <span>Total</span>
                        <span>₹{Number(order.total ?? 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {order.deliveryAddress && (
                      <div className="flex items-start gap-2 rounded-lg border bg-card p-3">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium">{order.deliveryAddress.name}</p>
                          {order.deliveryAddress.phone && (
                            <p className="flex items-center gap-1.5 font-mono text-primary font-medium text-xs my-0.5">
                              <Phone className="h-3 w-3" />
                              <a href={`tel:${order.deliveryAddress.phone}`} className="hover:underline">
                                {order.deliveryAddress.phone}
                              </a>
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            {[
                              order.deliveryAddress.line1,
                              order.deliveryAddress.line2,
                              order.deliveryAddress.city,
                              order.deliveryAddress.state,
                              order.deliveryAddress.pincode,
                            ].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Order metadata */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        Placed on{" "}
                        {order.createdAt?.toDate
                          ? order.createdAt.toDate().toLocaleString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
