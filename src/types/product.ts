export type UnitType = "g" | "ml" | "kg" | "L";

export interface UnitVariant {
  label: string;  // e.g. "250g", "500ml", "1L"
  price: number;  // absolute price for this variant
  stock: number;  // per-variant inventory count
  enabled?: boolean; // When false, variant is disabled by admin and shown as Out of Stock (default true)
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  images: string[];
  image: string; // backward compat — always images[0]
  category?: string;
  avgRating: number;
  reviewCount: number;
  createdAt?: any;
  // Unit/weight variant fields (optional — undefined means "sold as single item")
  hasVariants?: boolean;
  unitType?: UnitType;
  unitVariants?: UnitVariant[];
  preferMaxVariant?: boolean; // When true: automatically select the maximum variant by default & turn off lower quantities
}

export function parseVariantAmount(label: string): number {
  const clean = (label || "").trim().toLowerCase();
  const kgMatch = clean.match(/^([\d.]+)\s*kg$/);
  if (kgMatch) return parseFloat(kgMatch[1]) * 1000;
  const gMatch = clean.match(/^([\d.]+)\s*g$/);
  if (gMatch) return parseFloat(gMatch[1]);
  const lMatch = clean.match(/^([\d.]+)\s*l$/);
  if (lMatch) return parseFloat(lMatch[1]) * 1000;
  const mlMatch = clean.match(/^([\d.]+)\s*ml$/);
  if (mlMatch) return parseFloat(mlMatch[1]);
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function getMaxVariant(variants: UnitVariant[], onlyAvailable = false): UnitVariant | null {
  if (!variants || variants.length === 0) return null;
  const filtered = onlyAvailable
    ? variants.filter((v) => v.enabled !== false && (v.stock ?? 0) > 0)
    : variants;
  const pool = filtered.length > 0 ? filtered : variants;
  const sorted = [...pool].sort((a, b) => {
    const diff = parseVariantAmount(b.label) - parseVariantAmount(a.label);
    if (diff !== 0) return diff;
    return (b.price ?? 0) - (a.price ?? 0);
  });
  return sorted[0];
}
