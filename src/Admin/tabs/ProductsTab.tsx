import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import {
  collection,
  addDoc,
  getCountFromServer,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/fb";
import { toast } from "@/components/ui/toast";
import {
  Pencil,
  Trash2,
  Star,
  Plus,
  X,
  Scale,
  Package,
  Search,
  Copy,
  Check,
  Images,
  RefreshCw,
} from "lucide-react";
import type { Product, UnitType, UnitVariant } from "@/types/product";

const UNIT_OPTIONS: { value: UnitType; label: string }[] = [
  { value: "g", label: "Grams (g) - Solid / Weight" },
  { value: "L", label: "Litres (L) - Liquid / Volume" },
];

function getVariantDisplayNumber(label: string, unitType: UnitType): string {
  if (!label) return "";
  const trimmed = label.trim();
  const unitRegex = new RegExp(`\\s*${unitType}$`, "i");
  if (unitRegex.test(trimmed)) {
    return trimmed.replace(unitRegex, "").trim();
  }
  const match = trimmed.match(/^([\d.]+)/);
  if (match) return match[1];
  return trimmed.replace(/[^\d.]/g, "");
}

export function parsePrice(val: any): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const sanitized = String(val).replace(/,/g, ".").trim();
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

const EMPTY_FORM = {
  proName: "",
  proPrice: "",
  proStock: "",
  proDescription: "",
  proCategory: "",
};

// ─── Variant Builder ─────────────────────────────────────────────────────────
function VariantBuilder({
  unitType,
  variants,
  onChange,
}: {
  unitType: UnitType;
  variants: UnitVariant[];
  onChange: (v: UnitVariant[]) => void;
}) {
  const addRow = () =>
    onChange([...variants, { label: "", price: 0, stock: 0, enabled: true }]);
  const removeRow = (i: number) =>
    onChange(variants.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof UnitVariant, val: any) => {
    const updated = variants.map((v, idx) =>
      idx === i
        ? {
            ...v,
            [field]: field === "enabled" ? Boolean(val) : val,
          }
        : v
    );
    onChange(updated as any);
  };

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs sm:text-sm font-semibold text-foreground">
            Variants & Sizes ({unitType})
          </Label>
          <p className="text-[11px] text-muted-foreground">
            Configure sizes, custom prices, and inventory
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="gap-1.5 h-8 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5 text-primary" />
          Add Option
        </Button>
      </div>

      {variants.length === 0 && (
        <div className="text-center py-5 px-4 rounded-xl border border-dashed border-border/80 bg-background/50">
          <p className="text-xs text-muted-foreground">
            No size variants added yet. Click &quot;Add Option&quot; above to create sizes like 250{unitType}, 500{unitType}, 1000{unitType}.
          </p>
        </div>
      )}

      {/* ── MOBILE VIEW (<768px): Card-based layout with zero horizontal scroll ── */}
      <div className="space-y-3 md:hidden">
        {variants.map((v, i) => {
          const numValue = getVariantDisplayNumber(v.label, unitType);
          const isEnabled = v.enabled !== false;

          return (
            <div
              key={i}
              className="rounded-xl border border-border/80 bg-background p-3.5 space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {i + 1}
                  </span>
                  Size Option
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateRow(i, "enabled", !isEnabled)}
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${
                      isEnabled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isEnabled ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {isEnabled ? "Visible" : "Out of Stock"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Size / Weight */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Size / Quantity
                  </label>
                  <div className="flex h-10 w-full rounded-lg border border-border/80 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={unitType === "g" ? "500" : "1"}
                      value={numValue}
                      onChange={(e) => {
                        const num = e.target.value;
                        updateRow(i, "label", num ? `${num}${unitType}` : "");
                      }}
                      className="h-full flex-1 px-3 text-sm font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
                    />
                    <span className="h-full px-2.5 text-xs font-bold text-muted-foreground bg-muted/60 border-l border-border/70 flex items-center shrink-0">
                      {unitType}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Price (₹)
                  </label>
                  <div className="flex h-10 w-full rounded-lg border border-border/80 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                    <span className="h-full px-2.5 text-xs font-bold text-muted-foreground bg-muted/60 border-r border-border/70 flex items-center shrink-0">
                      ₹
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={v.price === 0 && !numValue ? "" : (v.price ?? "")}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
                        updateRow(i, "price", clean);
                      }}
                      className="h-full flex-1 px-3 text-sm font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
                    />
                  </div>
                </div>

                {/* Stock */}
                <div className="col-span-2">
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Stock Quantity (Units)
                  </label>
                  <div className="flex h-10 w-full rounded-lg border border-border/80 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                    <span className="h-full px-2.5 text-xs text-muted-foreground bg-muted/60 border-r border-border/70 flex items-center gap-1 shrink-0">
                      <Package className="h-3.5 w-3.5" />
                      Units
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50"
                      value={v.stock === 0 && !numValue ? "" : v.stock || ""}
                      onChange={(e) => updateRow(i, "stock", e.target.value)}
                      className="h-full flex-1 px-3 text-sm font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP VIEW (>=768px): Spacious inline grid ── */}
      {variants.length > 0 && (
        <div className="hidden md:block space-y-2">
          <div className="grid grid-cols-[1.5fr_1.1fr_1.1fr_130px_36px] gap-2.5 px-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Size / Quantity ({unitType})</span>
            <span>Price (₹)</span>
            <span>Stock Qty</span>
            <span className="text-center">Status</span>
            <span />
          </div>

          <div className="space-y-2">
            {variants.map((v, i) => {
              const numValue = getVariantDisplayNumber(v.label, unitType);
              const isEnabled = v.enabled !== false;

              return (
                <div
                  key={i}
                  className="grid grid-cols-[1.5fr_1.1fr_1.1fr_130px_36px] items-center gap-2.5 p-2 rounded-xl border border-border/70 bg-background/80 hover:border-border transition-colors"
                >
                  {/* Quantity Amount + Suffix */}
                  <div className="flex h-10 w-full rounded-lg border border-border/80 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={unitType === "g" ? "e.g. 500" : "e.g. 1"}
                      value={numValue}
                      onChange={(e) => {
                        const num = e.target.value;
                        updateRow(i, "label", num ? `${num}${unitType}` : "");
                      }}
                      className="h-full flex-1 px-3 text-sm font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
                    />
                    <span className="h-full px-3 text-xs font-bold text-muted-foreground bg-muted/60 border-l border-border/70 flex items-center shrink-0 select-none">
                      {unitType}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex h-10 w-full rounded-lg border border-border/80 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                    <span className="h-full px-2.5 text-xs font-bold text-muted-foreground bg-muted/60 border-r border-border/70 flex items-center shrink-0 select-none">
                      ₹
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Price"
                      value={v.price === 0 && !numValue ? "" : (v.price ?? "")}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
                        updateRow(i, "price", clean);
                      }}
                      className="h-full flex-1 px-3 text-sm font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
                    />
                  </div>

                  {/* Stock */}
                  <div className="flex h-10 w-full rounded-lg border border-border/80 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                    <span className="h-full px-2.5 text-xs text-muted-foreground bg-muted/60 border-r border-border/70 flex items-center gap-1 shrink-0 select-none">
                      <Package className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={v.stock === 0 && !numValue ? "" : v.stock || ""}
                      onChange={(e) => updateRow(i, "stock", e.target.value)}
                      className="h-full flex-1 px-3 text-sm font-semibold bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0 font-mono"
                    />
                  </div>

                  {/* Status Toggle */}
                  <button
                    type="button"
                    onClick={() => updateRow(i, "enabled", !isEnabled)}
                    className={`h-10 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-2.5 rounded-lg border transition-all ${
                      isEnabled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 shadow-2xs"
                        : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
                    }`}
                    title={isEnabled ? "Visible to customers" : "Marked as Out of Stock"}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isEnabled ? "bg-emerald-500" : "bg-rose-500"}`} />
                    {isEnabled ? "Visible" : "Out of Stock"}
                  </button>

                  {/* Desktop Remove Button */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Remove variant"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Unit Section Toggle ──────────────────────────────────────────────────────
function UnitSection({
  hasVariants,
  unitType,
  variants,
  onToggle,
  onUnitType,
  onVariants,
}: {
  hasVariants: boolean;
  unitType: UnitType;
  variants: UnitVariant[];
  onToggle: (v: boolean) => void;
  onUnitType: (v: UnitType) => void;
  onVariants: (v: UnitVariant[]) => void;
}) {
  const handleToggle = () => {
    const next = !hasVariants;
    onToggle(next);
    if (next && variants.length === 0) {
      onVariants([{ label: "", price: 0, stock: 0, enabled: true }]);
    }
  };

  const handleUnitChange = (newType: UnitType) => {
    onUnitType(newType);
    // Update labels to match new unit suffix
    const updated = variants.map((v) => {
      const num = getVariantDisplayNumber(v.label, unitType);
      return num ? { ...v, label: `${num}${newType}` } : v;
    });
    onVariants(updated);
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label
            className="flex items-center gap-2 font-bold cursor-pointer text-sm sm:text-base text-foreground"
            onClick={handleToggle}
          >
            <Scale className="h-4 w-4 text-primary" />
            Sell by Weight / Volume (Variants)
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Offer multiple sizes (e.g. 250g, 500g, 1kg or 500mL, 1L) with custom pricing
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
            hasVariants ? "bg-primary" : "bg-muted-foreground/30"
          }`}
          role="switch"
          aria-checked={hasVariants}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              hasVariants ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {hasVariants && (
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-background border border-border/70">
            <div>
              <span className="text-xs font-semibold text-foreground block">Measurement Unit</span>
              <span className="text-[11px] text-muted-foreground">Select unit for this product</span>
            </div>
            <div className="flex items-center gap-2">
              {UNIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleUnitChange(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    unitType === opt.value
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted hover:bg-muted/80 text-foreground border border-border/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <VariantBuilder
            unitType={unitType}
            variants={variants}
            onChange={onVariants}
          />
        </div>
      )}
    </div>
  );
}

function totalVariantStock(variants: UnitVariant[]): number {
  return variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
}

// ─── Main ProductsTab Component ───────────────────────────────────────────────
export function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Product Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addImages, setAddImages] = useState<string[]>([]);
  const [addHasVariants, setAddHasVariants] = useState(false);
  const [addUnitType, setAddUnitType] = useState<UnitType>("g");
  const [addUnitVariants, setAddUnitVariants] = useState<UnitVariant[]>([]);
  const [addingLoading, setAddingLoading] = useState(false);

  // Edit Product Modal
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editHasVariants, setEditHasVariants] = useState(false);
  const [editUnitType, setEditUnitType] = useState<UnitType>("g");
  const [editUnitVariants, setEditUnitVariants] = useState<UnitVariant[]>([]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "products"));
      setProducts(snap.docs.map((d) => ({ ...(d.data() as Product), id: d.id })));
    } catch (err) {
      console.error(err);
      toast.add({ title: "Error", description: "Failed to load products." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  // Filtered products (by Name, Product ID, and Category)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesQuery =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      if (!matchesQuery) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter]);

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.add({ title: "Product ID Copied", description: id });
  };

  // ── Validation helper ──────────────────────────────────────────────────────
  function validateVariants(variants: any[]): string | null {
    if (variants.length === 0) return "Add at least one size variant (e.g. 250g).";
    for (const v of variants) {
      if (!v.label.trim()) return "Each variant must have a size/volume label.";
      const priceNum = parsePrice(v.price);
      if (priceNum <= 0) return `Variant "${v.label}" must have a valid price > 0.`;
      const stockNum = Number(v.stock);
      if (isNaN(stockNum) || stockNum < 0) return `Variant "${v.label}" stock cannot be negative.`;
    }
    return null;
  }

  // ── Add Product Handler ────────────────────────────────────────────────────
  const addProductHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addImages.length === 0) {
      toast.add({
        title: "Photos Required",
        description: "Please upload at least one product photo.",
      });
      return;
    }
    if (addHasVariants) {
      const err = validateVariants(addUnitVariants);
      if (err) {
        toast.add({ title: "Invalid variants", description: err });
        return;
      }
    }
    try {
      setAddingLoading(true);
      const productCollection = collection(db, "products");
      const snapshot = await getCountFromServer(productCollection);
      const generatedId = String(snapshot.data().count + 1).padStart(2, "0");

      const stockValue = addHasVariants
        ? totalVariantStock(addUnitVariants)
        : Number(addForm.proStock);

      await addDoc(productCollection, {
        id: generatedId,
        name: addForm.proName,
        price: parsePrice(addForm.proPrice),
        stock: stockValue,
        description: addForm.proDescription,
        category: addForm.proCategory,
        images: addImages,
        image: addImages[0],
        avgRating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
        hasVariants: addHasVariants,
        ...(addHasVariants && {
          unitType: addUnitType,
          unitVariants: addUnitVariants.map((v) => ({
            label: v.label.trim(),
            price: parsePrice(v.price),
            stock: Number(v.stock),
            enabled: v.enabled !== false,
          })),
        }),
      });

      setAddForm(EMPTY_FORM);
      setAddImages([]);
      setAddHasVariants(false);
      setAddUnitType("g");
      setAddUnitVariants([]);
      setIsAddOpen(false);

      toast.add({
        title: "Product Added ✓",
        description: `${addForm.proName} has been published to catalog.`,
      });
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.add({ title: "Upload failed", description: "Something went wrong." });
    } finally {
      setAddingLoading(false);
    }
  };

  // ── Open Edit Modal ────────────────────────────────────────────────────────
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({
      proName: p.name,
      proPrice: String(p.price),
      proStock: String(p.hasVariants ? totalVariantStock(p.unitVariants ?? []) : p.stock),
      proDescription: p.description,
      proCategory: p.category ?? "",
    });
    setEditImages(p.images?.length ? p.images : p.image ? [p.image] : []);
    setEditHasVariants(p.hasVariants ?? false);
    setEditUnitType(p.unitType ?? "g");
    setEditUnitVariants(
      (p.unitVariants ?? []).map((v) => ({
        ...v,
        stock: v.stock ?? 0,
        enabled: v.enabled !== false,
      }))
    );
  };

  // ── Save Edit Handler ──────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editProduct) return;
    if (editImages.length === 0) {
      toast.add({ title: "Photo required", description: "Product must have at least one image." });
      return;
    }
    if (editHasVariants) {
      const err = validateVariants(editUnitVariants);
      if (err) {
        toast.add({ title: "Invalid variants", description: err });
        return;
      }
    }
    try {
      setEditSaving(true);
      const stockValue = editHasVariants
        ? totalVariantStock(editUnitVariants)
        : Number(editForm.proStock);

      await updateDoc(doc(db, "products", editProduct.id), {
        name: editForm.proName,
        price: parsePrice(editForm.proPrice),
        stock: stockValue,
        description: editForm.proDescription,
        category: editForm.proCategory,
        images: editImages,
        image: editImages[0], // primary featured image
        hasVariants: editHasVariants,
        unitType: editHasVariants ? editUnitType : null,
        unitVariants: editHasVariants
          ? editUnitVariants.map((v) => ({
              label: v.label.trim(),
              price: parsePrice(v.price),
              stock: Number(v.stock),
              enabled: v.enabled !== false,
            }))
          : [],
      });

      toast.add({
        title: "Product Updated ✓",
        description: `${editForm.proName} changes & photos saved.`,
      });
      setEditProduct(null);
      fetchProducts();
    } catch {
      toast.add({ title: "Update failed", description: "Could not save changes." });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete Product ─────────────────────────────────────────────────────────
  const deleteProduct = async (docId: string) => {
    if (!confirm("Are you sure you want to permanently delete this product?")) return;
    try {
      setDeleting(docId);
      await deleteDoc(doc(db, "products", docId));
      setProducts((prev) => prev.filter((p) => p.id !== docId));
      toast.add({ title: "Deleted", description: "Product removed from store." });
    } catch {
      toast.add({ title: "Delete failed", description: "Could not delete product." });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Images className="h-6 w-6 text-primary" />
                Products & Catalog Management
              </CardTitle>
              <CardDescription>
                {products.length} product(s) in catalog · Search, manage photos, and update details.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProducts}
                disabled={loading}
                className="text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="text-xs flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add New Product
              </Button>
            </div>
          </div>

          {/* Search bar & Category filter */}
          <div className="pt-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by Name, ID, or Category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("all")}
                className="text-xs h-9 shrink-0"
              >
                All Categories
              </Button>
              {categories.map((c) => (
                <Button
                  key={c}
                  variant={categoryFilter === c ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(c)}
                  className="text-xs h-9 shrink-0"
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Package className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold">No products found</p>
              <p className="text-xs text-muted-foreground">
                {search ? `No products matching "${search}".` : "No products available."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-3">Product & Photos</th>
                      <th className="pb-3 pr-3">Product ID</th>
                      <th className="pb-3 pr-3">Category</th>
                      <th className="pb-3 pr-3">Base Price</th>
                      <th className="pb-3 pr-3">Stock Level</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProducts.map((p) => {
                      const mainImg = p.images?.[0] ?? p.image;
                      const extraCount = (p.images?.length ?? 1) - 1;
                      const totalStock = p.hasVariants
                        ? totalVariantStock(p.unitVariants ?? [])
                        : Number(p.stock) || 0;

                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          {/* Image & Name */}
                          <td className="py-3.5 pr-3 max-w-[280px]">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                {mainImg ? (
                                  <img
                                    src={mainImg}
                                    alt={p.name}
                                    className="h-12 w-12 rounded-lg object-cover border bg-muted"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                {extraCount > 0 && (
                                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow">
                                    +{extraCount}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    <span>{p.avgRating?.toFixed(1) ?? "0.0"} ({p.reviewCount ?? 0})</span>
                                  </div>
                                  {p.hasVariants && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1 font-medium">
                                      <Scale className="h-2.5 w-2.5 text-primary" />
                                      <span>{p.unitVariants?.length} options</span>
                                      <span className="text-muted-foreground">
                                        ({p.unitVariants?.filter((v) => v.enabled !== false).length} active)
                                      </span>
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Copyable Product ID */}
                          <td className="py-3.5 pr-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs bg-muted px-2 py-1 rounded select-all text-muted-foreground">
                                {p.id}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyId(p.id, e)}
                                className="text-muted-foreground hover:text-foreground p-1"
                                title="Copy ID"
                              >
                                {copiedId === p.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 pr-3">
                            {p.category ? (
                              <Badge variant="outline" className="text-xs">
                                {p.category}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Base Price */}
                          <td className="py-3.5 pr-3 font-semibold whitespace-nowrap">
                            ₹{Number(p.price || 0).toLocaleString("en-IN")}
                          </td>

                          {/* Stock Status */}
                          <td className="py-3.5 pr-3 whitespace-nowrap">
                            <Badge
                              variant={totalStock <= 0 ? "destructive" : totalStock < 5 ? "secondary" : "outline"}
                              className={`text-xs ${
                                totalStock <= 0
                                  ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                                  : totalStock < 5
                                  ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "border-green-300 text-green-700 dark:border-green-800 dark:text-green-400"
                              }`}
                            >
                              {totalStock <= 0
                                ? "Out of stock (0)"
                                : totalStock < 5
                                ? `Low stock: ${totalStock}`
                                : `${totalStock} units`}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(p)}
                                className="text-xs h-8 gap-1"
                              >
                                <Pencil className="h-3 w-3" /> Edit & Photos
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deleting === p.id}
                                onClick={() => deleteProduct(p.id)}
                                className="text-xs h-8 gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                {deleting === p.id ? "..." : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Cards View */}
              <div className="space-y-3 lg:hidden">
                {filteredProducts.map((p) => {
                  const mainImg = p.images?.[0] ?? p.image;
                  const extraCount = (p.images?.length ?? 1) - 1;
                  const totalStock = p.hasVariants
                    ? totalVariantStock(p.unitVariants ?? [])
                    : Number(p.stock) || 0;

                  return (
                    <div key={p.id} className="rounded-xl border bg-card p-3.5 space-y-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          {mainImg ? (
                            <img
                              src={mainImg}
                              alt={p.name}
                              className="h-14 w-14 rounded-lg object-cover border bg-muted"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          {extraCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow">
                              +{extraCount}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                            <span className="font-bold text-sm text-foreground shrink-0">
                              ₹{Number(p.price || 0).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 mt-1">
                            <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              ID: {p.id}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(p.id, e)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                            >
                              {copiedId === p.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                            {p.category && (
                              <Badge variant="outline" className="text-[10px] ml-1">
                                {p.category}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-1.5 flex items-center justify-between">
                            <Badge
                              variant={totalStock <= 0 ? "destructive" : totalStock < 5 ? "secondary" : "outline"}
                              className={`text-[10px] ${
                                totalStock <= 0
                                  ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                                  : totalStock < 5
                                  ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "border-green-300 text-green-700 dark:border-green-800 dark:text-green-400"
                              }`}
                            >
                              {totalStock <= 0
                                ? "Out of stock (0)"
                                : totalStock < 5
                                ? `Low: ${totalStock} left`
                                : `Stock: ${totalStock}`}
                            </Badge>

                            {p.hasVariants && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 gap-1 font-medium">
                                <Scale className="h-2.5 w-2.5 text-primary" />
                                <span>{p.unitVariants?.length} options</span>
                                <span className="text-muted-foreground">
                                  ({p.unitVariants?.filter((v) => v.enabled !== false).length} active)
                                </span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(p)}
                          className="text-xs h-8 flex-1"
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Edit & Photos
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleting === p.id}
                          onClick={() => deleteProduct(p.id)}
                          className="text-xs h-8 px-3"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── ADD PRODUCT MODAL ─────────────────────────────────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="w-[96vw] sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add New Product
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={addProductHandler} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Product Name *</Label>
              <Input
                id="add-name"
                placeholder="e.g. Organic Raw Honey"
                value={addForm.proName}
                onChange={(e) => setAddForm({ ...addForm, proName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="add-category">Category</Label>
                <Input
                  id="add-category"
                  placeholder="e.g. Grocery, Vegetables"
                  value={addForm.proCategory}
                  onChange={(e) => setAddForm({ ...addForm, proCategory: e.target.value })}
                />
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground self-center">Quick pick:</span>
                    {categories.slice(0, 5).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setAddForm((prev) => ({ ...prev, proCategory: cat }))}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                          addForm.proCategory.toLowerCase() === cat.toLowerCase()
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-price">Base Price (₹) *</Label>
                <Input
                  id="add-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="299.00"
                  value={addForm.proPrice}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      proPrice: e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, ""),
                    })
                  }
                  required
                />
              </div>
            </div>

            {!addHasVariants && (
              <div className="space-y-2">
                <Label htmlFor="add-stock">Initial Stock (units) *</Label>
                <Input
                  id="add-stock"
                  type="number"
                  min="0"
                  placeholder="100"
                  value={addForm.proStock}
                  onChange={(e) => setAddForm({ ...addForm, proStock: e.target.value })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="add-description">Description *</Label>
              <Textarea
                id="add-description"
                placeholder="Key features, ingredients, benefits..."
                rows={3}
                value={addForm.proDescription}
                onChange={(e) => setAddForm({ ...addForm, proDescription: e.target.value })}
                required
              />
            </div>

            {/* Variants Toggle */}
            <UnitSection
              hasVariants={addHasVariants}
              unitType={addUnitType}
              variants={addUnitVariants}
              onToggle={setAddHasVariants}
              onUnitType={setAddUnitType}
              onVariants={setAddUnitVariants}
            />

            {/* Multi Image Upload */}
            <MultiImageUpload images={addImages} onChange={setAddImages} />

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addingLoading || addImages.length === 0}>
                {addingLoading ? "Publishing Product..." : "Publish Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT PRODUCT & PHOTOS MODAL ───────────────────────────────────────── */}
      <Dialog
        open={Boolean(editProduct)}
        onOpenChange={(open) => {
          if (!open) setEditProduct(null);
        }}
      >
        <DialogContent className="w-[96vw] sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Product & Photos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={editForm.proName}
                onChange={(e) => setEditForm((p) => ({ ...p, proName: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={editForm.proCategory}
                  onChange={(e) => setEditForm((p) => ({ ...p, proCategory: e.target.value }))}
                />
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-muted-foreground self-center">Quick pick:</span>
                    {categories.slice(0, 5).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditForm((p) => ({ ...p, proCategory: cat }))}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                          editForm.proCategory.toLowerCase() === cat.toLowerCase()
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Base Price (₹)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={editForm.proPrice}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      proPrice: e.target.value.replace(/,/g, ".").replace(/[^0-9.]/g, ""),
                    }))
                  }
                />
              </div>
            </div>

            {!editHasVariants && (
              <div className="space-y-2">
                <Label>Stock (units)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.proStock}
                  onChange={(e) => setEditForm((p) => ({ ...p, proStock: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={editForm.proDescription}
                onChange={(e) => setEditForm((p) => ({ ...p, proDescription: e.target.value }))}
              />
            </div>

            {/* Variants Toggle */}
            <UnitSection
              hasVariants={editHasVariants}
              unitType={editUnitType}
              variants={editUnitVariants}
              onToggle={setEditHasVariants}
              onUnitType={setEditUnitType}
              onVariants={setEditUnitVariants}
            />

            {/* Photos & Gallery Manager */}
            <div className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Images className="h-3.5 w-3.5 text-primary" />
                  Product Photos Gallery
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Star any photo to make it Primary
                </span>
              </div>
              <MultiImageUpload images={editImages} onChange={setEditImages} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProduct(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={editSaving || editImages.length === 0}>
              {editSaving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
