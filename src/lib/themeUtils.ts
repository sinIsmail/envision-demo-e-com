/**
 * Dynamic theme utility to apply admin-selected brand colors
 * to CSS custom properties (--primary, --primary-foreground, --ring, etc.)
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const sanitized = hex.replace("#", "").trim();
  if (sanitized.length === 3) {
    const r = parseInt(sanitized[0] + sanitized[0], 16);
    const g = parseInt(sanitized[1] + sanitized[1], 16);
    const b = parseInt(sanitized[2] + sanitized[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (sanitized.length === 6) {
    const r = parseInt(sanitized.slice(0, 2), 16);
    const g = parseInt(sanitized.slice(2, 4), 16);
    const b = parseInt(sanitized.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
}

export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

export function getContrastForeground(hex: string): string {
  const luminance = getLuminance(hex);
  // If the color is light, return dark text; if dark, return white
  return luminance > 0.45 ? "#09090b" : "#ffffff";
}

export function applyThemeColor(primaryHex: string) {
  if (typeof document === "undefined") return;
  if (!primaryHex || !primaryHex.startsWith("#")) return;

  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const lum = getLuminance(primaryHex);

  // If brand color is pure black or near black (luminance < 0.08),
  // in dark mode it must adapt to high-contrast white so text & buttons don't disappear into darkness!
  let effectivePrimary = primaryHex;
  if (isDark && lum < 0.08) {
    effectivePrimary = "#ffffff";
  }

  const foreground = getContrastForeground(effectivePrimary);

  root.style.setProperty("--primary", effectivePrimary);
  root.style.setProperty("--primary-foreground", foreground);
  root.style.setProperty("--ring", effectivePrimary);
  root.style.setProperty("--sidebar-primary", effectivePrimary);
  root.style.setProperty("--sidebar-primary-foreground", foreground);
}

/**
 * Universal price formatter that guarantees support for floating-point prices (e.g. 1.12, 0.50)
 * If the value has decimals, it prints 2 decimal places (e.g. ₹1.12).
 * If the value is an integer, it prints cleanly without .00 (e.g. ₹100).
 */
export function formatPrice(
  amount: number | string | undefined | null,
  currency = "₹",
  locale = "en-IN"
): string {
  const clean = typeof amount === "string" ? amount.replace(/,/g, ".").trim() : amount;
  const num = Number(clean) || 0;
  const hasDecimals = Math.abs(num % 1) > 0.0001;

  // Split into integer part and 2-digit fraction part
  const [intStr, decStr] = num.toFixed(hasDecimals ? 2 : 0).split(".");
  // Use locale for integer grouping so thousands use standard formatting
  const intFormatted = Number(intStr).toLocaleString(locale || "en-IN");

  // Guaranteed to join with '.', NEVER ','
  const finalPrice = decStr ? `${intFormatted}.${decStr}` : intFormatted;
  return `${currency}${finalPrice}`;
}
