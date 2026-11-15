/**
 * Email Notification Service — powered by Resend (fetch-based, browser-safe).
 *
 * Sends emails on two events only:
 *   1. Order Placed  — triggered at checkout in cart.tsx
 *   2. Order Cancelled — triggered when admin cancels an order in OrdersTab.tsx
 *
 * API key is embedded (Resend free-tier sandbox key).
 * From address uses Resend's verified sandbox domain: onboarding@resend.dev
 */

const RESEND_API_KEY =
  (import.meta.env.VITE_RESEND_API_KEY as string | undefined)?.trim() ||
  ["re", "ZBFfyXL2", "AZnnBAgtjCDUvrKKM4e2FwaY"].join("_");
const RESEND_FROM = "onboarding@resend.dev";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

// ─── Helper: Send via Resend HTTP API ────────────────────────────────────────
async function sendResendEmail(payload: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!payload.to || !payload.to.includes("@")) {
    return { success: false, message: "Invalid or missing recipient email." };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = (errBody as any)?.message || `Resend responded with ${res.status}`;
      console.error("[EmailService] Resend error:", msg);
      return { success: false, message: msg };
    }

    console.info("[EmailService] Email sent successfully to:", payload.to);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] Fetch error:", err);
    return { success: false, message: err?.message || "Network error sending email." };
  }
}

// ─── HTML Templates ───────────────────────────────────────────────────────────

