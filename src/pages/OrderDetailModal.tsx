import {
  X,
  Package,
  MapPin,
  Clock,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Ban,
  Phone,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Order, type OrderStatus, STATUS_LABELS, effectiveStatus, formatOrderId } from "@/types/order";
import { OrderStatusBadge } from "@/Admin/components/OrderStatusBadge";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { downloadOrderBill } from "@/lib/pdfBillGenerator";

const TRACKING_STEPS: OrderStatus[] = [
  "placed",
  "being_packed",
  "ready_for_shipment",
  "out_for_delivery",
  "shipped",
];

// ─── Step Icons ───────────────────────────────────────────────────────────────
const STEP_ICONS: Record<OrderStatus, React.ReactNode> = {
  placed: <ShoppingBag className="h-4 w-4" />,
  being_packed: <Package className="h-4 w-4" />,
  ready_for_shipment: <Truck className="h-4 w-4" />,
  out_for_delivery: <Truck className="h-4 w-4" />,
  shipped: <CheckCircle2 className="h-4 w-4" />,
  cancelled: <Ban className="h-4 w-4" />,
};

interface Props {
  order: Order;
  onClose: () => void;
}

export function OrderDetailModal({ order, onClose }: Props) {
  const { settings } = useSiteSettings();
  const status = effectiveStatus(order);
  const isCancelled = status === "cancelled";
  const currentStepIndex = TRACKING_STEPS.indexOf(status);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg max-h-[90dvh] flex flex-col bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4 shrink-0 bg-gradient-to-r from-primary/5 to-background">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base">
              Order {formatOrderId(order)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {order.createdAt?.toDate
                ? order.createdAt.toDate().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <OrderStatusBadge status={status} />
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* ── Status Tracker ─────────────────────────────────────────────── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Order Status
            </p>
            {isCancelled ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-destructive text-sm">Order Cancelled</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This order was cancelled by the store administrator.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-1">
                  {TRACKING_STEPS.map((s, idx) => {
                    const isCompleted = idx <= currentStepIndex;
                    const isCurrentStep = idx === currentStepIndex;

                    return (
                      <div key={s} className="flex flex-1 flex-col items-center last:flex-none relative">
                        {/* Connector line (left side) */}
                        {idx > 0 && (
                          <div
                            className={`absolute top-4 right-1/2 left-[-50%] h-0.5 translate-y-0 ${
                              idx <= currentStepIndex ? "bg-green-500" : "bg-muted-foreground/20"
                            }`}
                          />
                        )}

                        {/* Circle */}
                        <div
                          className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                            isCurrentStep
                              ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                              : isCompleted
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-muted-foreground/30 bg-muted text-muted-foreground"
                          }`}
                        >
                          {STEP_ICONS[s]}
                        </div>

                        {/* Label */}
                        <span
                          className={`mt-2 text-center text-[10px] leading-tight px-0.5 ${
                            isCurrentStep
                              ? "font-bold text-primary"
                              : isCompleted
                              ? "font-semibold text-green-600 dark:text-green-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Current status description */}
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <p className="text-sm font-medium text-primary">
                    {isCurrent(status)}
                  </p>
                </div>
              </>
            )}
          </section>

          {/* ── Items ──────────────────────────────────────────────────────── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Items ({order.items?.length ?? 0})
            </p>
            <div className="space-y-2.5">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    {item.variantLabel && (
                      <span className="inline-block text-[11px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5 mt-0.5">
                        {item.variantLabel}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ₹{Number(item.price).toLocaleString("en-IN")} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold text-sm shrink-0">
                    ₹{Number(item.price * item.quantity).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Pricing ────────────────────────────────────────────────────── */}
          <section className="rounded-xl border bg-card overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-4 pb-2">
              Price Breakdown
            </p>
            <div className="divide-y">
              <div className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{Number(order.subtotal ?? 0).toLocaleString("en-IN")}</span>
              </div>
              {order.billingFees && order.billingFees.length > 0 ? (
                order.billingFees.map((fee) => (
                  <div key={fee.id} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">{fee.name}</span>
                    <span className={fee.waived ? "text-green-600 font-medium" : ""}>
                      {fee.waived ? "🎉 Free" : `₹${fee.amount}`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className={order.shipping === 0 ? "text-green-600 font-medium" : ""}>
                    {order.shipping === 0 ? "🎉 Free" : `₹${order.shipping}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 text-sm font-bold bg-muted/40">
                <span>Total Paid</span>
                <span className="text-base">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </section>

          {/* ── Delivery Address ────────────────────────────────────────────── */}
          {order.deliveryAddress && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Delivery Address
              </p>
              <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold">{order.deliveryAddress.name}</p>
                  {order.deliveryAddress.phone && (
                    <p className="flex items-center gap-1.5 font-mono text-primary text-xs my-0.5 font-medium">
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
                    ].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-muted-foreground">
                    {[
                      order.deliveryAddress.city,
                      order.deliveryAddress.state,
                      order.deliveryAddress.pincode,
                    ].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ── Order Meta ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              Placed on{" "}
              {order.createdAt?.toDate
                ? order.createdAt.toDate().toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-4 shrink-0 flex flex-col sm:flex-row items-center gap-2">
          <Button
            variant="default"
            className="w-full sm:flex-1 gap-1.5 font-semibold text-xs sm:text-sm"
            onClick={() => downloadOrderBill(order, settings)}
          >
            <FileText className="h-4 w-4" />
            Download Bill (PDF)
          </Button>
          <Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: current status description ──────────────────────────────────────
function isCurrent(status: OrderStatus): string {
  const messages: Record<OrderStatus, string> = {
    placed: "Your order has been received and is awaiting processing.",
    being_packed: "Great news! Your items are currently being packed.",
    ready_for_shipment: "Your order is packed and ready to be handed to the courier.",
    out_for_delivery: "Your order is out for delivery and on its way to you!",
    shipped: "Your order has been delivered. Enjoy your purchase! 🎉",
    cancelled: "This order has been cancelled.",
  };
  return messages[status] || "Processing your order...";
}
