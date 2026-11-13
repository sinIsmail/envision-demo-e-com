// ─── Order Status ───────────────────────────────────────────────────────────
export type OrderStatus =
  | "placed"
  | "being_packed"
  | "ready_for_shipment"
  | "out_for_delivery"
  | "shipped"
  | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "being_packed",
  "ready_for_shipment",
  "out_for_delivery",
  "shipped",
  "cancelled",
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Order Placed",
  being_packed: "Being Packed",
  ready_for_shipment: "Ready for Shipment",
  out_for_delivery: "Out for Delivery",
  shipped: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_ICONS: Record<OrderStatus, string> = {
  placed: "📋",
  being_packed: "📦",
  ready_for_shipment: "🚚",
  out_for_delivery: "🛵",
  shipped: "✅",
  cancelled: "❌",
};

// ─── Order Item ──────────────────────────────────────────────────────────────
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantLabel?: string; // e.g. "250g", "500ml", "1L" — undefined for regular products
}

// ─── Delivery Address ────────────────────────────────────────────────────────
export interface DeliveryAddress {
  name: string;
  phone: string;
  email?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

// ─── Applied Fee on Order ────────────────────────────────────────────────────
export interface AppliedFee {
  id: string;
  name: string;
  amount: number;
  waived: boolean;
}

// ─── Order ───────────────────────────────────────────────────────────────────
export interface Order {
  id: string;                  // Firestore document id
  orderNumber?: number;         // Sequential integer counter (1, 2, 3...)
  orderId?: string;             // Human-readable sequential ID ("01", "02", "15"...)
  userId: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  deliveryAddress?: DeliveryAddress;
  subtotal: number;
  shipping: number;
  billingFees?: AppliedFee[];   // Itemized dynamic billing fees applied to order
  total: number;
  status?: OrderStatus;        // undefined ⇒ treat as "placed"
  createdAt?: any;             // Firestore Timestamp
}

/** Returns the effective status, defaulting to "placed" if not set. */
export function effectiveStatus(order: Order): OrderStatus {
  return order.status ?? "placed";
}

/** Formats the sequential human-readable Order ID (e.g. #01, #02) */
export function formatOrderId(order: { orderId?: string; orderNumber?: number; id?: string }, fallbackIndex?: number): string {
  if (order.orderId) return `#${order.orderId}`;
  if (order.orderNumber) return `#${String(order.orderNumber).padStart(2, "0")}`;
  if (typeof fallbackIndex === "number") return `#${String(fallbackIndex + 1).padStart(2, "0")}`;
  if (order.id) return `#${order.id.slice(-6).toUpperCase()}`;
  return "#01";
}