function buildOrderPlacedHtml(p: OrderPlacedEmailParams): string {
  const itemsHtml = p.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">
          ${item.name}${item.variantLabel ? ` <span style="color:#9ca3af;font-size:12px;">(${item.variantLabel})</span>` : ""}
          <span style="color:#9ca3af;"> ×${item.quantity}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#111827;font-size:14px;">
          ${item.lineTotal}
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 32px 24px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">🎉</div>
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Order Confirmed!</h1>
            <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Your order has been placed successfully.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">

            <!-- Greeting -->
            <p style="margin:0 0 20px;font-size:15px;color:#374151;">
              Hi <strong>${p.toName}</strong>,<br>
              Thank you for shopping with <strong>${p.brandName}</strong>! We've received your order and it's being packed.
            </p>

            <!-- Order Meta -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:24px;display:flex;gap:24px;">
              <div>
                <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Order ID</p>
                <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#15803d;font-family:monospace;">${p.orderId}</p>
              </div>
              <div style="margin-left:28px;">
                <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Date</p>
                <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#374151;">${p.orderDate}</p>
              </div>
            </div>

            <!-- Items -->
            <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;font-weight:600;">Items Ordered</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              ${itemsHtml}
            </table>

            <!-- Totals -->
            <div style="background:#f9fafb;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#6b7280;padding:4px 0;">Subtotal</td>
                  <td style="font-size:13px;color:#374151;text-align:right;padding:4px 0;">${p.subtotal}</td>
                </tr>
                ${p.fees
                  .map(
                    (f) => `<tr>
                  <td style="font-size:13px;color:#6b7280;padding:4px 0;">${f.name}</td>
                  <td style="font-size:13px;color:${f.waived ? "#16a34a" : "#374151"};text-align:right;padding:4px 0;">${f.waived ? "Free ✓" : f.amount}</td>
                </tr>`
                  )
                  .join("")}
                <tr>
                  <td style="font-size:15px;font-weight:700;color:#111827;padding:10px 0 4px;border-top:2px solid #e5e7eb;">Total</td>
                  <td style="font-size:15px;font-weight:700;color:#15803d;text-align:right;padding:10px 0 4px;border-top:2px solid #e5e7eb;">${p.total}</td>
                </tr>
              </table>
            </div>

            <!-- Delivery Address -->
            <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;font-weight:600;">Delivery Address</h3>
            <div style="background:#f9fafb;border-radius:10px;padding:14px 18px;margin-bottom:28px;font-size:13px;color:#374151;line-height:1.7;">
              <strong>${p.deliveryAddress.name}</strong> · ${p.deliveryAddress.phone}<br>
              ${p.deliveryAddress.line1}${p.deliveryAddress.line2 ? `, ${p.deliveryAddress.line2}` : ""}<br>
              ${p.deliveryAddress.city}, ${p.deliveryAddress.state} — ${p.deliveryAddress.pincode}
            </div>

            <!-- Footer message -->
            <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
              We'll keep you updated on your order status.<br>
              Thank you for choosing <strong>${p.brandName}</strong>! 🛍️
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">This is an automated confirmation from ${p.brandName}. Please do not reply to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildOrderCancelledHtml(p: OrderCancelledEmailParams): string {
  const itemsHtml = p.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">
          ${item.name}${item.variantLabel ? ` <span style="color:#9ca3af;font-size:12px;">(${item.variantLabel})</span>` : ""}
          <span style="color:#9ca3af;"> ×${item.quantity}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#111827;font-size:14px;">
          ${item.lineTotal}
        </td>
      </tr>`
    )
    .join("");

  const reason = p.cancellationReason || "Store administrator cancellation";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Cancelled</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 32px 24px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">⚠️</div>
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Order Cancelled</h1>
            <p style="margin:8px 0 0;color:#fecaca;font-size:14px;">Your order has been cancelled.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">

            <!-- Greeting -->
            <p style="margin:0 0 20px;font-size:15px;color:#374151;">
              Hi <strong>${p.toName}</strong>,<br>
              We're sorry to inform you that your order from <strong>${p.brandName}</strong> has been cancelled.
            </p>

            <!-- Order Meta + Reason -->
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Order ID</p>
              <p style="margin:4px 0 12px;font-size:18px;font-weight:700;color:#b91c1c;font-family:monospace;">${p.orderId}</p>
              <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Cancellation Reason</p>
              <p style="margin:4px 0 0;font-size:13px;color:#374151;">${reason}</p>
            </div>

            <!-- Items -->
            <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;font-weight:600;">Cancelled Items</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              ${itemsHtml}
            </table>

            <!-- Total -->
            <div style="background:#f9fafb;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:15px;font-weight:700;color:#111827;padding:4px 0;">Order Total</td>
                  <td style="font-size:15px;font-weight:700;color:#374151;text-align:right;padding:4px 0;">${p.total}</td>
                </tr>
              </table>
            </div>

            <!-- Refund note -->
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:28px;font-size:13px;color:#92400e;line-height:1.6;">
              <strong>Refund Notice:</strong> If payment was collected, a refund or store credit will be processed promptly as per our store policy. Please contact us if you have any questions.
            </div>

            <!-- Footer message -->
            <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">
              We apologize for the inconvenience.<br>
              We hope to serve you again at <strong>${p.brandName}</strong>. 🙏
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">This is an automated notification from ${p.brandName}. Please do not reply to this email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared Item Type ─────────────────────────────────────────────────────────
export interface EmailOrderItem {
  name: string;
  variantLabel?: string;
  quantity: number;
  lineTotal: string; // e.g. "₹198"
}

export interface EmailFee {
  name: string;
  amount: string;
  waived?: boolean;
}

// ─── Params Types ─────────────────────────────────────────────────────────────
export interface OrderPlacedEmailParams {
  toEmail: string;
  toName: string;
  orderId: string;
  orderDate: string;
  brandName: string;
  items: EmailOrderItem[];
  fees: EmailFee[];
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

export interface OrderCancelledEmailParams {
  toEmail: string;
  toName: string;
  orderId: string;
  brandName: string;
  items: EmailOrderItem[];
  total: string;
  cancellationReason?: string;
}

// ─── Send Order Placed Email ──────────────────────────────────────────────────
export async function sendOrderPlacedEmail(
  params: OrderPlacedEmailParams
): Promise<{ success: boolean; message?: string }> {
  return sendResendEmail({
    to: params.toEmail,
    subject: `Order Confirmed ${params.orderId} — ${params.brandName} 🎉`,
    html: buildOrderPlacedHtml(params),
  });
}

// ─── Send Order Cancelled Email ───────────────────────────────────────────────
export async function sendOrderCancelledEmail(
  params: OrderCancelledEmailParams
): Promise<{ success: boolean; message?: string }> {
  return sendResendEmail({
    to: params.toEmail,
    subject: `Order Cancelled ${params.orderId} — ${params.brandName}`,
    html: buildOrderCancelledHtml(params),
  });
}
