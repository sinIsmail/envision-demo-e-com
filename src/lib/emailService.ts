/**
 * Email Notification Service — powered by EmailJS (@emailjs/browser).
 * Client-side native, CORS-friendly, and works without requiring custom domain DNS.
 *
 * Supported Events (Only 2):
 *   1. Order Placed   — Sent to customer automatically on checkout in cart.tsx
 *   2. Order Cancelled — Sent to customer automatically when admin cancels an order in OrdersTab.tsx
 */

import emailjs from "@emailjs/browser";
import { type SiteSettings } from "@/types/siteSettings";

// ─── Verified Defaults (Requested by User) ──────────────────────────────────
export const DEFAULT_SERVICE_ID = "service_l42nxid";
export const DEFAULT_PUBLIC_KEY = "J_tUJ1nmVg3u2fMzj";
export const DEFAULT_TEMPLATE_PLACED = "template_mk6jk5e";
export const DEFAULT_TEMPLATE_CANCELLED = "template_mk6jk5e";

export interface ResolvedEmailConfig {
  serviceId: string;
  publicKey: string;
  templateOrderPlaced: string;
  templateOrderCancelled: string;
}

/**
 * Resolves active EmailJS credentials from SiteSettings, environment variables, or defaults.
 */
export function resolveEmailConfig(settings?: Partial<SiteSettings>): ResolvedEmailConfig {
  const serviceId =
    settings?.emailServiceId?.trim() ||
    (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined)?.trim() ||
    DEFAULT_SERVICE_ID;

  const publicKey =
    settings?.emailPublicKey?.trim() ||
    (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined)?.trim() ||
    DEFAULT_PUBLIC_KEY;

  const templateOrderPlaced =
    settings?.emailTemplateOrderPlaced?.trim() ||
    (import.meta.env.VITE_EMAILJS_TEMPLATE_ORDER_PLACED as string | undefined)?.trim() ||
    DEFAULT_TEMPLATE_PLACED;

  const templateOrderCancelled =
    settings?.emailTemplateOrderCancelled?.trim() ||
    (import.meta.env.VITE_EMAILJS_TEMPLATE_ORDER_CANCELLED as string | undefined)?.trim() ||
    DEFAULT_TEMPLATE_CANCELLED;

  return {
    serviceId,
    publicKey,
    templateOrderPlaced,
    templateOrderCancelled,
  };
}

