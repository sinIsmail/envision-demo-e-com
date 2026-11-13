import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  type Order,
  type OrderStatus,
  ORDER_STATUSES,
  STATUS_LABELS,
  effectiveStatus,
  formatOrderId,
} from "@/types/order";
import { OrderStatusBadge } from "@/Admin/components/OrderStatusBadge";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { downloadOrderBill } from "@/lib/pdfBillGenerator";
import { formatPrice } from "@/lib/themeUtils";
import { toast } from "@/components/ui/toast";
import {
  Package,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Ban,
  Trash2,
  Copy,
  Check,
  Receipt,
} from "lucide-react";

interface AdminOrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => void;
  onRequestCancel: (order: Order) => void;
  onRequestDelete: (order: Order) => void;
  fallbackIndex?: number;
  totalOrdersCount?: number;
}

export function AdminOrderDetailModal({
  order,
  open,
  onClose,
  onStatusUpdate,
  onRequestCancel,
  onRequestDelete,
  fallbackIndex,
  totalOrdersCount,
}: AdminOrderDetailModalProps) {
  const { settings } = useSiteSettings();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!order) return null;

  const status = effectiveStatus(order);
  const isCancelled = status === "cancelled";
  const addr = order.deliveryAddress;
  const phone = addr?.phone;
  const customerEmail = order.userEmail || addr?.email;
  const fullAddress = addr
    ? [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
        .filter(Boolean)
        .join(", ")
    : "—";

  const dateObj = order.createdAt?.toDate ? order.createdAt.toDate() : null;
  const dateFormatted = dateObj
    ? dateObj.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
  const timeFormatted = dateObj
    ? dateObj.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const totalQty = (order.items ?? []).reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    toast.add({
      title: "Copied to clipboard",
      description: text,
    });
  };

  const formattedId = formatOrderId(order, fallbackIndex, totalOrdersCount);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 sm:rounded-2xl">
        {/* Header Strip */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl font-bold font-mono">
                    Order {formattedId}
                  </DialogTitle>
                  <OrderStatusBadge status={status} />
                </div>
                <DialogDescription className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {dateFormatted} at {timeFormatted}
                  </span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(order.id, "order-id")}
                    className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy full Firestore ID"
                  >
                    <span>ID: {order.id.slice(0, 10)}...</span>
                    {copiedField === "order-id" ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </DialogDescription>
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadOrderBill(order, settings)}
                className="gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5"
              >
                <FileText className="h-3.5 w-3.5" />
                Bill (PDF)
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Status Quick Changer Strip */}
          <div className="rounded-xl border p-3.5 bg-card space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Manage Order Status
              </span>
              <span className="text-xs text-muted-foreground">
                Current: <strong className="text-foreground">{STATUS_LABELS[status]}</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ORDER_STATUSES.filter((s) => s !== "cancelled").map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={status === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => onStatusUpdate(order.id, s)}
                  className={`text-xs h-7 px-2.5 rounded-lg transition-all ${
                    status === s
                      ? "shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </Button>
              ))}
              {!isCancelled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onRequestCancel(order);
                  }}
                  className="text-xs h-7 px-2.5 rounded-lg border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors ml-auto"
                >
                  <Ban className="h-3 w-3 mr-1" />
                  Cancel Order
                </Button>
              )}
            </div>
          </div>

          {/* Customer & Address Two-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Details */}
            <div className="rounded-xl border p-4 bg-muted/10 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                Customer Information
              </p>
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-sm text-foreground">
                  {order.userName || addr?.name || "Customer"}
                </p>
                {phone ? (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <a
                      href={`tel:${phone}`}
                      className="text-primary font-mono font-medium hover:underline flex items-center gap-1.5"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {phone}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(phone, "phone")}
                      className="text-muted-foreground hover:text-foreground p-1 rounded"
                      title="Copy phone"
                    >
                      {copiedField === "phone" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ) : null}
                {customerEmail ? (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <a
                      href={`mailto:${customerEmail}`}
                      className="text-primary hover:underline flex items-center gap-1.5 truncate max-w-[200px]"
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{customerEmail}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(customerEmail, "email")}
                      className="text-muted-foreground hover:text-foreground p-1 rounded"
                      title="Copy email"
                    >
                      {copiedField === "email" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="rounded-xl border p-4 bg-muted/10 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Delivery Address
                </p>
                {addr && (
                  <button
                    type="button"
                    onClick={() => handleCopy(fullAddress, "address")}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    {copiedField === "address" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="text-xs text-foreground space-y-1">
                {addr ? (
                  <>
                    <p className="font-semibold">
                      {addr.name || order.userName || "Customer"}
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      {[addr.line1, addr.line2].filter(Boolean).join(", ")}
                    </p>
                    <p className="font-medium text-foreground">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">No delivery address provided.</p>
                )}
              </div>
            </div>
          </div>

          {/* Ordered Products Itemized Breakdown */}
          <div className="rounded-xl border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 border-b flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary" /> Ordered Products ({totalQty} total units)
              </span>
              <span>{(order.items ?? []).length} unique item{(order.items ?? []).length !== 1 ? "s" : ""}</span>
            </div>
            <div className="divide-y divide-border/60">
              {(order.items ?? []).map((it, idx) => (
                <div key={idx} className="p-3.5 flex items-center gap-3">
                  {/* Thumbnail */}
                  {it.image ? (
                    <img
                      src={it.image}
                      alt={it.name}
                      className="h-12 w-12 rounded-lg object-cover border shrink-0 bg-muted"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                      <Package className="h-5 w-5" />
                    </div>
                  )}

                  {/* Title & Variant */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {it.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {it.variantLabel ? (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 font-medium">
                          Size/Weight: {it.variantLabel}
                        </Badge>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {formatPrice(it.price, settings.currency, settings.currencyLocale)} × {it.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      {formatPrice(
                        Number(it.price || 0) * Number(it.quantity || 1),
                        settings.currency,
                        settings.currencyLocale
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Billing & Dynamic Fees Breakdown */}
          <div className="rounded-xl border p-4 bg-muted/20 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-primary" /> Billing Breakdown
            </p>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal ({totalQty} items):</span>
                <span className="font-medium text-foreground">
                  {formatPrice(order.subtotal, settings.currency, settings.currencyLocale)}
                </span>
              </div>

              {/* Dynamic Applied Fees */}
              {order.billingFees && order.billingFees.length > 0 ? (
                order.billingFees.map((fee) => (
                  <div key={fee.id} className="flex justify-between items-center">
                    <span>{fee.name}:</span>
                    <span className="font-medium text-foreground">
                      {fee.waived ? (
                        <span className="text-emerald-600 font-semibold">Free (Waived)</span>
                      ) : (
                        formatPrice(fee.amount, settings.currency, settings.currencyLocale)
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span>Shipping & Delivery:</span>
                  <span className="font-medium text-foreground">
                    {order.shipping > 0
                      ? formatPrice(order.shipping, settings.currency, settings.currencyLocale)
                      : "Free"}
                  </span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between items-center text-sm font-bold text-foreground">
                <span>Grand Total:</span>
                <span className="text-base text-primary">
                  {formatPrice(order.total, settings.currency, settings.currencyLocale)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 sm:p-5 border-t bg-muted/30 flex items-center justify-between gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onRequestDelete(order);
            }}
            className="text-xs border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Order
          </Button>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadOrderBill(order, settings)}
              className="text-xs gap-1.5 font-semibold"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              Download Invoice
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="text-xs px-5"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
