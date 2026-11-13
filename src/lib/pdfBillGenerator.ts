import { type Order, effectiveStatus, STATUS_LABELS, formatOrderId } from "@/types/order";
import { type SiteSettings } from "@/types/siteSettings";
import { formatPrice } from "@/lib/themeUtils";

/**
 * Returns the full standalone HTML for the order bill / invoice.
 */
export function generateInvoiceHtml(order: Order, settings: SiteSettings): string {
  const currency = settings.currency || "₹";
  const brandName = settings.brandName || "Shop.";
  const chargeLabel = settings.deliveryChargeLabel || "Delivery";
  const orderIdDisplay = formatOrderId(order);
  const dateObj = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const dateStr = dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const addr = order.deliveryAddress;
  const customerName = order.userName || addr?.name || "Customer";
  const customerPhone = addr?.phone || "—";
  const fullAddress = addr
    ? [addr.line1, addr.line2, addr.city, addr.state, addr.pincode]
        .filter(Boolean)
        .join(", ")
    : "—";

  const items = order.items && order.items.length > 0 ? order.items : [];
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const subtotal = Number(order.subtotal ?? 0);
  const shipping = Number(order.shipping ?? 0);
  const grandTotal = Number(order.total ?? 0);
  const statusLabel = STATUS_LABELS[effectiveStatus(order)] || "Order Placed";

  const rowsHtml = items
    .map((it, idx) => {
      const itemTotal = Number(it.price || 0) * Number(it.quantity || 1);
      return `
        <tr>
          <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
          <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #111827;">${it.name}</div>
            ${it.variantLabel ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Size / Unit: ${it.variantLabel}</div>` : ""}
          </td>
          <td style="text-align: center; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${it.quantity}</td>
          <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">${formatPrice(it.price, currency, "en-IN")}</td>
          <td style="text-align: right; padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-weight: 700; color: #111827;">${formatPrice(itemTotal, currency, "en-IN")}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${orderIdDisplay} - ${brandName}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-container {
      max-width: 780px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 32px;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111827;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.5px;
      margin: 0 0 4px 0;
    }
    .invoice-badge {
      display: inline-block;
      background: #111827;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .meta-box {
      text-align: right;
      font-size: 12px;
    }
    .meta-box strong {
      color: #111827;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .party-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .party-name {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 2px;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    table.items-table th {
      background: #f3f4f6;
      color: #374151;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 8px;
      border-top: 1px solid #d1d5db;
      border-bottom: 2px solid #9ca3af;
    }
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .summary-table {
      width: 320px;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 6px 10px;
      font-size: 13px;
    }
    .summary-table tr.grand-total {
      background: #f3f4f6;
      border-top: 2px solid #111827;
      border-bottom: 2px solid #111827;
      font-size: 16px;
      font-weight: 800;
      color: #111827;
    }
    .footer {
      border-top: 1px dashed #d1d5db;
      padding-top: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .barcode {
      font-family: monospace;
      font-size: 16px;
      letter-spacing: 4px;
      margin-top: 8px;
      font-weight: bold;
      color: #374151;
    }
    .action-bar {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn-print {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }
    @media print {
      body {
        padding: 0;
      }
      .action-bar {
        display: none !important;
      }
      .invoice-container {
        border: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <button class="btn-print" onclick="window.print()">🖨️ Download as PDF / Print</button>
  </div>

  <div class="invoice-container">
    <div class="header">
      <div>
        <h1 class="brand-title">${brandName}</h1>
        <div class="invoice-badge">Retail Bill / Cash Memo</div>
        <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 12px;">Official Tax Invoice & Delivery Bill</p>
      </div>
      <div class="meta-box">
        <p style="margin: 0 0 4px 0;"><strong>Invoice #:</strong> ${orderIdDisplay}</p>
        <p style="margin: 0 0 4px 0;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin: 0 0 4px 0;"><strong>Time:</strong> ${timeStr}</p>
        <p style="margin: 0 0 4px 0;"><strong>Status:</strong> <span style="font-weight: 700; color: #059669;">${statusLabel}</span></p>
      </div>
    </div>

    <div class="parties-grid">
      <div>
        <div class="party-title">Billed / Delivered To:</div>
        <div class="party-name">${customerName}</div>
        <div style="color: #4b5563; font-size: 12px; line-height: 1.5;">${fullAddress}</div>
        <div style="color: #2563eb; font-weight: 600; font-size: 12px; margin-top: 4px;">Phone: ${customerPhone}</div>
      </div>
      <div style="text-align: right;">
        <div class="party-title">Dispatched & Fulfilled By:</div>
        <div class="party-name">${brandName}</div>
        <div style="color: #4b5563; font-size: 12px; line-height: 1.5;">Main Fulfillment Center</div>
        <div style="color: #059669; font-weight: 600; font-size: 12px; margin-top: 4px;">Verified Direct Merchant</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>Item Description</th>
          <th style="width: 60px; text-align: center;">Qty</th>
          <th style="width: 100px; text-align: right;">Unit Price</th>
          <th style="width: 110px; text-align: right;">Item Total</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="summary-section">
      <table class="summary-table">
        <tr>
          <td style="color: #6b7280;">Total Units:</td>
          <td style="text-align: right; font-weight: 600;">${totalUnits}</td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">${formatPrice(subtotal, currency, "en-IN")}</td>
        </tr>
        ${
          order.billingFees && order.billingFees.length > 0
            ? order.billingFees
                .map(
                  (f) => `
        <tr>
          <td style="color: #6b7280;">${f.name}:</td>
          <td style="text-align: right; font-weight: 600;">${f.waived ? "FREE" : formatPrice(f.amount, currency, "en-IN")}</td>
        </tr>`
                )
                .join("")
            : `
        <tr>
          <td style="color: #6b7280;">${chargeLabel}:</td>
          <td style="text-align: right; font-weight: 600;">${shipping === 0 ? "FREE" : formatPrice(shipping, currency, "en-IN")}</td>
        </tr>`
        }
        <tr class="grand-total">
          <td style="padding: 12px 10px;">Grand Total:</td>
          <td style="padding: 12px 10px; text-align: right;">${formatPrice(grandTotal, currency, "en-IN")}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #374151;">Thank you for your business!</p>
      <p style="margin: 0; font-size: 11px;">This is a computer-generated receipt for your delivery. Please keep it for your records.</p>
      <div class="barcode">||| | ||||| || |||| ||||| ||| ||</div>
      <p style="margin: 4px 0 0 0; font-size: 10px; color: #9ca3af;">*${order.id}*</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
  `;
}

/**
 * Generates and triggers the download / Save as PDF for an order bill.
 * Styled in a high-end mall / retail cash invoice format.
 */
export function downloadOrderBill(order: Order, settings: SiteSettings) {
  const billHtml = generateInvoiceHtml(order, settings);

  // Open the print / PDF window
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(billHtml);
    printWindow.document.close();
  } else {
    // If popup was blocked by browser, trigger in hidden iframe fallback
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(billHtml);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
  }
}
