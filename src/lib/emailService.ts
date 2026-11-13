/**
 * Email Notification Service (powered by EmailJS - browser-safe client-side).
 *
 * Credentials can be supplied either:
 *   1. Via Admin Panel -> Site Settings -> Email Notifications (stored in Firestore), OR
 *   2. Via environment variables in .env file:
 *        VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
 *        VITE_EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxxx
 *        VITE_EMAILJS_TEMPLATE_ORDER_PLACED=template_xxxxxxx
 *        VITE_EMAILJS_TEMPLATE_ORDER_DELIVERED=template_xxxxxxx
 */

import emailjs from "@emailjs/browser";
import { type SiteSettings } from "@/types/siteSettings";

// ─── Hardcoded Verified Credentials (Requested by User) ──────────────────────
export const HARDCODED_SERVICE_ID = "service_l42nxid";
export const HARDCODED_PUBLIC_KEY = "J_tUJ1nmVg3u2fMzj";
export const HARDCODED_TEMPLATE_PLACED = "template_mk6jk5e";
export const HARDCODED_TEMPLATE_DELIVERED = "template_mk6jk5e";
export const HARDCODED_TEMPLATE_CANCELLED = "template_mk6jk5e";

export interface ResolvedEmailConfig {
  serviceId: string;
  publicKey: string;
  templateOrderPlaced: string;
  templateOrderDelivered: string;
  templateOrderCancelled: string;
}

/**
 * Resolves EmailJS config with hardcoded verified defaults so email dispatch is guaranteed.
 */
export function resolveEmailConfig(settings?: Partial<SiteSettings>): ResolvedEmailConfig {
  // If Firestore has old failed service_eah3udd, automatically use service_l42nxid
  const rawService = settings?.emailServiceId?.trim();
  const serviceId =
    rawService && rawService !== "service_eah3udd"
      ? rawService
      : (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined)?.trim() ||
        HARDCODED_SERVICE_ID;

  const publicKey =
    settings?.emailPublicKey?.trim() ||
    (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined)?.trim() ||
    HARDCODED_PUBLIC_KEY;

  const templateOrderPlaced =
    settings?.emailTemplateOrderPlaced?.trim() ||
    (import.meta.env.VITE_EMAILJS_TEMPLATE_ORDER_PLACED as string | undefined)?.trim() ||
    HARDCODED_TEMPLATE_PLACED;

  // Use delivered template or fall back to order placed template so delivered emails never fail
  const templateOrderDelivered =
    settings?.emailTemplateOrderDelivered?.trim() ||
    (import.meta.env.VITE_EMAILJS_TEMPLATE_ORDER_DELIVERED as string | undefined)?.trim() ||
    templateOrderPlaced ||
    HARDCODED_TEMPLATE_DELIVERED;

  // Use cancelled template or fall back to order placed template
  const templateOrderCancelled =
    settings?.emailTemplateOrderCancelled?.trim() ||
    (import.meta.env.VITE_EMAILJS_TEMPLATE_ORDER_CANCELLED as string | undefined)?.trim() ||
    templateOrderPlaced ||
    HARDCODED_TEMPLATE_CANCELLED;

  return {
    serviceId,
    publicKey,
    templateOrderPlaced,
    templateOrderDelivered,
    templateOrderCancelled,
  };
}

export function isEmailConfigured(settings?: Partial<SiteSettings>): boolean {
  const config = resolveEmailConfig(settings);
  return Boolean(config.serviceId && config.publicKey);
}

// ─── Params Types ─────────────────────────────────────────────────────────────
export interface OrderPlacedEmailParams {
  toEmail: string;
  toName: string;
  orderId: string;
  orderDate: string;
  itemsList: string;
  subtotal: string;
  shipping: string;
  total: string;
  deliveryAddress: string;
  brandName: string;
}

export interface OrderDeliveredEmailParams {
  toEmail: string;
  toName: string;
  orderId: string;
  orderDate: string;
  itemsList: string;
  total: string;
  deliveryAddress: string;
  brandName: string;
}

export interface OrderCancelledEmailParams {
  toEmail: string;
  toName: string;
  orderId: string;
  orderDate?: string;
  cancellationReason?: string;
  itemsList: string;
  total: string;
  deliveryAddress?: string;
  brandName: string;
}