// ─── Shared Parameter Types ──────────────────────────────────────────────────
export interface OrderPlacedItem {
  name: string;
  variantLabel?: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderPlacedFee {
  name: string;
  amount: string;
  waived?: boolean;
}

export interface OrderPlacedParams {
  toEmail: string;
  toName: string;
  orderId: string;
  orderDate: string;
  brandName: string;
  items: OrderPlacedItem[];
  fees?: OrderPlacedFee[];
  subtotal: string;
  total: string;
  deliveryAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface OrderCancelledParams {
  toEmail: string;
  toName: string;
  orderId: string;
  brandName: string;
  items: Array<{
    name: string;
    variantLabel?: string;
    quantity: number;
    lineTotal?: string;
  }>;
  total: string;
  cancellationReason?: string;
}

// ─── 1. Send Order Placed Email ──────────────────────────────────────────────
export async function sendOrderPlacedEmail(
  params: OrderPlacedParams,
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message?: string }> {
  const config = resolveEmailConfig(settings);

  if (!params.toEmail || !params.toEmail.includes("@")) {
    return { success: false, message: "Invalid or missing recipient email." };
  }

  if (!config.serviceId || !config.publicKey || !config.templateOrderPlaced) {
    return { success: false, message: "EmailJS credentials or template not configured." };
  }

  // Format line items cleanly
  const itemsText = params.items
    .map(
      (it, idx) =>
        `${idx + 1}. ${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ""} × ${it.quantity} — ${it.lineTotal}`
    )
    .join("\n");

  const addr = params.deliveryAddress;
  const addressText = [
    `${addr.name} · ${addr.phone}`,
    addr.line1,
    addr.line2,
    `${addr.city}, ${addr.state} — ${addr.pincode}`,
  ]
    .filter(Boolean)
    .join("\n");

  const shippingText =
    params.fees && params.fees.length > 0
      ? params.fees.map((f) => `${f.name}: ${f.waived ? "Free" : f.amount}`).join(", ")
      : "Free";

  const templateParams: Record<string, string> = {
    // Recipient Aliases (Ensures it matches whichever field is in EmailJS Settings)
    to_email: params.toEmail,
    email: params.toEmail,
    customer_email: params.toEmail,
    user_email: params.toEmail,
    recipient_email: params.toEmail,
    reply_to: params.toEmail,

    // Customer Name Aliases
    to_name: params.toName,
    customer_name: params.toName,
    name: params.toName,

    // Store & Order Meta
    brand_name: params.brandName,
    from_name: params.brandName,
    order_id: params.orderId,
    orderId: params.orderId,
    order_date: params.orderDate,
    orderDate: params.orderDate,

    // Items & Pricing
    items_list: itemsText,
    items: itemsText,
    order_items: itemsText,
    subtotal: params.subtotal,
    shipping: shippingText,
    total: params.total,
    order_total: params.total,
    amount: params.total,

    // Address
    delivery_address: addressText,
    address: addressText,

    // Plaintext summary message fallback
    message: `Order ${params.orderId} Confirmed!\n\nHi ${params.toName},\n\nThank you for shopping with ${params.brandName}.\n\nItems Ordered:\n${itemsText}\n\nSubtotal: ${params.subtotal}\nShipping: ${shippingText}\nTotal: ${params.total}\n\nDelivery Address:\n${addressText}`,
  };

  try {
    console.info("[EmailService] Sending order placed email to:", params.toEmail, "via EmailJS service:", config.serviceId);
    const res = await emailjs.send(config.serviceId, config.templateOrderPlaced, templateParams, {
      publicKey: config.publicKey,
    });
    console.info("[EmailService] Order placed email sent successfully:", res.status, res.text);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] EmailJS send error:", err);
    return {
      success: false,
      message: err?.text || err?.message || "Failed to deliver email via EmailJS",
    };
  }
}

// ─── 2. Send Order Cancelled Email ───────────────────────────────────────────
export async function sendOrderCancelledEmail(
  params: OrderCancelledParams,
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message?: string }> {
  const config = resolveEmailConfig(settings);

  if (!params.toEmail || !params.toEmail.includes("@")) {
    return { success: false, message: "Invalid or missing recipient email." };
  }

  if (!config.serviceId || !config.publicKey || !config.templateOrderCancelled) {
    return { success: false, message: "EmailJS credentials or template not configured." };
  }

  const reason = params.cancellationReason || "Store administrator cancellation & inventory restock";

  const itemsText = params.items
    .map(
      (it, idx) =>
        `${idx + 1}. ${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ""} × ${it.quantity}${it.lineTotal ? ` — ${it.lineTotal}` : ""}`
    )
    .join("\n");

  const templateParams: Record<string, string> = {
    to_email: params.toEmail,
    email: params.toEmail,
    customer_email: params.toEmail,
    user_email: params.toEmail,
    recipient_email: params.toEmail,
    reply_to: params.toEmail,

    to_name: params.toName,
    customer_name: params.toName,
    name: params.toName,

    brand_name: params.brandName,
    from_name: params.brandName,
    order_id: params.orderId,
    orderId: params.orderId,

    cancel_reason: reason,
    cancellation_reason: reason,
    reason: reason,

    items_list: itemsText,
    items: itemsText,
    order_items: itemsText,
    total: params.total,
    order_total: params.total,
    amount: params.total,

    message: `Order ${params.orderId} Cancelled\n\nHi ${params.toName},\n\nYour order from ${params.brandName} has been cancelled.\nReason: ${reason}\n\nCancelled Items:\n${itemsText}\n\nTotal: ${params.total}\n\nIf payment was collected, refund or store credit will be processed promptly according to policy.`,
  };

  try {
    console.info("[EmailService] Sending order cancelled email to:", params.toEmail, "via EmailJS service:", config.serviceId);
    const res = await emailjs.send(config.serviceId, config.templateOrderCancelled, templateParams, {
      publicKey: config.publicKey,
    });
    console.info("[EmailService] Order cancelled email sent successfully:", res.status, res.text);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] EmailJS cancellation error:", err);
    return {
      success: false,
      message: err?.text || err?.message || "Failed to deliver cancellation email via EmailJS",
    };
  }
}

// ─── 3. Test Email Senders (For Admin Developer Tab) ─────────────────────────
export async function sendTestOrderPlacedEmail(
  targetEmail: string,
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message: string }> {
  const dummyParams: OrderPlacedParams = {
    toEmail: targetEmail.trim(),
    toName: "Valued Customer",
    orderId: "#01",
    orderDate: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    brandName: settings?.brandName || "Shop.",
    items: [
      { name: "Fresh Organic Apples", variantLabel: "1kg", quantity: 2, lineTotal: "₹240" },
      { name: "Farm Fresh Tomatoes", variantLabel: "500g", quantity: 1, lineTotal: "₹45" },
    ],
    fees: [{ name: "Delivery Charge", amount: "₹25", waived: false }],
    subtotal: "₹285",
    total: "₹310",
    deliveryAddress: {
      name: "Valued Customer",
      phone: "9876543210",
      line1: "123 Green Avenue",
      line2: "Near City Park",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    },
  };

  const res = await sendOrderPlacedEmail(dummyParams, settings);
  return {
    success: res.success,
    message: res.success
      ? `Order Placed test email sent successfully to ${targetEmail}! Check inbox or spam.`
      : res.message || "Failed to send test email.",
  };
}

export async function sendTestOrderCancelledEmail(
  targetEmail: string,
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message: string }> {
  const dummyParams: OrderCancelledParams = {
    toEmail: targetEmail.trim(),
    toName: "Valued Customer",
    orderId: "#01",
    brandName: settings?.brandName || "Shop.",
    items: [
      { name: "Fresh Organic Apples", variantLabel: "1kg", quantity: 2, lineTotal: "₹240" },
    ],
    total: "₹240",
    cancellationReason: "Item temporarily out of stock in warehouse",
  };

  const res = await sendOrderCancelledEmail(dummyParams, settings);
  return {
    success: res.success,
    message: res.success
      ? `Order Cancelled test email sent successfully to ${targetEmail}! Check inbox or spam.`
      : res.message || "Failed to send test email.",
  };
}
