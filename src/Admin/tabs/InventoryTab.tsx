import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase/fb";
import { toast } from "@/components/ui/toast";
import type { Product, UnitVariant } from "@/types/product";
import { getMaxVariant } from "@/types/product";
import {
  Search,
  Package,
  AlertTriangle,
  Check,
  Copy,
  Minus,
  RefreshCw,
  Scale,
  Sparkles,
} from "lucide-react";

type StockFilter = "all" | "low" | "out" | "in";

function getEffectiveStock(p: Product): number {
  if (p.hasVariants && p.unitVariants && p.unitVariants.length > 0) {
    return p.unitVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }
  return Number(p.stock) || 0;
}

export function InventoryTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Local editing states for quick inputs: { [productId]: number | string }
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  // Local variant inputs: { [`${productId}_${variantIdx}`]: string }
  const [variantInputs, setVariantInputs] = useState<Record<string, string>>({});

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "products"));
      const list = snap.docs.map((d) => ({
        ...(d.data() as Product),
        id: d.id,
      }));
      setProducts(list);
    } catch (err) {
      console.error(err);
      toast.add({ title: "Error", description: "Failed to load inventory." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter & Search Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const totalStock = getEffectiveStock(p);
      if (filter === "out") return totalStock <= 0;
      if (filter === "low") return totalStock > 0 && totalStock < 5;
      if (filter === "in") return totalStock >= 5;
      return true;
    });
  }, [products, search, filter]);

  // Copy Product ID
  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.add({ title: "Product ID Copied", description: id });
  };

  // ─── Simple Product Stock Update ───────────────────────────────────────────
  const handleUpdatePlainStock = async (p: Product, newStockValue: number) => {
    if (newStockValue < 0) return;
    try {
      setUpdatingId(p.id);
      await updateDoc(doc(db, "products", p.id), {
        stock: newStockValue,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, stock: newStockValue } : item
        )
      );

      // Clear custom input
      setStockInputs((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });

      toast.add({
        title: "Stock Updated ✓",
        description: `${p.name} stock set to ${newStockValue} units.`,
      });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Update failed", description: "Could not update stock." });
    } finally {
      setUpdatingId(null);
    }
  };

  // Quick increment for plain product
  const handleQuickAdd = async (p: Product, amount: number) => {
    const current = Number(p.stock) || 0;
    await handleUpdatePlainStock(p, current + amount);
  };

  // ─── Variant Product Stock Update ──────────────────────────────────────────
  const handleUpdateVariantStock = async (
    p: Product,
    variantIndex: number,
    newVariantStock: number
  ) => {
    if (newVariantStock < 0 || !p.unitVariants) return;
    try {
      setUpdatingId(`${p.id}_var_${variantIndex}`);
      const updatedVariants: UnitVariant[] = p.unitVariants.map((v, i) =>
        i === variantIndex ? { ...v, stock: newVariantStock } : v
      );
      const totalStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);

      await updateDoc(doc(db, "products", p.id), {
        unitVariants: updatedVariants,
        stock: totalStock,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id
            ? { ...item, unitVariants: updatedVariants, stock: totalStock }
            : item
        )
      );

      setVariantInputs((prev) => {
        const next = { ...prev };
        delete next[`${p.id}_${variantIndex}`];
        return next;
      });

      toast.add({
        title: "Variant Stock Updated ✓",
        description: `${p.name} (${p.unitVariants[variantIndex].label}) updated to ${newVariantStock}.`,
      });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Update failed", description: "Could not update variant stock." });
    } finally {
      setUpdatingId(null);
    }
  };

  // Quick increment for variant
  const handleQuickAddVariant = async (
    p: Product,
    variantIndex: number,
    amount: number
  ) => {
    if (!p.unitVariants) return;
    const current = Number(p.unitVariants[variantIndex]?.stock) || 0;
    await handleUpdateVariantStock(p, variantIndex, current + amount);
  };

  // ─── Toggle Variant Visibility for Customers ─────────────────────────────
  const handleToggleVariantVisibility = async (
    p: Product,
    variantIndex: number
  ) => {
    if (!p.unitVariants) return;
    try {
      setUpdatingId(`${p.id}_toggle_${variantIndex}`);
      const current = p.unitVariants[variantIndex].enabled !== false;
      const next = !current;
      const updatedVariants: UnitVariant[] = p.unitVariants.map((v, i) =>
        i === variantIndex ? { ...v, enabled: next } : v
      );

      await updateDoc(doc(db, "products", p.id), {
        unitVariants: updatedVariants,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, unitVariants: updatedVariants } : item
        )
      );

      toast.add({
        title: next ? "Option Visible to User ✓" : "Option Disabled",
        description: next
          ? `${p.name} (${p.unitVariants[variantIndex].label}) is now visible and selectable by customers.`
          : `${p.name} (${p.unitVariants[variantIndex].label}) will now appear as Out of Stock to customers.`,
      });
    } catch (err) {
      console.error(err);
      toast.add({
        title: "Update failed",
        description: "Could not update option visibility.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Only Make Largest Option Visible ────────────────────────────────────
  const handleSetOnlyMaxVariant = async (p: Product) => {
    if (!p.unitVariants || p.unitVariants.length === 0) return;
    const maxV = getMaxVariant(p.unitVariants);
    if (!maxV) return;

    try {
      setUpdatingId(`${p.id}_maxonly`);
      const updatedVariants: UnitVariant[] = p.unitVariants.map((v) => ({
        ...v,
        enabled: v.label === maxV.label,
      }));

      await updateDoc(doc(db, "products", p.id), {
        unitVariants: updatedVariants,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, unitVariants: updatedVariants } : item
        )
      );

      toast.add({
        title: "Largest Option Active ⚡",
        description: `Only ${maxV.label} is now active. All other sizes show as Out of Stock to customers.`,
      });
    } catch (err) {
      console.error(err);
      toast.add({
        title: "Update failed",
        description: "Could not set largest option.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Make All Options Visible ────────────────────────────────────────────
  const handleEnableAllVariants = async (p: Product) => {
    if (!p.unitVariants || p.unitVariants.length === 0) return;
    try {
      setUpdatingId(`${p.id}_allvariants`);
      const updatedVariants: UnitVariant[] = p.unitVariants.map((v) => ({
        ...v,
        enabled: true,
      }));

      await updateDoc(doc(db, "products", p.id), {
        unitVariants: updatedVariants,
      });

      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, unitVariants: updatedVariants } : item
        )
      );

      toast.add({
        title: "All Options Visible ✓",
        description: `All ${p.unitVariants.length} sizes are now visible to customers.`,
      });
    } catch (err) {
      console.error(err);
      toast.add({
        title: "Update failed",
        description: "Could not enable all options.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Counts for quick KPI filter badges
  const outCount = products.filter((p) => getEffectiveStock(p) <= 0).length;
  const lowCount = products.filter((p) => {
    const s = getEffectiveStock(p);
    return s > 0 && s < 5;
  }).length;
  const inCount = products.filter((p) => getEffectiveStock(p) >= 5).length;

  return (
    <div className="space-y-6">
      {/* HEADER & SEARCH CARD */}
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                Stock & Inventory Management
              </CardTitle>
              <CardDescription>
                Search by Product Name or Product ID to quickly restock items and manage variants.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProducts}
              disabled={loading}
              className="self-start sm:self-auto text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Search bar & filter pills */}
          <div className="pt-4 flex flex-col md:flex-row gap-3">
            {/* Search Input (Name or ID) */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Product Name, ID, or Category..."
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

            {/* Status Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="text-xs h-9"
              >
                All ({products.length})
              </Button>
              <Button
                variant={filter === "low" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("low")}
                className={`text-xs h-9 ${
                  lowCount > 0 ? "border-amber-400 text-amber-700 dark:text-amber-400" : ""
                }`}
              >
                ⚠️ Low Stock ({lowCount})
              </Button>
              <Button
                variant={filter === "out" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("out")}
                className={`text-xs h-9 ${
                  outCount > 0 ? "border-rose-400 text-rose-700 dark:text-rose-400" : ""
                }`}
              >
                🚨 Out of Stock ({outCount})
              </Button>
              <Button
                variant={filter === "in" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("in")}
                className="text-xs h-9"
              >
                In Stock ({inCount})
              </Button>
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
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold">No products found</p>
              <p className="text-xs text-muted-foreground">
                {search ? `No products matching "${search}".` : "No products under this filter."}
              </p>
            </div>
          ) : (
            <>
              {/* ── Desktop & Laptop Table View ──────────────────────────── */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      <th className="pb-3 pr-3">Product</th>
                      <th className="pb-3 pr-3">Product ID</th>
                      <th className="pb-3 pr-3">Price</th>
                      <th className="pb-3 pr-4">Current Stock</th>
                      <th className="pb-3 text-right">Quick Restock Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProducts.map((p) => {
                      const totalStock = getEffectiveStock(p);
                      const isVariant = p.hasVariants && p.unitVariants && p.unitVariants.length > 0;
                      const isUpdating = updatingId === p.id;
                      const mainImg = p.images?.[0] ?? p.image;

                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          {/* Product Info */}
                          <td className="py-3.5 pr-3 max-w-[280px]">
                            <div className="flex items-center gap-3">
                              {mainImg ? (
                                <img
                                  src={mainImg}
                                  alt={p.name}
                                  className="h-12 w-12 rounded-lg object-cover border shrink-0 bg-muted"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{p.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {p.category && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {p.category}
                                    </Badge>
                                  )}
                                  {isVariant && (
                                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                      <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5">
                                        <Scale className="h-2.5 w-2.5 text-primary" />
                                        {p.unitVariants?.length} options
                                      </Badge>
                                      <Badge
                                        variant={
                                          p.unitVariants?.some((v) => v.enabled !== false)
                                            ? "secondary"
                                            : "destructive"
                                        }
                                        className="text-[10px] px-1 py-0"
                                      >
                                        {p.unitVariants?.filter((v) => v.enabled !== false).length} of{" "}
                                        {p.unitVariants?.length} visible to user
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Product ID (Copyable) */}
                          <td className="py-3.5 pr-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded select-all">
                                {p.id}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyId(p.id, e)}
                                className="text-muted-foreground hover:text-foreground p-1 rounded"
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

                          {/* Price */}
                          <td className="py-3.5 pr-3 font-semibold whitespace-nowrap">
                            ₹{Number(p.price || 0).toLocaleString("en-IN")}
                          </td>

                          {/* Stock Status Badge */}
                          <td className="py-3.5 pr-4 whitespace-nowrap">
                            <Badge
                              variant={
                                totalStock <= 0
                                  ? "destructive"
                                  : totalStock < 5
                                  ? "secondary"
                                  : "outline"
                              }
                              className={`font-semibold text-xs ${
                                totalStock <= 0
                                  ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                                  : totalStock < 5
                                  ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "border-green-300 text-green-700 dark:border-green-800 dark:text-green-400"
                              }`}
                            >
                              {totalStock <= 0
                                ? "Out of Stock (0)"
                                : totalStock < 5
                                ? `Low: ${totalStock} left`
                                : `In Stock: ${totalStock}`}
                            </Badge>
                          </td>

                          {/* Quick Restock Controls */}
                          <td className="py-3.5 text-right">
                            {!isVariant ? (
                              /* Plain Product Controls */
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating || totalStock <= 0}
                                  onClick={() => handleQuickAdd(p, -1)}
                                  className="h-8 w-8 p-0"
                                  title="Reduce 1"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleQuickAdd(p, 5)}
                                  className="h-8 px-2 text-xs font-semibold"
                                >
                                  +5
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleQuickAdd(p, 10)}
                                  className="h-8 px-2 text-xs font-semibold"
                                >
                                  +10
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleQuickAdd(p, 50)}
                                  className="h-8 px-2 text-xs font-semibold hidden xl:inline-flex"
                                >
                                  +50
                                </Button>

                                {/* Direct Set Input */}
                                <div className="flex items-center gap-1 ml-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder={String(totalStock)}
                                    value={stockInputs[p.id] ?? ""}
                                    onChange={(e) =>
                                      setStockInputs({ ...stockInputs, [p.id]: e.target.value })
                                    }
                                    className="w-16 h-8 text-xs text-center font-mono"
                                  />
                                  <Button
                                    size="sm"
                                    disabled={
                                      isUpdating ||
                                      stockInputs[p.id] === undefined ||
                                      stockInputs[p.id] === ""
                                    }
                                    onClick={() =>
                                      handleUpdatePlainStock(p, Number(stockInputs[p.id]))
                                    }
                                    className="h-8 text-xs px-2.5"
                                  >
                                    Set
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* Variant Product breakdown rows */
                              <div className="space-y-2 inline-block text-left w-full max-w-lg">
                                {/* Variant Quick Options Toolbar */}
                                <div className="flex items-center justify-between gap-2 pb-1.5 border-b text-[11px]">
                                  <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                    <Scale className="h-3 w-3 text-primary" />
                                    Manage {p.unitVariants?.length} Options:
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSetOnlyMaxVariant(p)}
                                      disabled={Boolean(updatingId?.startsWith(p.id))}
                                      className="h-6 px-1.5 text-[10px] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1 font-semibold"
                                      title="Enable only the largest quantity and turn off smaller sizes"
                                    >
                                      <Sparkles className="h-2.5 w-2.5" />
                                      Largest Only
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEnableAllVariants(p)}
                                      disabled={Boolean(updatingId?.startsWith(p.id))}
                                      className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10 gap-1"
                                      title="Enable all options for customers"
                                    >
                                      <Check className="h-2.5 w-2.5" />
                                      All Visible
                                    </Button>
                                  </div>
                                </div>

                                {/* List of Variant Rows with Visibility Toggle */}
                                <div className="space-y-1.5">
                                  {p.unitVariants?.map((v, vIdx) => {
                                    const isVarUpdating =
                                      updatingId === `${p.id}_var_${vIdx}` ||
                                      updatingId === `${p.id}_toggle_${vIdx}`;
                                    const isEnabled = v.enabled !== false;
                                    const vInputKey = `${p.id}_${vIdx}`;

                                    return (
                                      <div
                                        key={vIdx}
                                        className={`flex items-center justify-between gap-2 text-xs p-1.5 rounded-lg border transition-all ${
                                          isEnabled
                                            ? "bg-card/90 border-border"
                                            : "bg-muted/40 border-dashed border-border opacity-70"
                                        }`}
                                      >
                                        {/* Label & Price */}
                                        <div className="flex items-center gap-1.5 min-w-[75px]">
                                          <span className="font-bold text-foreground">
                                            {v.label}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            ₹{v.price}
                                          </span>
                                        </div>

                                        {/* Toggle: Visible vs Out of Stock */}
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={isEnabled}
                                          disabled={isVarUpdating}
                                          onClick={() => handleToggleVariantVisibility(p, vIdx)}
                                          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                                            isEnabled
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs hover:bg-emerald-100"
                                              : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
                                          }`}
                                          title={
                                            isEnabled
                                              ? "Click to disable (shows as Out of Stock to customers)"
                                              : "Click to enable (customer can select and buy)"
                                          }
                                        >
                                          {isEnabled ? (
                                            <>
                                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                              <span>Visible</span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                              <span>Out of Stock</span>
                                            </>
                                          )}
                                        </button>

                                        {/* Stock & Quick Restock */}
                                        <div className="flex items-center gap-1 ml-auto">
                                          <span className="font-mono text-xs font-semibold mr-1">
                                            {v.stock ?? 0}
                                          </span>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isVarUpdating || (v.stock ?? 0) <= 0}
                                            onClick={() => handleQuickAddVariant(p, vIdx, -1)}
                                            className="h-6 w-6 p-0 text-[10px]"
                                            title="Minus 1"
                                          >
                                            -1
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isVarUpdating}
                                            onClick={() => handleQuickAddVariant(p, vIdx, 5)}
                                            className="h-6 px-1.5 text-[10px] font-bold"
                                          >
                                            +5
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isVarUpdating}
                                            onClick={() => handleQuickAddVariant(p, vIdx, 20)}
                                            className="h-6 px-1.5 text-[10px] font-bold hidden xl:inline-flex"
                                          >
                                            +20
                                          </Button>
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder={String(v.stock ?? 0)}
                                            value={variantInputs[vInputKey] ?? ""}
                                            onChange={(e) =>
                                              setVariantInputs({
                                                ...variantInputs,
                                                [vInputKey]: e.target.value,
                                              })
                                            }
                                            className="w-12 h-6 text-[10px] text-center font-mono p-0"
                                          />
                                          <Button
                                            size="sm"
                                            disabled={
                                              isVarUpdating ||
                                              variantInputs[vInputKey] === undefined ||
                                              variantInputs[vInputKey] === ""
                                            }
                                            onClick={() =>
                                              handleUpdateVariantStock(
                                                p,
                                                vIdx,
                                                Number(variantInputs[vInputKey])
                                              )
                                            }
                                            className="h-6 text-[10px] px-2"
                                          >
                                            Set
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile & Tablet Card View ────────────────────────────── */}
              <div className="space-y-3 lg:hidden">
                {filteredProducts.map((p) => {
                  const totalStock = getEffectiveStock(p);
                  const isVariant = p.hasVariants && p.unitVariants && p.unitVariants.length > 0;
                  const isUpdating = updatingId === p.id;
                  const mainImg = p.images?.[0] ?? p.image;

                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border bg-card p-3.5 space-y-3 shadow-sm"
                    >
                      {/* Row 1: Image + Name + ID + Price */}
                      <div className="flex items-start gap-3">
                        {mainImg ? (
                          <img
                            src={mainImg}
                            alt={p.name}
                            className="h-14 w-14 rounded-lg object-cover border shrink-0 bg-muted"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                            <span className="font-bold text-sm text-foreground shrink-0">
                              ₹{Number(p.price || 0).toLocaleString("en-IN")}
                            </span>
                          </div>

                          {/* Product ID Pill */}
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
                          </div>

                          {/* Stock status badge */}
                          <div className="mt-1.5">
                            <Badge
                              variant={
                                totalStock <= 0
                                  ? "destructive"
                                  : totalStock < 5
                                  ? "secondary"
                                  : "outline"
                              }
                              className={`text-[10px] font-semibold ${
                                totalStock <= 0
                                  ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                                  : totalStock < 5
                                  ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                                  : "border-green-300 text-green-700 dark:border-green-800 dark:text-green-400"
                              }`}
                            >
                              {totalStock <= 0
                                ? "Out of Stock (0)"
                                : totalStock < 5
                                ? `Low: ${totalStock} units left`
                                : `In Stock: ${totalStock} units`}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Restock Controls */}
                      <div className="pt-2 border-t">
                        {!isVariant ? (
                          /* Plain Product Quick Controls */
                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Quick Restock
                            </p>
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating || totalStock <= 0}
                                  onClick={() => handleQuickAdd(p, -1)}
                                  className="h-8 w-8 p-0"
                                >
                                  -1
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleQuickAdd(p, 5)}
                                  className="h-8 px-2 text-xs font-bold"
                                >
                                  +5
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleQuickAdd(p, 20)}
                                  className="h-8 px-2 text-xs font-bold"
                                >
                                  +20
                                </Button>
                              </div>

                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder={String(totalStock)}
                                  value={stockInputs[p.id] ?? ""}
                                  onChange={(e) =>
                                    setStockInputs({ ...stockInputs, [p.id]: e.target.value })
                                  }
                                  className="w-16 h-8 text-xs text-center font-mono"
                                />
                                <Button
                                  size="sm"
                                  disabled={
                                    isUpdating ||
                                    stockInputs[p.id] === undefined ||
                                    stockInputs[p.id] === ""
                                  }
                                  onClick={() =>
                                    handleUpdatePlainStock(p, Number(stockInputs[p.id]))
                                  }
                                  className="h-8 text-xs px-2.5"
                                >
                                  Set
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Variant Breakdown on Mobile */
                          <div className="space-y-2.5">
                            {/* Mobile Toolbar */}
                            <div className="flex items-center justify-between gap-2 pb-1.5 border-b text-[11px]">
                              <p className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Scale className="h-3 w-3 text-primary" />
                                {p.unitVariants?.length} Options (
                                {p.unitVariants?.filter((v) => v.enabled !== false).length} Active)
                              </p>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetOnlyMaxVariant(p)}
                                  disabled={Boolean(updatingId?.startsWith(p.id))}
                                  className="h-6 px-1.5 text-[10px] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1 font-semibold"
                                  title="Enable only the largest size"
                                >
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Largest Only
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEnableAllVariants(p)}
                                  disabled={Boolean(updatingId?.startsWith(p.id))}
                                  className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10 gap-1"
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  All
                                </Button>
                              </div>
                            </div>

                            {/* Mobile Variant Cards */}
                            <div className="space-y-1.5">
                              {p.unitVariants?.map((v, vIdx) => {
                                const isVarUpdating =
                                  updatingId === `${p.id}_var_${vIdx}` ||
                                  updatingId === `${p.id}_toggle_${vIdx}`;
                                const isEnabled = v.enabled !== false;
                                const vInputKey = `${p.id}_${vIdx}`;

                                return (
                                  <div
                                    key={vIdx}
                                    className={`p-2 rounded-lg border text-xs space-y-2 transition-all ${
                                      isEnabled
                                        ? "bg-muted/30 border-border"
                                        : "bg-muted/50 border-dashed border-border opacity-75"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-foreground">
                                          {v.label}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                          ₹{v.price}
                                        </span>
                                      </div>

                                      {/* Toggle Button for Mobile */}
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={isEnabled}
                                        disabled={isVarUpdating}
                                        onClick={() =>
                                          handleToggleVariantVisibility(p, vIdx)
                                        }
                                        className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                                          isEnabled
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs hover:bg-emerald-100"
                                            : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100"
                                        }`}
                                      >
                                        {isEnabled ? (
                                          <>
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Visible</span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                            <span>Out of Stock</span>
                                          </>
                                        )}
                                      </button>
                                    </div>

                                    {/* Stock Controls on Mobile */}
                                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/50">
                                      <span className="font-mono text-[11px] text-muted-foreground">
                                        Stock: <strong>{v.stock ?? 0}</strong>
                                      </span>

                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={isVarUpdating || (v.stock ?? 0) <= 0}
                                          onClick={() =>
                                            handleQuickAddVariant(p, vIdx, -1)
                                          }
                                          className="h-7 w-7 p-0 text-[10px]"
                                        >
                                          -1
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={isVarUpdating}
                                          onClick={() =>
                                            handleQuickAddVariant(p, vIdx, 5)
                                          }
                                          className="h-7 px-1.5 text-[10px] font-bold"
                                        >
                                          +5
                                        </Button>
                                        <Input
                                          type="number"
                                          min="0"
                                          placeholder={String(v.stock ?? 0)}
                                          value={variantInputs[vInputKey] ?? ""}
                                          onChange={(e) =>
                                            setVariantInputs({
                                              ...variantInputs,
                                              [vInputKey]: e.target.value,
                                            })
                                          }
                                          className="w-12 h-7 text-[10px] text-center font-mono p-0"
                                        />
                                        <Button
                                          size="sm"
                                          disabled={
                                            isVarUpdating ||
                                            variantInputs[vInputKey] === undefined ||
                                            variantInputs[vInputKey] === ""
                                          }
                                          onClick={() =>
                                            handleUpdateVariantStock(
                                              p,
                                              vIdx,
                                              Number(variantInputs[vInputKey])
                                            )
                                          }
                                          className="h-7 text-[10px] px-2"
                                        >
                                          Set
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