// ─── Send Order Placed Email ──────────────────────────────────────────────────
export async function sendOrderPlacedEmail(
  params: OrderPlacedEmailParams,
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message?: string }> {
  const config = resolveEmailConfig(settings);

  if (!config.serviceId || !config.publicKey || !config.templateOrderPlaced) {
    const msg =
      "EmailJS credentials missing. Please set Service ID, Public Key, and Order Placed Template ID in Admin Settings or .env";
    console.warn("[EmailService]", msg);
    return { success: false, message: msg };
  }

  if (!params.toEmail || !params.toEmail.includes("@")) {
    const msg = "Customer email address missing or invalid.";
    console.warn("[EmailService]", msg);
    return { success: false, message: msg };
  }

  try {
    // Provide full set of parameter aliases so any template schema in EmailJS works
    const fullOrderSummary = `Thank you, ${params.toName}!\n\nOrder ID: ${params.orderId}\nOrder Date: ${params.orderDate}\n\nItems Ordered:\n${params.itemsList}\n\nSubtotal: ${params.subtotal}\nShipping: ${params.shipping}\nTotal Amount: ${params.total}\n\nDelivery Address:\n${params.deliveryAddress}\n\nThank you for shopping with ${params.brandName}!`;

    const templateParams = {
      to_email: params.toEmail,
      email: params.toEmail,
      user_email: params.toEmail,
      customer_email: params.toEmail,
      recipient_email: params.toEmail,
      reply_to: params.toEmail,
      to_name: params.toName,
      name: params.toName,
      customer_name: params.toName,
      username: params.toName,
      user_name: params.toName,
      client_name: params.toName,
      from_name: params.brandName,
      greeting: `Thank you, ${params.toName}!`,
      thank_you: `Thank you, ${params.toName}!`,
      order_id: params.orderId,
      orderId: params.orderId,
      order_date: params.orderDate,
      orderDate: params.orderDate,
      items_list: params.itemsList,
      items: params.itemsList,
      itemsList: params.itemsList,
      order_items: params.itemsList,
      orderItems: params.itemsList,
      order_details: params.itemsList,
      subtotal: params.subtotal,
      shipping: params.shipping,
      total: params.total,
      order_total: params.total,
      total_amount: params.total,
      amount: params.total,
      delivery_address: params.deliveryAddress,
      address: params.deliveryAddress,
      brand_name: params.brandName,
      store_name: params.brandName,
      order_status: "Confirmed",
      status: "Confirmed",
      status_heading: "Order Confirmed! 🎉",
      status_message: `Thank you, ${params.toName}! Your order has been placed successfully and is being packed.`,
      subject: `Order Confirmation: ${params.orderId} - ${params.brandName}`,
      email_subject: `Order Confirmation: ${params.orderId} - ${params.brandName}`,
      message: fullOrderSummary,
      download_note: "Your official retail invoice / bill PDF has been generated and saved with your order.",
    };

    console.info("[EmailService] Sending order placed email to:", params.toEmail, "using service:", config.serviceId);

    const res = await emailjs.send(
      config.serviceId,
      config.templateOrderPlaced,
      templateParams,
      { publicKey: config.publicKey }
    );

    console.info("[EmailService] Order placed email sent successfully:", res.status, res.text);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] Failed to send order placed email:", err);
    return {
      success: false,
      message: err?.text || err?.message || "Failed to send email via EmailJS",
    };
  }
}

// ─── Send Order Delivered Email ───────────────────────────────────────────────
export async function sendOrderDeliveredEmail(
  params: OrderDeliveredEmailParams,
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message?: string }> {
  const config = resolveEmailConfig(settings);

  if (!config.serviceId || !config.publicKey || !config.templateOrderDelivered) {
    const msg =
      "EmailJS credentials missing. Please set Service ID, Public Key, and Order Delivered Template ID in Admin Settings or .env";
    console.warn("[EmailService]", msg);
    return { success: false, message: msg };
  }

  if (!params.toEmail || !params.toEmail.includes("@")) {
    const msg = "Customer email address missing or invalid.";
    console.warn("[EmailService]", msg);
    return { success: false, message: msg };
  }

  try {
    const deliveredSummary = `Hello ${params.toName},\n\nYour order ${params.orderId} has been successfully delivered!\n\nDelivered Items:\n${params.itemsList}\n\nTotal: ${params.total}\nDelivered To:\n${params.deliveryAddress}\n\nWe hope you love your purchase! Thank you for choosing ${params.brandName}.`;

    const templateParams = {
      to_email: params.toEmail,
      email: params.toEmail,
      user_email: params.toEmail,
      customer_email: params.toEmail,
      recipient_email: params.toEmail,
      reply_to: params.toEmail,
      to_name: params.toName,
      name: params.toName,
      customer_name: params.toName,
      username: params.toName,
      user_name: params.toName,
      client_name: params.toName,
      from_name: params.brandName,
      greeting: `Hello ${params.toName}, your order has arrived!`,
      thank_you: `Thank you, ${params.toName}!`,
      order_id: params.orderId,
      orderId: params.orderId,
      order_date: params.orderDate,
      orderDate: params.orderDate,
      items_list: params.itemsList,
      items: params.itemsList,
      itemsList: params.itemsList,
      order_items: params.itemsList,
      orderItems: params.itemsList,
      order_details: params.itemsList,
      total: params.total,
      order_total: params.total,
      total_amount: params.total,
      amount: params.total,
      delivery_address: params.deliveryAddress,
      address: params.deliveryAddress,
      brand_name: params.brandName,
      store_name: params.brandName,
      order_status: "Delivered",
      status: "Delivered",
      status_heading: "Your Order Has Arrived! 📦🎉",
      status_message: "Great news! Your package has been delivered successfully. We hope you love your purchase!",
      message: deliveredSummary,
      subject: `Order Delivered: ${params.orderId} - ${params.brandName}`,
      email_subject: `Order Delivered: ${params.orderId} - ${params.brandName}`,
      review_message: "If you enjoyed your shopping experience, please visit our store again and share your feedback!",
    };

    console.info("[EmailService] Sending order delivered email to:", params.toEmail, "using service:", config.serviceId);

    const res = await emailjs.send(
      config.serviceId,
      config.templateOrderDelivered,
      templateParams,
      { publicKey: config.publicKey }
    );

    console.info("[EmailService] Order delivered email sent successfully:", res.status, res.text);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] Failed to send order delivered email:", err);
    return {
      success: false,
      message: err?.text || err?.message || "Failed to send email via EmailJS",
    };
  }
}

