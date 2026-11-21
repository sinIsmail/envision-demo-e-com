import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "@/pages/ProductHomeList";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Truck,
  ShieldCheck,
  RotateCcw,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import type { Product } from "@/types/product";

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "in-stock";

function HorizontalScrollRow({ products }: { products: Product[] }) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <div className="relative group/scroll">
      <button
        onClick={() => scroll("left")}
        className="absolute -left-3 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-md opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-muted"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div
        ref={rowRef}
        className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => (
          <div key={product.id} className="shrink-0 snap-start w-[240px] sm:w-[260px] md:w-[280px]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className="absolute -right-3 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-md opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-muted"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export function DefaultClassicLayout({ products }: { products: Product[] }) {
  const { settings } = useSiteSettings();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>(urlQuery);
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  // Extract unique categories from real products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const cat = p.category?.trim();
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filter products by selected category, search query, and sort order
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
      return 0;
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

  return (
    <div>
      {/* ── HERO BANNER ── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: settings.heroImageUrl
            ? undefined
            : `linear-gradient(135deg, hsl(var(--primary)/0.12) 0%, hsl(var(--background)) 60%)`,
        }}
      >
        {settings.heroImageUrl && (
          <>
            <img
              src={settings.heroImageUrl}
              alt="Hero"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </>
        )}

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium mb-5 ${
              settings.heroImageUrl
                ? "bg-white/10 text-white border-white/20 backdrop-blur-sm"
                : "bg-primary/10 text-primary border-primary/20"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            {settings.brandName}
          </div>
          <h1
            className={`text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl mx-auto ${
              settings.heroImageUrl ? "text-white" : "text-foreground"
            }`}
          >
            {settings.heroTitle}
          </h1>
          {settings.heroSubtitle && (
            <p
              className={`mt-4 text-sm sm:text-base max-w-xl mx-auto ${
                settings.heroImageUrl ? "text-white/80" : "text-muted-foreground"
              }`}
            >
              {settings.heroSubtitle}
            </p>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="gap-2 px-8 rounded-full"
              onClick={() =>
                document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <ShoppingBag className="h-4 w-4" />
              Shop Now ({products.length} Items)
            </Button>
          </div>
        </div>
      </section>

      {/* ── CUSTOMER VALUE STRIP ── */}
      <section className="border-y border-border/50 py-4 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <Truck className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">
              Free Delivery above {settings.currency}{settings.freeDeliveryAbove}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">
              100% Genuine & Verified Products
            </span>
          </div>
          <div className="flex items-center justify-center gap-2.5">
            <RotateCcw className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">
              Prompt Support & Easy Orders
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 space-y-12">
        {/* All Products & Dynamic Filter Section */}
        <section id="all-products" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {selectedCategory === "all" ? "All Products" : selectedCategory}
                </h2>
                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
                  {filteredProducts.length} items
                </Badge>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                {selectedCategory === "all"
                  ? "Browse our complete store catalog"
                  : `Filtered by ${selectedCategory}`}
              </p>
            </div>

            {/* Search and Sort Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-10 rounded-full text-xs bg-card"
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
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1 mr-1">
                <SlidersHorizontal className="h-3 w-3" /> Categories:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({products.length})
              </button>
              {categories.map((cat) => {
                const count = products.filter((p) => p.category?.trim().toLowerCase() === cat.toLowerCase()).length;
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                const managed = settings.categories?.find((c) => c.name.toLowerCase() === cat.toLowerCase());
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? "all" : cat)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-all shrink-0 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {managed?.emoji ? `${managed.emoji} ` : ""}{cat} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-2xl border border-dashed">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">No matching products found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? `No items match "${searchQuery}". Clear your search to see all products.`
                  : "No products available in this category currently."}
              </p>
              {(searchQuery || selectedCategory !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="text-xs rounded-full mt-1"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Category Horizontal Carousels (Only if not actively filtering by a specific category and categories exist) */}
        {selectedCategory === "all" && !searchQuery && categories.length > 0 && (
          <div className="space-y-10 pt-4 border-t">
            {categories.map((category) => {
              const categoryProducts = products.filter(
                (p) => p.category?.trim().toLowerCase() === category.toLowerCase()
              );
              if (categoryProducts.length === 0) return null;
              const managed = settings.categories?.find((c) => c.name.toLowerCase() === category.toLowerCase());
              return (
                <section key={category}>
                  <div className="mb-4 flex items-end justify-between">
                    <div>
                      <h3 className="text-lg font-bold sm:text-xl capitalize">
                        {managed?.emoji ? `${managed.emoji} ` : ""}{category}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {categoryProducts.length} items in {category}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(category);
                        document.getElementById("all-products")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      View All →
                    </Button>
                  </div>
                  <HorizontalScrollRow products={categoryProducts} />
                </section>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {settings.footerText && (
          <footer className="border-t pt-8 pb-4 text-center text-xs text-muted-foreground">
            <p>{settings.footerText}</p>
            {(settings.socialLinks.instagram ||
              settings.socialLinks.facebook ||
              settings.socialLinks.twitter) && (
              <div className="flex justify-center gap-4 mt-3">
                {settings.socialLinks.instagram && (
                  <a
                    href={settings.socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {settings.socialLinks.facebook && (
                  <a
                    href={settings.socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    Facebook
                  </a>
                )}
                {settings.socialLinks.twitter && (
                  <a
                    href={settings.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    Twitter
                  </a>
                )}
              </div>
            )}
          </footer>
        )}
      </main>
    </div>
  );
}
