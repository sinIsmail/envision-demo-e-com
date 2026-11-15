import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  doc,
  updateDoc,
  increment,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/firebase/fb";
import { toast } from "@/components/ui/toast";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  sendOrderCancelledEmail,
} from "@/lib/emailService";
import {
  type Order,
  type OrderStatus,
  ORDER_STATUSES,
  STATUS_LABELS,
  STATUS_ICONS,
  effectiveStatus,
  formatOrderId,
} from "@/types/order";
import { OrderStatusBadge } from "@/Admin/components/OrderStatusBadge";
import { ConfirmDangerModal } from "@/Admin/components/ConfirmDangerModal";
import { AdminOrderDetailModal } from "@/Admin/components/AdminOrderDetailModal";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Ban,
  Copy,
  Check,
  FileSpreadsheet,
  Trash2,
  FileText,
  Eye,
} from "lucide-react";
import { downloadOrderBill } from "@/lib/pdfBillGenerator";
import { formatPrice } from "@/lib/themeUtils";

// ─── Professional XLSX Export (Multi-sheet with auto column widths) ──────────
async function exportToExcel(orders: Order[], filename: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // ── Helper: auto column widths ──────────────────────────────────────────────
  function autoWidths(rows: Record<string, any>[]) {
    if (rows.length === 0) return [];
    const keys = Object.keys(rows[0]);
    return keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((r) => String(r[key] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 1 — Bill-Style Godown Sheet (one item per row, like a mall receipt)
  //           Orders separated by a blank row.
  //           Filter label is embedded in the filename so the sheet is universal.
  // ═══════════════════════════════════════════════════════════════════════════
  const billRows: Record<string, any>[] = [];

  orders.forEach((o, orderIdx) => {
    const addr = o.deliveryAddress;
    const dateObj = o.createdAt?.toDate ? o.createdAt.toDate() : null;
    const dateStr = dateObj ? dateObj.toLocaleDateString("en-IN") : "—";
    const timeStr = dateObj ? dateObj.toLocaleTimeString("en-IN") : "—";
    const fullAddress = addr
      ? [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
          .filter(Boolean)
          .join(", ")
      : "—";
    const items = o.items && o.items.length > 0
      ? o.items
      : [{ name: "No items listed", variantLabel: "—", quantity: 0, price: 0, productId: "", image: "" }];
    const totalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

    // ── ORDER HEADER ROW ──────────────────────────────────────────────────────
    billRows.push({
      "Order #": `ORDER ${orderIdx + 1}`,
      "Order ID": o.id,
      "Date": dateStr,
      "Time": timeStr,
      "Customer Name": o.userName || addr?.name || "Customer",
      "Phone": addr?.phone || "—",
      "City": addr?.city || "—",
      "Full Address": fullAddress,
      "Status": STATUS_LABELS[effectiveStatus(o)],
      "Item Name": "── ITEM NAME ──",
      "Variant / Size": "── VARIANT ──",
      "Qty": "── QTY ──",
      "Unit Price (₹)": "── PRICE ──",
      "Item Total (₹)": "── ITEM TOTAL ──",
      "Order Total (₹)": "",
      "Subtotal (₹)": "",
      "Shipping (₹)": "",
    });

    // ── ONE ROW PER ITEM ──────────────────────────────────────────────────────
    items.forEach((item, itemIdx) => {
      billRows.push({
        "Order #": "",
        "Order ID": "",
        "Date": "",
        "Time": "",
        "Customer Name": "",
        "Phone": "",
        "City": "",
        "Full Address": "",
        "Status": "",
        "Item Name": item.name,
        "Variant / Size": item.variantLabel || "Standard",
        "Qty": Number(item.quantity || 1),
        "Unit Price (₹)": Number(item.price || 0),
        "Item Total (₹)": Number(item.price || 0) * Number(item.quantity || 1),
        "Order Total (₹)": itemIdx === 0 ? Number(o.total ?? 0) : "",
        "Subtotal (₹)": "",
        "Shipping (₹)": "",
      });
    });

    // ── ORDER TOTALS / SUMMARY ROW ────────────────────────────────────────────
    billRows.push({
      "Order #": "",
      "Order ID": "",
      "Date": "",
      "Time": "",
      "Customer Name": `TOTAL — ${o.userName || addr?.name || "Customer"}`,
      "Phone": "",
      "City": "",
      "Full Address": "",
      "Status": `Items: ${items.length} | Units: ${totalQty}`,
      "Item Name": "ORDER TOTAL",
      "Variant / Size": "",
      "Qty": totalQty,
      "Unit Price (₹)": "",
      "Item Total (₹)": "",
      "Order Total (₹)": Number(o.total ?? 0),
      "Subtotal (₹)": Number(o.subtotal ?? 0),
      "Shipping (₹)": Number(o.shipping ?? 0),
    });

    // ── BLANK GAP ROW between orders ─────────────────────────────────────────
    billRows.push({
      "Order #": "",
      "Order ID": "",
      "Date": "",
      "Time": "",
      "Customer Name": "",
      "Phone": "",
      "City": "",
      "Full Address": "",
      "Status": "",
      "Item Name": "",
      "Variant / Size": "",
      "Qty": "",
      "Unit Price (₹)": "",
      "Item Total (₹)": "",
      "Order Total (₹)": "",
      "Subtotal (₹)": "",
      "Shipping (₹)": "",
    });
  });

  const wsBill = XLSX.utils.json_to_sheet(billRows);
  wsBill["!cols"] = autoWidths(billRows);
  XLSX.utils.book_append_sheet(wb, wsBill, "Godown Bill (Item-by-Item)");

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 2 — Orders Summary (one row per order)
  // ═══════════════════════════════════════════════════════════════════════════
  const summaryRows = orders.map((o, i) => {
    const addr = o.deliveryAddress;
    const totalQty = (o.items ?? []).reduce(
      (sum, it) => sum + (Number(it.quantity) || 0),
      0
    );
    const dateObj = o.createdAt?.toDate ? o.createdAt.toDate() : null;
    const itemsFormatted = (o.items ?? [])
      .map((it) => `${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ""} × ${it.quantity}`)
      .join(" | ");

    return {
      "S.No": i + 1,
      "Order ID": o.id,
      "Date": dateObj ? dateObj.toLocaleDateString("en-IN") : "—",
      "Time": dateObj ? dateObj.toLocaleTimeString("en-IN") : "—",
      "Status": STATUS_LABELS[effectiveStatus(o)],
      "Customer Name": o.userName || addr?.name || "—",
      "Customer Phone": addr?.phone || "—",
      "Customer Email": o.userEmail || "—",
      "Total Items Qty": totalQty,
      "All Items": itemsFormatted || "—",
      "Subtotal (₹)": Number(o.subtotal ?? 0),
      "Shipping (₹)": Number(o.shipping ?? 0),
      "Total Amount (₹)": Number(o.total ?? 0),
      "City": addr?.city || "—",
      "State": addr?.state || "—",
      "Pincode": addr?.pincode || "—",
      "Full Delivery Address": addr
        ? [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
            .filter(Boolean)
            .join(", ")
        : "—",
    };
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary["!cols"] = autoWidths(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Orders Summary");

  // ═══════════════════════════════════════════════════════════════════════════
  // SHEET 3 — Warehouse Pick Totals (aggregated by product & variant)
  // ═══════════════════════════════════════════════════════════════════════════
  const pickMap: Record<string, { name: string; variant: string; totalQty: number; ordersCount: number }> = {};
  orders.forEach((o) => {
    (o.items ?? []).forEach((item) => {
      const variantKey = item.variantLabel || "Standard";
      const key = `${item.name}____${variantKey}`;
      if (!pickMap[key]) {
        pickMap[key] = {
          name: item.name,
          variant: variantKey,
          totalQty: 0,
          ordersCount: 0,
        };
      }
      pickMap[key].totalQty += Number(item.quantity || 1);
      pickMap[key].ordersCount += 1;
    });
  });

  const pickListRows = Object.values(pickMap).map((item, idx) => ({
    "Item #": idx + 1,
    "Product Name": item.name,
    "Size / Volume / Variant": item.variant,
    "Total Qty to Dispatch": item.totalQty,
    "Orders Count": item.ordersCount,
  }));

  const wsPickList = XLSX.utils.json_to_sheet(pickListRows);
  wsPickList["!cols"] = autoWidths(pickListRows);
  XLSX.utils.book_append_sheet(wb, wsPickList, "Warehouse Pick Totals");

  XLSX.writeFile(wb, filename);
}

type DateFilter = "today" | "7days" | "all";

const filterLabel: Record<DateFilter, string> = {
  today: "Today",
  "7days": "Last 7 Days",
  all: "All Time",
};

// ─── Status dropdown (Mobile-First & Touch-Proof) ──────────────────────────
function StatusDropdown({
  order,
  onUpdated,
  onRequestCancel,
  compact = false,
}: {
  order: Order;
  onUpdated: (id: string, status: OrderStatus) => void;
  onRequestCancel: (order: Order) => void;
  compact?: boolean;
}) {
  const [updating, setUpdating] = useState(false);
  const current = effectiveStatus(order);

  const update = async (newStatus: OrderStatus) => {
    if (newStatus === current) return;
    if (newStatus === "cancelled") {
      onRequestCancel(order);
      return;
    }
    try {
      setUpdating(true);
      await updateDoc(doc(db, "orders", order.id), { status: newStatus });
      onUpdated(order.id, newStatus);
      toast.add({
        title: "Status updated",
        description: `Marked as "${STATUS_LABELS[newStatus]}"`,
      });
    } catch (err) {
      console.error(err);
      toast.add({
        title: "Update failed",
        description: "Could not update order status.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const statusColorClass =
    current === "placed"
      ? "border-amber-400/80 text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
      : current === "being_packed"
      ? "border-blue-400/80 text-blue-800 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20"
      : current === "ready_for_shipment"
      ? "border-indigo-400/80 text-indigo-800 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
      : current === "out_for_delivery"
      ? "border-purple-400/80 text-purple-800 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20"
      : current === "shipped"
      ? "border-emerald-500/80 text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
      : "border-rose-400/80 text-rose-800 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20";

  return (
    <div
      className={`relative inline-flex items-center ${compact ? "w-auto" : "w-full sm:w-auto"}`}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <select
        value={current}
        disabled={updating}
        onChange={(e) => update(e.target.value as OrderStatus)}
        aria-label="Change order status"
        className={`rounded-lg border font-semibold appearance-none bg-background transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${statusColorClass} ${
          compact
            ? "h-7 text-[11px] pl-2 pr-6"
            : "h-9 w-full sm:w-auto text-xs pl-3 pr-8"
        }`}
      >
        {ORDER_STATUSES.map((s) => (
          <option
            key={s}
            value={s}
            className="bg-popover text-foreground font-medium py-1.5"
          >
            {STATUS_ICONS[s]} {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`absolute pointer-events-none text-muted-foreground ${
          compact ? "right-1.5 h-3 w-3" : "right-2.5 h-3.5 w-3.5"
        }`}
      />
      {updating && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
        </span>
      )}
    </div>
  );
}

// ─── Cancel Order Confirmation Dialog ────────────────────────────────────────
function CancelOrderDialog({
  order,
  open,
  onClose,
  onConfirm,
  cancelling,
}: {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (order: Order) => Promise<void>;
  cancelling: boolean;
}) {
  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border bg-background p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Cancel Order #{order.id.slice(-6).toUpperCase()}?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              This will mark the order as Cancelled and return all item quantities back to inventory stock.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/40 p-3.5 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-semibold text-foreground">
              {order.userName || order.deliveryAddress?.name || "—"}
            </span>
          </div>
          {order.deliveryAddress?.phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-mono font-medium text-foreground">
                {order.deliveryAddress.phone}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order Total:</span>
            <span className="font-bold text-foreground">
              ₹{Number(order.total ?? 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="border-t pt-1.5 mt-1.5">
            <span className="text-muted-foreground block mb-1">Restoring inventory for:</span>
            <ul className="list-disc list-inside space-y-0.5 text-foreground font-medium">
              {(order.items ?? []).map((it, idx) => (
                <li key={idx}>
                  {it.name} {it.variantLabel ? `(${it.variantLabel})` : ""} × {it.quantity}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={cancelling}>
            Keep Order
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onConfirm(order)}
            disabled={cancelling}
          >
            {cancelling ? "Cancelling & Restoring Stock..." : "Yes, Cancel Order"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Batch Deletion Helper (Safe against Firestore 500-op limit) ─────────────
async function deleteInBatches(refs: any[]) {
  const BATCH_SIZE = 450;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

// ─── Single Order Card (Mobile / Tablet) ─────────────────────────────────────
function OrderCard({
  order,
  index,
  totalOrdersCount,
  onUpdated,
  onRequestCancel,
  onRequestDelete,
  onSelectOrder,
}: {
  order: Order;
  index: number;
  totalOrdersCount?: number;
  onUpdated: (id: string, status: OrderStatus) => void;
  onRequestCancel: (order: Order) => void;
  onRequestDelete: (order: Order) => void;
  onSelectOrder: (order: Order, index: number) => void;
}) {
  const { settings } = useSiteSettings();
  const [expanded, setExpanded] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const status = effectiveStatus(order);
  const isCancelled = status === "cancelled";

  const dateStr = order.createdAt?.toDate
    ? order.createdAt
        .toDate()
        .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const phone = order.deliveryAddress?.phone;
  const address = order.deliveryAddress;

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
    toast.add({ title: "Phone Copied", description: phone });
  };

  return (
    <div
      onClick={() => onSelectOrder(order, index)}
      className={`rounded-xl border bg-card relative transition-all cursor-pointer hover:border-primary/50 shadow-2xs ${
        isCancelled ? "border-rose-200/60 bg-rose-50/10 dark:border-rose-950/50" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-4 select-none">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Row 1: sequential ID + status selector + total */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-muted/80 text-foreground border">
              {formatOrderId(order, index, totalOrdersCount)}
            </span>
            <div onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
              <StatusDropdown
                order={order}
                onUpdated={onUpdated}
                onRequestCancel={onRequestCancel}
                compact
              />
            </div>
            <span className="font-bold text-sm ml-auto">
              {formatPrice(order.total, settings.currency, settings.currencyLocale)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Expand quick summary"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" />
              )}
            </Button>
          </div>

          {/* Row 2: Customer Name & Phone */}
          <p className="font-medium text-sm mt-1 truncate">
            {order.userName || address?.name || "Customer"}
          </p>
          {phone ? (
            <div className="flex items-center gap-2 mt-0.5">
              <a
                href={`tel:${phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-mono text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <Phone className="h-3 w-3" />
                {phone}
              </a>
              <button
                type="button"
                onClick={handleCopyPhone}
                className="text-muted-foreground hover:text-foreground p-0.5"
                title="Copy phone"
              >
                {copiedPhone ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground truncate">{order.userEmail || ""}</p>
          )}

          {/* Row 3: Date */}
          <p className="text-[11px] text-muted-foreground mt-0.5">{dateStr}</p>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-muted/20">
          {/* Customer & Delivery Address Card */}
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" /> Customer & Delivery Details
            </p>
            <div className="text-xs space-y-1">
              <p className="font-medium text-foreground">
                {order.userName || address?.name || "—"}
              </p>
              {phone && (
                <p className="flex items-center gap-1.5 font-mono text-primary">
                  <Phone className="h-3 w-3" />
                  <a href={`tel:${phone}`} className="hover:underline">
                    {phone}
                  </a>
                </p>
              )}
              {order.userEmail && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3 w-3" /> {order.userEmail}
                </p>
              )}
              {address && (
                <p className="text-muted-foreground pt-1 border-t mt-1 leading-relaxed">
                  {[address.line1, address.line2, address.city, address.state, address.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Items breakdown */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Order Items ({(order.items ?? []).length})
            </p>
            <div className="space-y-2">
              {(order.items ?? []).map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs rounded-lg border bg-card p-2.5"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-foreground truncate">{it.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {it.variantLabel ? `Variant: ${it.variantLabel} · ` : ""}{formatPrice(it.price, settings.currency, settings.currencyLocale)} each
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      Qty: {it.quantity}
                    </Badge>
                    <p className="font-bold text-foreground mt-0.5">
                      {formatPrice(it.price * it.quantity, settings.currency, settings.currencyLocale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border bg-card p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal ?? 0, settings.currency, settings.currencyLocale)}</span>
            </div>
            {order.billingFees && order.billingFees.length > 0 ? (
              order.billingFees.map((fee) => (
                <div key={fee.id} className="flex justify-between">
                  <span className="text-muted-foreground">{fee.name}</span>
                  <span>{fee.waived ? "Free" : formatPrice(fee.amount, settings.currency, settings.currencyLocale)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{order.shipping === 0 ? "Free" : formatPrice(order.shipping, settings.currency, settings.currencyLocale)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-1.5 mt-1.5 text-sm">
              <span>Total</span>
              <span>{formatPrice(order.total ?? 0, settings.currency, settings.currencyLocale)}</span>
            </div>
          </div>

          {/* Actions & Status */}
          <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex-1">
              <StatusDropdown
                order={order}
                onUpdated={onUpdated}
                onRequestCancel={onRequestCancel}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadOrderBill(order, settings)}
                className="text-xs flex items-center justify-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                title="Download / Print Bill (PDF)"
              >
                <FileText className="h-3.5 w-3.5" />
                Bill (PDF)
              </Button>
              {!isCancelled && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRequestCancel(order)}
                  className="text-xs flex items-center justify-center gap-1.5"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRequestDelete(order)}
                className="text-xs flex items-center justify-center gap-1.5 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                title="Permanently Delete Order"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main OrdersTab Component ────────────────────────────────────────────────
export function OrdersTab() {
  const { settings } = useSiteSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>("all");
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion state
  const [deleteTargetOrder, setDeleteTargetOrder] = useState<Order | null>(null);
  const [showDeleteAllOrdersModal, setShowDeleteAllOrdersModal] = useState(false);

  // Full detail modal state (opens when tapping any order on desktop or mobile)
  const [detailModalOrder, setDetailModalOrder] = useState<{
    order: Order;
    fallbackIndex: number;
  } | null>(null);

  const fetchOrders = async (f: DateFilter) => {
    setLoading(true);
    try {
      const col = collection(db, "orders");
      let q;
      if (f === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        q = query(
          col,
          where("createdAt", ">=", Timestamp.fromDate(start)),
          orderBy("createdAt", "desc")
        );
      } else if (f === "7days") {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        q = query(
          col,
          where("createdAt", ">=", Timestamp.fromDate(start)),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(col, orderBy("createdAt", "desc"));
      }
      const snap = await getDocs(q);
      const loadedOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));

      // Automated chronological sequence backfill:
      // If any existing order lacks orderNumber, sort all database orders by createdAt ascending,
      // assign permanent chronological numbers (Order 1 = 1st order ever placed, newest = highest number),
      // update Firestore docs, and initialize metadata/orders with the maximum count.
      const hasUnassigned = loadedOrders.some((o) => typeof o.orderNumber !== "number");
      if (hasUnassigned && f === "all") {
        try {
          const allAscSnap = await getDocs(
            query(collection(db, "orders"), orderBy("createdAt", "asc"))
          );
          const batch = writeBatch(db);
          let seq = 1;
          const migrated: Order[] = [];

          allAscSnap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const ord = { id: docSnap.id, ...data } as Order;
            const assignedNum = seq++;
            const formattedSeq = String(assignedNum).padStart(2, "0");

            batch.update(docSnap.ref, {
              orderNumber: assignedNum,
              orderId: formattedSeq,
            });

            ord.orderNumber = assignedNum;
            ord.orderId = formattedSeq;
            migrated.push(ord);
          });

          // Sync atomic sequence counter in metadata/orders
          const counterRef = doc(db, "metadata", "orders");
          batch.set(counterRef, { lastOrderNumber: seq - 1 }, { merge: true });

          await batch.commit();

          // Sort descending (newest first) for UI display
          migrated.sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return bTime - aTime;
          });

          setOrders(migrated);
          return;
        } catch (migrationErr) {
          console.warn("Chronological backfill notice:", migrationErr);
        }
      }

      setOrders(loadedOrders);
    } catch (err) {
      console.error(err);
      toast.add({ title: "Error", description: "Could not load orders." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(filter);
  }, [filter]);

  const handleStatusUpdate = (id: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    setDetailModalOrder((prev) =>
      prev && prev.order.id === id
        ? { ...prev, order: { ...prev.order, status } }
        : prev
    );
  };

  // ─── Order Cancellation Handler with Inventory Stock Restoration ──────────
  const handleConfirmCancel = async (order: Order) => {
    setCancelling(true);
    try {
      // 1. Update order status to "cancelled"
      await updateDoc(doc(db, "orders", order.id), { status: "cancelled" });

      // 2. Restore inventory quantities atomically for all items
      if (order.items && order.items.length > 0) {
        const stockPromises = order.items.map(async (item) => {
          if (!item.productId) return;
          try {
            await updateDoc(doc(db, "products", item.productId), {
              stock: increment(item.quantity),
            });
          } catch (err) {
            console.warn(`Could not restore stock for item ${item.productId}:`, err);
          }
        });
        await Promise.all(stockPromises);
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "cancelled" } : o))
      );

      // 3. Dispatch automated Order Cancelled notification email to customer
      const customerEmail =
        order.userEmail || (order.deliveryAddress as any)?.email;
      if (customerEmail) {
        const addr = order.deliveryAddress;
        const displayOrderId = order.orderId ? `#${order.orderId}` : `#${order.id.slice(-6).toUpperCase()}`;

        sendOrderCancelledEmail({
          toEmail: customerEmail,
          toName: order.userName || addr?.name || "Customer",
          orderId: displayOrderId,
          brandName: settings.brandName || "Shop.",
          items: (order.items ?? []).map((it) => ({
            name: it.name,
            variantLabel: it.variantLabel,
            quantity: it.quantity,
            lineTotal: formatPrice(it.price * it.quantity, settings.currency, settings.currencyLocale),
          })),
          total: formatPrice(order.total, settings.currency, settings.currencyLocale),
          cancellationReason: "Cancelled by store administrator & inventory stock restored.",
        }, settings)
          .then((res) => {
            if (res.success) {
              toast.add({
                title: "Cancellation Email Sent! ✉️",
                description: `Sent automatically to ${customerEmail}`,
              });
            } else {
              toast.add({
                title: "Cancellation Email Notice ⚠️",
                description: res.message || "Could not send cancellation email.",
              });
            }
          })
          .catch((err) => {
            console.warn("[Email] Cancellation email error:", err);
          });
      }

      toast.add({
        title: "Order Cancelled",
        description: `Order #${order.id.slice(-6).toUpperCase()} cancelled & stock restored.`,
      });
      setCancelTarget(null);
    } catch (err) {
      console.error("Cancellation error:", err);
      toast.add({
        title: "Cancellation Failed",
        description: "Could not cancel order. Please check permissions.",
      });
    } finally {
      setCancelling(false);
    }
  };

  // ─── Single Order Deletion Handler ────────────────────────────────────────
  const handleDeleteSingleOrder = async (restoreStock?: boolean) => {
    if (!deleteTargetOrder) return;
    try {
      // 1. If stock restoration requested and order is not cancelled, restore stock
      if (
        restoreStock &&
        effectiveStatus(deleteTargetOrder) !== "cancelled" &&
        deleteTargetOrder.items
      ) {
        const stockPromises = deleteTargetOrder.items.map(async (item) => {
          if (!item.productId) return;
          try {
            await updateDoc(doc(db, "products", item.productId), {
              stock: increment(item.quantity),
            });
          } catch (e) {
            console.warn("Stock restore skipped:", e);
          }
        });
        await Promise.all(stockPromises);
      }

      // 2. Delete order document
      await deleteDoc(doc(db, "orders", deleteTargetOrder.id));

      // 3. Update local state
      setOrders((prev) => prev.filter((o) => o.id !== deleteTargetOrder.id));
      toast.add({
        title: "Order Deleted",
        description: `Order #${deleteTargetOrder.id.slice(-6).toUpperCase()} was permanently removed.`,
      });
      setDeleteTargetOrder(null);
    } catch (err: any) {
      console.error("Order deletion failed:", err);
      toast.add({
        title: "Deletion Failed",
        description: err.message || "Could not delete order.",
      });
    }
  };

  // ─── Delete All Orders (Bulk Wipe) ────────────────────────────────────────
  const handleDeleteAllOrders = async (restoreStock?: boolean) => {
    if (orders.length === 0) return;
    try {
      // 1. If stock restoration requested, restore stock for non-cancelled orders
      if (restoreStock) {
        for (const ord of orders) {
          if (effectiveStatus(ord) !== "cancelled" && ord.items) {
            for (const item of ord.items) {
              if (item.productId) {
                try {
                  await updateDoc(doc(db, "products", item.productId), {
                    stock: increment(item.quantity),
                  });
                } catch (e) {
                  console.warn("Bulk stock restore skipped for item:", item.productId, e);
                }
              }
            }
          }
        }
      }

      // 2. Batch delete all orders in chunks of 450
      const refs = orders.map((o) => doc(db, "orders", o.id));
      await deleteInBatches(refs);

      // 3. Clear local state
      setOrders([]);
      toast.add({
        title: "All Orders Deleted",
        description: `Successfully permanently deleted all ${refs.length} order(s).`,
      });
      setShowDeleteAllOrdersModal(false);
    } catch (err: any) {
      console.error("Delete all orders failed:", err);
      toast.add({
        title: "Bulk Deletion Failed",
        description: err.message || "Failed to delete all orders.",
      });
    }
  };

  const handleExport = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const filename = `orders-${filter}-${today}.xlsx`;
    await exportToExcel(orders, filename);
    toast.add({
      title: "Excel Exported Successfully",
      description: "Includes Orders Summary, Delivery Manifest (Items & Sizes), and Warehouse Pick Totals.",
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.add({ title: "Copied to clipboard", description: text });
  };

  return (
    <>
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Orders Management</CardTitle>
              <CardDescription>
                {orders.length} order(s) · {filterLabel[filter]}
              </CardDescription>
            </div>

            {/* Filter + Export + Delete All Orders */}
            <div className="flex flex-wrap items-center gap-2">
              {(["today", "7days", "all"] as DateFilter[]).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="text-xs"
                >
                  {filterLabel[f]}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={orders.length === 0}
                className="text-xs flex items-center gap-1.5 font-medium border-primary/30 hover:bg-primary/5"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Export Excel (Itemized)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteAllOrdersModal(true)}
                disabled={orders.length === 0}
                className="text-xs border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center gap-1.5 font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete All Orders ({orders.length})
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No orders found.</p>
          ) : (
            <>
              {/* Mobile / Tablet View (Card layout) */}
              <div className="space-y-3 xl:hidden">
                {orders.map((o, i) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    index={i}
                    totalOrdersCount={orders.length}
                    onUpdated={handleStatusUpdate}
                    onRequestCancel={(order) => setCancelTarget(order)}
                    onRequestDelete={(order) => setDeleteTargetOrder(order)}
                    onSelectOrder={(order, idx) =>
                      setDetailModalOrder({ order, fallbackIndex: idx })
                    }
                  />
                ))}
              </div>

              {/* Desktop View (Table layout) */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">#</th>
                      <th className="pb-3 pr-4 font-medium">Customer & Contact</th>
                      <th className="pb-3 pr-4 font-medium">Delivery Address</th>
                      <th className="pb-3 pr-4 font-medium">Items Breakdown</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium text-right">Total</th>
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => {
                      const addr = o.deliveryAddress;
                      const phone = addr?.phone;
                      const status = effectiveStatus(o);
                      const isCancelled = status === "cancelled";
                      const totalQty = (o.items ?? []).reduce(
                        (sum, it) => sum + (Number(it.quantity) || 0),
                        0
                      );

                      return (
                        <tr
                          key={o.id}
                          onClick={() => setDetailModalOrder({ order: o, fallbackIndex: i })}
                          className={`border-b last:border-0 hover:bg-muted/60 cursor-pointer transition-colors ${
                            isCancelled ? "bg-rose-50/20 dark:bg-rose-950/20" : ""
                          }`}
                          title="Click to view full order details"
                        >
                          <td className="py-3.5 pr-4 font-mono text-xs font-bold text-foreground">
                            <span className="px-2 py-0.5 rounded bg-muted/80 border text-[11px]">
                              {formatOrderId(o, i, orders.length)}
                            </span>
                          </td>

                          {/* Customer & Contacts */}
                          <td className="py-3.5 pr-4">
                            <p className="font-semibold text-foreground">
                              {o.userName || addr?.name || "Customer"}
                            </p>
                            {phone ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <a
                                  href={`tel:${phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-mono text-primary font-medium hover:underline flex items-center gap-1"
                                >
                                  <Phone className="h-3 w-3" />
                                  {phone}
                                </a>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(phone, `${o.id}-phone`);
                                  }}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Copy phone"
                                >
                                  {copiedId === `${o.id}-phone` ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            ) : null}
                            {o.userEmail && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {o.userEmail}
                              </p>
                            )}
                          </td>

                          {/* Delivery Address */}
                          <td className="py-3.5 pr-4 max-w-[200px]">
                            {addr ? (
                              <div className="text-xs space-y-0.5">
                                <p className="font-medium text-foreground truncate">
                                  {addr.city}, {addr.pincode}
                                </p>
                                <p className="text-muted-foreground truncate text-[11px]" title={[addr.line1, addr.line2].filter(Boolean).join(", ")}>
                                  {[addr.line1, addr.line2].filter(Boolean).join(", ")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Items Breakdown */}
                          <td className="py-3.5 pr-4 max-w-[240px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {totalQty} unit{totalQty !== 1 ? "s" : ""}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ({(o.items ?? []).length} item{(o.items ?? []).length !== 1 ? "s" : ""})
                              </span>
                            </div>
                            <div className="mt-1 space-y-0.5">
                              {(o.items ?? []).slice(0, 2).map((it, idx) => (
                                <p key={idx} className="text-xs text-muted-foreground truncate">
                                  • {it.name} {it.variantLabel ? `(${it.variantLabel})` : ""}{" "}
                                  <strong className="text-foreground">×{it.quantity}</strong>
                                </p>
                              ))}
                              {(o.items ?? []).length > 2 && (
                                <p className="text-[10px] text-muted-foreground italic">
                                  +{(o.items ?? []).length - 2} more...
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 pr-4" onClick={(e) => e.stopPropagation()}>
                            <OrderStatusBadge status={status} />
                          </td>

                          {/* Total */}
                          <td className="py-3.5 pr-4 text-right font-bold text-foreground">
                            ₹{Number(o.total ?? 0).toLocaleString("en-IN")}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 pr-4 text-muted-foreground whitespace-nowrap text-xs">
                            {o.createdAt?.toDate
                              ? o.createdAt
                                  .toDate()
                                  .toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                              : "—"}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailModalOrder({ order: o, fallbackIndex: i });
                                }}
                                className="h-8 px-2.5 text-xs gap-1 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground font-semibold"
                                title="View Full Order Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadOrderBill(o, settings)}
                                className="h-8 px-2.5 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5 font-medium"
                                title="Download / Print Bill (PDF)"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Bill (PDF)
                              </Button>
                              <StatusDropdown
                                order={o}
                                onUpdated={handleStatusUpdate}
                                onRequestCancel={(ord) => setCancelTarget(ord)}
                              />
                              {!isCancelled && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCancelTarget(o)}
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10 text-xs"
                                  title="Cancel Order"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTargetOrder(o)}
                                className="h-8 px-2 text-destructive hover:bg-destructive/10 text-xs"
                                title="Permanently Delete Order"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Full Order Detail Modal on Tap */}
      <AdminOrderDetailModal
        order={detailModalOrder?.order ?? null}
        open={Boolean(detailModalOrder)}
        onClose={() => setDetailModalOrder(null)}
        onStatusUpdate={handleStatusUpdate}
        onRequestCancel={(ord) => setCancelTarget(ord)}
        onRequestDelete={(ord) => setDeleteTargetOrder(ord)}
        fallbackIndex={detailModalOrder?.fallbackIndex}
        totalOrdersCount={orders.length}
      />

      {/* Cancel Order Confirmation Modal */}
      <CancelOrderDialog
        order={cancelTarget}
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        cancelling={cancelling}
      />

      {/* Single Order Delete Confirmation Modal */}
      <ConfirmDangerModal
        open={Boolean(deleteTargetOrder)}
        title={`Delete Order #${deleteTargetOrder?.id.slice(-6).toUpperCase()}?`}
        description="This will permanently remove the order record from the store. This action cannot be undone."
        confirmLabel="Yes, Delete Order"
        loadingLabel="Deleting Order..."
        extraOptionLabel={
          deleteTargetOrder && effectiveStatus(deleteTargetOrder) !== "cancelled"
            ? "Restore item quantities back to inventory stock"
            : undefined
        }
        extraOptionDefault={true}
        onConfirm={handleDeleteSingleOrder}
        onClose={() => setDeleteTargetOrder(null)}
      />

      {/* Delete All Orders Bulk Confirmation Modal */}
      <ConfirmDangerModal
        open={showDeleteAllOrdersModal}
        title="Delete ALL Orders in One Go?"
        description={`This will permanently delete all ${orders.length} order records from the store database. This action is completely irreversible.`}
        itemCount={orders.length}
        itemLabel="orders"
        requiredPhrase="DELETE ALL ORDERS"
        confirmLabel="Permanently Delete All Orders"
        loadingLabel="Deleting All Orders..."
        extraOptionLabel="Restore product stock for active orders before deleting"
        extraOptionDefault={true}
        onConfirm={handleDeleteAllOrders}
        onClose={() => setShowDeleteAllOrdersModal(false)}
      />
    </>
  );
}