// ─── Send Order Cancelled Email ───────────────────────────────────────────────
export async function sendOrderCancelledEmail(
  params: OrderCancelledEmailParams,
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message?: string }> {
  const config = resolveEmailConfig(settings);

  if (!config.serviceId || !config.publicKey || !config.templateOrderCancelled) {
    const msg =
      "EmailJS credentials missing. Please set Service ID, Public Key, and Order Cancelled Template ID in Admin Settings or .env";
    console.warn("[EmailService]", msg);
    return { success: false, message: msg };
  }

  if (!params.toEmail || !params.toEmail.includes("@")) {
    const msg = "Customer email address missing or invalid.";
    console.warn("[EmailService]", msg);
    return { success: false, message: msg };
  }

  try {
    const cancelReason = params.cancellationReason || "Store administrator cancellation & inventory restock";
    const cancelSummary = `Hello ${params.toName},\n\nYour order ${params.orderId} has been cancelled.\n\nReason: ${cancelReason}\n\nCancelled Items:\n${params.itemsList}\n\nTotal: ${params.total}\n\nIf payment was collected, refund or store credit will be processed promptly according to policy. Contact ${params.brandName} support with any questions.`;

    const templateParams = {
      to_email: params.toEmail,
      email: params.toEmail,
      user_email: params.toEmail,
      customer_email: params.toEmail,
      recipient_email: params.toEmail,
      reply_to: params.toEmail,
      to_name: params.toName,
      name: params.toName,
      customer_name: params.toName,
      username: params.toName,
      user_name: params.toName,
      client_name: params.toName,
      from_name: params.brandName,
      greeting: `Hello ${params.toName},`,
      thank_you: `Thank you, ${params.toName}`,
      order_id: params.orderId,
      orderId: params.orderId,
      order_date: params.orderDate || new Date().toLocaleDateString("en-IN"),
      orderDate: params.orderDate || new Date().toLocaleDateString("en-IN"),
      items_list: params.itemsList,
      items: params.itemsList,
      itemsList: params.itemsList,
      order_items: params.itemsList,
      orderItems: params.itemsList,
      order_details: params.itemsList,
      total: params.total,
      order_total: params.total,
      total_amount: params.total,
      amount: params.total,
      delivery_address: params.deliveryAddress || "",
      address: params.deliveryAddress || "",
      cancellation_reason: cancelReason,
      cancel_reason: cancelReason,
      reason: cancelReason,
      brand_name: params.brandName,
      store_name: params.brandName,
      order_status: "Cancelled",
      status: "Cancelled",
      status_heading: "Order Cancelled Notice ⚠️",
      status_message: `Your order ${params.orderId} has been cancelled. If payment was collected, refund or store credit will be processed promptly according to policy.`,
      message: cancelSummary,
      subject: `Order Cancelled: ${params.orderId} - ${params.brandName}`,
      email_subject: `Order Cancelled: ${params.orderId} - ${params.brandName}`,
    };

    console.info("[EmailService] Sending order cancelled email to:", params.toEmail, "using service:", config.serviceId);

    const res = await emailjs.send(
      config.serviceId,
      config.templateOrderCancelled,
      templateParams,
      { publicKey: config.publicKey }
    );

    console.info("[EmailService] Order cancelled email sent successfully:", res.status, res.text);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] Failed to send order cancelled email:", err);
    return {
      success: false,
      message: err?.text || err?.message || "Failed to send email via EmailJS",
    };
  }
}

