import { useState, useMemo } from "react";
import ProductCard from "@/pages/ProductHomeList";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Mail,
  Check,
  Layers,
  ArrowUpDown,
  Tag,
} from "lucide-react";
import type { Product } from "@/types/product";

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "in-stock";

export function UrbanChicLayout({ products }: { products: Product[] }) {
  const { settings } = useSiteSettings();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Extract unique, non-empty categories strictly from products that have a category
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
      return 0; // "featured" maintains natural order
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setNewsletterEmail("");
    }
  };

  return (
    <div className="bg-background text-foreground transition-colors selection:bg-foreground selection:text-background min-h-screen">
      {/* ── 1. EDITORIAL HERO SECTION ── */}
      <section className="relative overflow-hidden bg-[#f4f4f5] dark:bg-[#121214] border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 sm:pt-16 sm:pb-20 lg:grid lg:grid-cols-12 lg:gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/5 dark:bg-white/10 px-3.5 py-1 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>{settings.brandName || "Official Store"}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-[1.05] text-foreground">
              {settings.heroTitle || "Discover Quality Products Made for You"}
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
              {settings.heroSubtitle ||
                "Browse our curated selection of verified products with fast delivery, simple returns, and transparent pricing."}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                size="lg"
                onClick={() =>
                  document.getElementById("store-catalog")?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-full px-8 py-5 text-sm font-bold bg-foreground text-background hover:opacity-90 shadow-md hover:shadow-lg transition-all"
              >
                Shop All Products ({products.length})
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              {categoriesData.length > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    document.getElementById("category-section")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="rounded-full px-7 py-5 text-sm font-semibold border-foreground/20 hover:bg-muted transition-all"
                >
                  Explore Categories ({categoriesData.length})
                </Button>
              )}
            </div>

            {/* Real Store Commitments */}
            <div className="pt-6 border-t border-border/60 grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-bold text-foreground">
                  {settings.currency}
                  {settings.freeDeliveryAbove}
                </p>
                <p className="text-xs text-muted-foreground">Free Delivery Above</p>
              </div>
              <div className="border-l border-border/60 pl-4">
                <p className="text-sm font-bold text-foreground">100% Genuine</p>
                <p className="text-xs text-muted-foreground">Verified Direct Inventory</p>
              </div>
              <div className="border-l border-border/60 pl-4 hidden sm:block">
                <p className="text-sm font-bold text-foreground">Fast Dispatch</p>
                <p className="text-xs text-muted-foreground">Prompt Doorstep Delivery</p>
              </div>
            </div>
          </div>

          {/* Right Visual Column */}
          <div className="lg:col-span-5 mt-8 lg:mt-0 relative flex justify-center">
            <div className="relative w-full max-w-md aspect-4/5 rounded-3xl overflow-hidden bg-card border border-border/60 shadow-xl flex items-center justify-center p-4">
              {settings.heroImageUrl ? (
                <img
                  src={settings.heroImageUrl}
                  alt={settings.heroTitle || "Store Banner"}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : products[0]?.images?.[0] || products[0]?.image ? (
                <img
                  src={products[0]?.images?.[0] || products[0]?.image}
                  alt={products[0]?.name || "Featured Product"}
                  className="w-full h-full object-contain p-4 drop-shadow-md transition-transform hover:scale-105 duration-300"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl uppercase tracking-wider">{settings.brandName}</h3>
                  <p className="text-xs text-muted-foreground">Curated Store Catalog</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. REAL VALUE PROPOSITION STRIP ── */}
      <section className="border-b border-border/40 py-5 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Truck className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold">Free Doorstep Delivery</p>
              <p className="text-[11px] text-muted-foreground">
                On all qualifying orders above {settings.currency}
                {settings.freeDeliveryAbove}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold">Authentic Products</p>
              <p className="text-[11px] text-muted-foreground">Directly sourced and quality verified</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold">Reliable Customer Support</p>
              <p className="text-[11px] text-muted-foreground">Quick resolution & order tracking</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. DYNAMIC CATEGORIES (Only shown if products have a category) ── */}
      {categoriesData.length > 0 && (
        <section id="category-section" className="py-12 sm:py-16 px-4 sm:px-6 border-b border-border/40">
          <div className="mx-auto max-w-7xl rounded-3xl bg-[#f0f0f0] dark:bg-[#18181b] p-6 sm:p-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Departments</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-foreground">
                  Browse by Category
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Select a category to filter real store products
                </p>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto text-xs font-semibold px-2.5 py-1">
                {categoriesData.length} {categoriesData.length === 1 ? "Category" : "Categories"}
              </Badge>
            </div>

            {/* Dynamic Visual Category Cards with Actual Product Imagery */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {categoriesData.map((cat, idx) => {
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <div
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(isSelected ? "all" : cat.name);
                      document.getElementById("store-catalog")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`group relative overflow-hidden rounded-2xl border transition-all cursor-pointer aspect-4/3 flex flex-col justify-end p-4 sm:p-5 ${
                      isSelected
                        ? "border-primary ring-2 ring-primary shadow-lg"
                        : "border-border/70 hover:border-foreground/40 hover:shadow-md"
                    }`}
                  >
                    {/* Background Product Image */}
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-muted" />
                    )}

                    {/* Gradient Scrim for Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                    {/* Content Overlay */}
                    <div className="relative z-10 text-white space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                        <span>0{idx + 1}</span>
                        <span className="rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white">
                          {cat.count} {cat.count === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold capitalize leading-snug drop-shadow-sm text-white">
                        {cat.name}
                      </h3>
                      <div className="pt-1 flex items-center gap-1 text-[11px] text-zinc-200 group-hover:translate-x-1 transition-transform">
                        <span>View category</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. PRODUCT CATALOG & CONTROLS ── */}
      <section id="store-catalog" className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
                  {selectedCategory === "all" ? "All Products" : selectedCategory}
                </h2>
                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                  {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {selectedCategory === "all"
                  ? "Explore everything in our store collection"
                  : `Showing all products filed under "${selectedCategory}"`}
              </p>
            </div>

            {/* Search and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-10 rounded-full text-xs bg-card border-border/70 focus:border-primary"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-1.5 border border-border/70 rounded-full px-3 h-10 bg-card text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground shrink-0">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="in-stock">In Stock First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Category Filter Pills (Only shown if products have categories) */}
          {categoriesData.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1 mr-1">
                <SlidersHorizontal className="h-3 w-3" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-foreground text-background shadow-xs"
                    : "border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({products.length})
              </button>
              {categoriesData.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? "all" : cat.name)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all shrink-0 ${
                      isSelected
                        ? "bg-foreground text-background shadow-xs"
                        : "border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.name} ({cat.count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Filter Notice */}
          {selectedCategory !== "all" && (
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Filtered by category: <strong className="capitalize">{selectedCategory}</strong>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className="h-7 text-xs font-semibold text-primary hover:underline p-0"
              >
                Show all products
              </Button>
            </div>
          )}

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 pt-2">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-10 text-center space-y-3 bg-muted/10 my-6">
              <p className="text-base font-semibold text-foreground">No matching products found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? `No products matched "${searchQuery}". Try a different keyword or clear your filters.`
                  : `No products currently available under "${selectedCategory}".`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="text-xs mt-2 rounded-full"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── 5. NEWSLETTER & STORE UPDATES ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-12">
        <div className="rounded-3xl bg-foreground text-background p-6 sm:p-12 lg:grid lg:grid-cols-12 lg:gap-8 items-center shadow-xl">
          <div className="lg:col-span-7 space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-background leading-tight">
              Stay updated on new arrivals & exclusive offers
            </h2>
            <p className="text-xs sm:text-sm opacity-80 max-w-md">
              Subscribe to get notified about restocks, seasonal sales, and member promotions.
            </p>
          </div>
          <div className="lg:col-span-5 mt-6 lg:mt-0">
            {subscribed ? (
              <div className="rounded-2xl bg-background/20 p-4 text-center font-bold text-background text-sm flex items-center justify-center gap-2">
                <Check className="h-4 w-4" /> Thank you for subscribing!
              </div>
            ) : (
              <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="pl-11 h-11 rounded-full bg-background text-foreground placeholder:text-muted-foreground border-none text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 rounded-full font-bold bg-background text-foreground hover:opacity-90 transition-opacity text-xs px-6"
                >
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── 6. CLEAN STORE FOOTER ── */}
      <footer className="bg-[#f0f0f0] dark:bg-[#0c0c0e] border-t border-border/40 py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground text-sm">{settings.brandName}</span>
            <span>· Verified Authentic Sourcing & Secure Checkout</span>
          </div>
          <p>{settings.footerText || `© ${new Date().getFullYear()} ${settings.brandName}. All rights reserved.`}</p>
        </div>
      </footer>
    </div>
  );
}
