import { useState, useMemo, useRef } from "react";
import ProductCard from "@/pages/ProductHomeList";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Zap,
  ArrowRight,
  Shield,
  Clock,
  Truck,
  Search,
  SlidersHorizontal,
  CheckCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";
import type { Product } from "@/types/product";

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "in-stock";

function HorizontalProductTrack({
  title,
  products,
  onViewAll,
}: {
  title: string;
  products: Product[];
  onViewAll: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <div className="space-y-3 pt-6 border-t border-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-lime-400">Department</span>
          <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-tight">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-xs font-mono text-lime-400 hover:text-lime-300 hover:bg-lime-400/10 h-8 px-2.5"
          >
            Filter {title} →
          </Button>
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              className="h-7 w-7 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-300 hover:border-lime-400 hover:text-white transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="h-7 w-7 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-300 hover:border-lime-400 hover:text-white transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={rowRef}
        className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="shrink-0 snap-start w-[240px] sm:w-[260px] md:w-[280px] rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-1 hover:border-lime-500/40 transition-all hover:shadow-[0_0_20px_rgba(163,230,53,0.12)]"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NeoLuxeLayout({ products }: { products: Product[] }) {
  const { settings } = useSiteSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  // Extract unique categories strictly from products that have a non-empty category
  const categoriesData = useMemo(() => {
    const catMap = new Map<string, { count: number; image?: string }>();
    products.forEach((p) => {
      const cat = p.category?.trim();
      if (cat) {
        const existing = catMap.get(cat) || { count: 0, image: undefined };
        existing.count += 1;
        if (!existing.image) {
          existing.image = p.images?.[0] || p.image;
        }
        catMap.set(cat, existing);
      }
    });
    return Array.from(catMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        image: data.image,
      }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // Filter and sort products dynamically
  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      const matchesCategory =
        selectedCategory === "all" ||
        (p.category && p.category.trim().toLowerCase() === selectedCategory.toLowerCase());
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === "price-asc") {
        return Number(a.price) - Number(b.price);
      }
      if (sortBy === "price-desc") {
        return Number(b.price) - Number(a.price);
      }
      if (sortBy === "rating") {
        return (b.avgRating ?? 0) - (a.avgRating ?? 0);
      }
      if (sortBy === "in-stock") {
        const aStock = a.hasVariants ? (a.unitVariants?.some((v) => (v.stock ?? 0) > 0) ? 1 : 0) : a.stock;
        const bStock = b.hasVariants ? (b.unitVariants?.some((v) => (v.stock ?? 0) > 0) ? 1 : 0) : b.stock;
        return (bStock > 0 ? 1 : 0) - (aStock > 0 ? 1 : 0);
      }
      return 0; // "featured" natural order
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="bg-[#090b09] text-zinc-100 min-h-screen selection:bg-lime-500 selection:text-black">
      {/* ── 1. SLEEK CYBER-DARK HERO ── */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pt-16 sm:pb-24 border-b border-lime-500/10">
        {/* Ambient Neon Atmosphere */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-lime-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[280px] h-[280px] bg-emerald-500/10 rounded-full blur-[110px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-500/30 bg-lime-500/10 px-4 py-1.5 text-xs font-mono font-semibold text-lime-400 backdrop-blur-md shadow-[0_0_20px_rgba(163,230,53,0.12)]">
            <Zap className="h-3.5 w-3.5 text-lime-400 animate-pulse" />
            <span>{settings.brandName || "Official Cyber Store"}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-[1.05]">
            <span className="text-white">Next-Gen </span>
            <span className="bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {settings.heroTitle || "Curated Premium Collection"}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {settings.heroSubtitle ||
              "Authentic quality products, transparent pricing, and rapid delivery backed by verified customer satisfaction."}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={() =>
                document.getElementById("neo-catalog")?.scrollIntoView({ behavior: "smooth" })
              }
              className="rounded-full px-8 py-5 font-bold bg-lime-400 text-black hover:bg-lime-300 shadow-[0_0_25px_rgba(163,230,53,0.35)] hover:shadow-[0_0_35px_rgba(163,230,53,0.5)] transition-all text-sm"
            >
              Explore Products ({products.length})
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {categoriesData.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  document.getElementById("neo-categories")?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-full px-7 py-5 font-semibold border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 backdrop-blur-sm text-sm"
              >
                Categories ({categoriesData.length})
              </Button>
            )}
          </div>

          {/* Real Customer Trust HUD Cards */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 backdrop-blur-md">
              <Clock className="h-4 w-4 text-lime-400 mx-auto mb-1" />
              <p className="font-mono text-sm sm:text-base font-bold text-white">Fast Dispatch</p>
              <p className="text-[11px] text-zinc-400">Prompt order processing</p>
            </div>
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 backdrop-blur-md">
              <Shield className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="font-mono text-sm sm:text-base font-bold text-white">100% Genuine</p>
              <p className="text-[11px] text-zinc-400">Verified direct inventory</p>
            </div>
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 backdrop-blur-md">
              <Truck className="h-4 w-4 text-teal-400 mx-auto mb-1" />
              <p className="font-mono text-sm sm:text-base font-bold text-white">Free Delivery</p>
              <p className="text-[11px] text-zinc-400">Above {settings.currency}{settings.freeDeliveryAbove}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 backdrop-blur-md">
              <CheckCircle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
              <p className="font-mono text-sm sm:text-base font-bold text-white">Direct Support</p>
              <p className="text-[11px] text-zinc-400">Reliable order tracking</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. DYNAMIC CATEGORIES (Only shown if products have a category) ── */}
      {categoriesData.length > 0 && (
        <section id="neo-categories" className="py-10 px-4 sm:px-6 border-b border-zinc-900">
          <div className="mx-auto max-w-7xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-lime-400">
                  Collections
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
                  Browse by Category
                </h2>
              </div>
              <Badge className="bg-lime-500/15 text-lime-400 border-lime-500/30 font-mono text-xs">
                {categoriesData.length} {categoriesData.length === 1 ? "Category" : "Categories"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {categoriesData.map((cat, idx) => {
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <div
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(isSelected ? "all" : cat.name);
                      document.getElementById("neo-catalog")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`group relative overflow-hidden rounded-2xl border transition-all cursor-pointer aspect-16/10 flex flex-col justify-end p-4 ${
                      isSelected
                        ? "border-lime-400 bg-lime-400/15 shadow-[0_0_20px_rgba(163,230,53,0.25)] ring-1 ring-lime-400"
                        : "border-zinc-800/80 bg-zinc-900/50 hover:border-lime-400/50 hover:bg-zinc-900/80"
                    }`}
                  >
                    {/* Real product photo backdrop */}
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-40 group-hover:opacity-60"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-zinc-900" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                    <div className="relative z-10 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>0{idx + 1}</span>
                        <span className={isSelected ? "text-lime-400 font-bold" : "text-zinc-300"}>
                          {cat.count} {cat.count === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base capitalize text-white truncate drop-shadow-sm">
                        {cat.name}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 3. CATALOG & SEARCH HUD ── */}
      <section id="neo-catalog" className="py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header, Search & Sort */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-lime-400 uppercase tracking-widest mb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-ping" />
                Live Catalog
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                {selectedCategory === "all" ? "Product Showcase" : selectedCategory}
              </h2>
            </div>

            {/* Toolbar: Search + Sort */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Input */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Search products by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-10 rounded-full text-xs bg-zinc-900/80 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-lime-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 border border-zinc-800 rounded-full px-3 h-10 bg-zinc-900/80 text-xs font-mono text-zinc-300">
                <ArrowUpDown className="h-3.5 w-3.5 text-lime-400 shrink-0" />
                <span className="text-zinc-500 shrink-0">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent border-none text-xs font-mono font-semibold text-zinc-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="featured" className="bg-zinc-900 text-zinc-200">Featured</option>
                  <option value="price-asc" className="bg-zinc-900 text-zinc-200">Price: Low to High</option>
                  <option value="price-desc" className="bg-zinc-900 text-zinc-200">Price: High to Low</option>
                  <option value="rating" className="bg-zinc-900 text-zinc-200">Top Rated</option>
                  <option value="in-stock" className="bg-zinc-900 text-zinc-200">In Stock First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Category Filter Pills */}
          {categoriesData.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-mono text-zinc-400 shrink-0 flex items-center gap-1 mr-1">
                <SlidersHorizontal className="h-3 w-3 text-lime-400" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-mono transition-all shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-lime-400 text-black font-bold shadow-[0_0_15px_rgba(163,230,53,0.3)]"
                    : "border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                All ({products.length})
              </button>
              {categoriesData.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                const managed = settings.categories?.find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? "all" : cat.name)}
                    className={`rounded-full px-4 py-1.5 text-xs font-mono capitalize transition-all shrink-0 ${
                      isSelected
                        ? "bg-lime-400 text-black font-bold shadow-[0_0_15px_rgba(163,230,53,0.3)]"
                        : "border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    {managed?.emoji ? `${managed.emoji} ` : ""}{cat.name} ({cat.count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Filter Pill Bar */}
          {selectedCategory !== "all" && (
            <div className="flex items-center justify-between rounded-xl border border-lime-500/30 bg-lime-500/5 px-4 py-2.5 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-lime-400">
                <Tag className="h-3.5 w-3.5" />
                Filtered by category: <strong className="capitalize text-white">{selectedCategory}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className="h-7 text-xs font-mono text-lime-400 hover:text-lime-300 hover:bg-transparent p-0 underline"
              >
                Show all products
              </Button>
            </div>
          )}

          {/* Product Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 pt-2">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-1 hover:border-lime-500/40 transition-all hover:shadow-[0_0_25px_rgba(163,230,53,0.12)] group"
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center space-y-3 bg-zinc-900/30 my-6">
              <p className="text-base font-semibold text-white">No products found</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {searchQuery
                  ? `No products matching "${searchQuery}". Try a different keyword.`
                  : `No products currently available under "${selectedCategory}".`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="text-xs mt-2 rounded-full border-zinc-700 text-zinc-200"
              >
                Reset Filter
              </Button>
            </div>
          )}

          {/* ── Category Deep-Dive Tracks (Only when browsing 'All' with no search) ── */}
          {selectedCategory === "all" && !searchQuery && categoriesData.length > 1 && (
            <div className="space-y-6 pt-6">
              {categoriesData.map((cat) => {
                const catProducts = products.filter(
                  (p) => p.category?.trim().toLowerCase() === cat.name.toLowerCase()
                );
                return (
                  <HorizontalProductTrack
                    key={cat.name}
                    title={cat.name}
                    products={catProducts}
                    onViewAll={() => {
                      setSelectedCategory(cat.name);
                      document.getElementById("neo-catalog")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. MINIMAL DARK FOOTER ── */}
      <footer className="py-10 px-4 sm:px-6 border-t border-zinc-900 bg-black/60">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2 text-zinc-300 font-bold">
            <span className="h-2 w-2 rounded-full bg-lime-400" />
            <span>{settings.brandName}</span>
            <span className="text-zinc-600">· Genuine Direct Sourcing & Secure Checkout</span>
          </div>
          <p>{settings.footerText || `© ${new Date().getFullYear()} ${settings.brandName}. All rights reserved.`}</p>
        </div>
      </footer>
    </div>
  );
}