// ─── Direct Test Email ────────────────────────────────────────────────────────
export async function sendDirectTestEmail(
  targetEmail: string,
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message: string }> {
  const config = resolveEmailConfig(settings);

  if (!targetEmail || !targetEmail.includes("@")) {
    return { success: false, message: "Please enter a valid email address." };
  }

  try {
    const testItems = "1. Premium Denim Jacket × 1 — ₹2,499\n2. Classic Cotton Tee × 2 — ₹998";
    const testSummary = `Thank you, Test Customer!\n\nOrder ID: #TEST-001\nOrder Date: ${new Date().toLocaleDateString("en-IN")}\n\nItems Ordered:\n${testItems}\n\nSubtotal: ₹3,497\nShipping: Free\nTotal Amount: ₹3,497\n\nDelivery Address:\n123 Test Street, Mumbai, Maharashtra - 400001\n\nThank you for shopping with ${settings?.brandName || "Shop."}!`;

    const dummyParams = {
      to_email: targetEmail,
      email: targetEmail,
      user_email: targetEmail,
      customer_email: targetEmail,
      recipient_email: targetEmail,
      reply_to: targetEmail,
      to_name: "Test Customer",
      name: "Test Customer",
      customer_name: "Test Customer",
      username: "Test Customer",
      user_name: "Test Customer",
      from_name: settings?.brandName || "Shop.",
      greeting: "Thank you, Test Customer!",
      thank_you: "Thank you, Test Customer!",
      order_id: "#TEST-001",
      orderId: "#TEST-001",
      order_date: new Date().toLocaleDateString("en-IN"),
      items_list: testItems,
      items: testItems,
      itemsList: testItems,
      order_items: testItems,
      subtotal: "₹3,497",
      shipping: "Free",
      total: "₹3,497",
      order_total: "₹3,497",
      total_amount: "₹3,497",
      amount: "₹3,497",
      delivery_address: "123 Test Street, Mumbai, Maharashtra - 400001",
      brand_name: settings?.brandName || "Shop.",
      store_name: settings?.brandName || "Shop.",
      message: testSummary,
    };

    const res = await emailjs.send(
      config.serviceId,
      config.templateOrderPlaced,
      dummyParams,
      { publicKey: config.publicKey }
    );

    return {
      success: true,
      message: `EmailJS responded with Status ${res.status}: "${res.text}". Check ${targetEmail} (including Spam folder)!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.text || err?.message || "EmailJS failed to deliver the message. Check credentials.",
    };
  }
}

// ─── Send Test Email ──────────────────────────────────────────────────────────
export async function sendTestEmail(
  toEmail: string,
  templateType: "placed" | "delivered" | "cancelled" = "placed",
  settings?: Partial<SiteSettings>
): Promise<{ success: boolean; message?: string }> {
  const config = resolveEmailConfig(settings);
  const templateId =
    templateType === "placed"
      ? config.templateOrderPlaced
      : templateType === "delivered"
      ? config.templateOrderDelivered
      : config.templateOrderCancelled;

  if (!config.serviceId || !config.publicKey || !templateId) {
    return {
      success: false,
      message: "Please fill Service ID, Public Key, and the Template ID first.",
    };
  }

  try {
    const testItems = "1. Premium Denim Jacket × 1 — ₹2,499\n2. Classic Cotton Tee × 2 — ₹998";
    const testSummary = `Hello Test Customer,\n\nTest notification from ${settings?.brandName || "Shop."}!\n\nItems:\n${testItems}\n\nTotal: ₹3,497\n\nDelivery Address:\n123 Test Street, Mumbai, Maharashtra - 400001`;

    const dummyParams = {
      to_email: toEmail,
      email: toEmail,
      to_name: "Test Customer",
      name: "Test Customer",
      customer_name: "Test Customer",
      username: "Test Customer",
      user_name: "Test Customer",
      from_name: settings?.brandName || "Shop.",
      greeting: "Hello Test Customer,",
      thank_you: "Thank you, Test Customer!",
      order_id: "TEST-ORDER-123",
      orderId: "TEST-ORDER-123",
      order_date: new Date().toLocaleDateString("en-IN"),
      items_list: testItems,
      items: testItems,
      itemsList: testItems,
      order_items: testItems,
      subtotal: "₹3,497",
      shipping: "Free",
      total: "₹3,497",
      order_total: "₹3,497",
      total_amount: "₹3,497",
      amount: "₹3,497",
      delivery_address: "123 Test Street, Mumbai, Maharashtra - 400001",
      brand_name: settings?.brandName || "Shop.",
      store_name: settings?.brandName || "Shop.",
      message: testSummary,
    };

    const res = await emailjs.send(
      config.serviceId,
      templateId,
      dummyParams,
      { publicKey: config.publicKey }
    );

    return { success: true, message: `Email sent! Status: ${res.status}` };
  } catch (err: any) {
    return {
      success: false,
      message: err?.text || err?.message || "Could not deliver test email",
    };
  }
}
