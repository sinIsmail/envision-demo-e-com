import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "@/pages/ProductHomeList";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { addToLocalCart } from "@/lib/cartStrorage";
import { formatPrice } from "@/lib/themeUtils";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/fb";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Mail,
  CheckCircle2,
  Package,
  Layers,
  Star,
  ExternalLink,
  Zap,
  ShoppingCart,
  Scale,
} from "lucide-react";
import type { Product } from "@/types/product";

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "in-stock";

interface CategoryMeta {
  name: string;
  count: number;
  image: string;
}

export function AuraModernLayout({ products }: { products: Product[] }) {
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const trendingRowRef = useRef<HTMLDivElement>(null);

  // ─── Extract Real Categories with Counts & Representative Images ─────────
  const { categories, categoryMetaList } = useMemo(() => {
    const map = new Map<string, { count: number; image: string }>();

    products.forEach((p) => {
      const cat = p.category?.trim();
      if (cat) {
        const existing = map.get(cat);
        const img = p.images?.[0] || p.image || "";
        if (existing) {
          existing.count += 1;
          if (!existing.image && img) existing.image = img;
        } else {
          map.set(cat, { count: 1, image: img });
        }
      }
    });

    const metaList: CategoryMeta[] = Array.from(map.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      image: data.image,
    }));

    metaList.sort((a, b) => b.count - a.count);

    return {
      categories: metaList.map((m) => m.name),
      categoryMetaList: metaList,
    };
  }, [products]);

  // ─── Recent Products for Hero Showcase Slider ───────────────────────────
  const recentProducts = useMemo(() => {
    if (products.length === 0) return [];
    return products.slice(0, 8);
  }, [products]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [addingSlideId, setAddingSlideId] = useState<string | null>(null);

  // Auto-play timer: advances every 4 seconds unless hovered/paused
  useEffect(() => {
    if (recentProducts.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % recentProducts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [recentProducts.length, isPaused]);

  const nextSlide = () => {
    if (recentProducts.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % recentProducts.length);
  };

  const prevSlide = () => {
    if (recentProducts.length <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + recentProducts.length) % recentProducts.length);
  };

  const activeProduct = recentProducts[currentSlide] || null;

  // ─── Filter & Sort Products ──────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      const matchesCategory =
        selectedCategory === "all" ||
        (p.category && p.category.trim().toLowerCase() === selectedCategory.toLowerCase());
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
      if (sortBy === "rating") return (b.avgRating ?? 0) - (a.avgRating ?? 0);
      if (sortBy === "in-stock") {
        const aStock = a.hasVariants
          ? a.unitVariants?.some((v) => (v.stock ?? 0) > 0) ? 1 : 0
          : a.stock;
        const bStock = b.hasVariants
          ? b.unitVariants?.some((v) => (v.stock ?? 0) > 0) ? 1 : 0
          : b.stock;
        return (bStock > 0 ? 1 : 0) - (aStock > 0 ? 1 : 0);
      }
      return 0;
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // ─── Quick Add Slide Product to Cart ─────────────────────────────────────
  const handleAddSlideProduct = async (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    if (!p) return;

    if (p.hasVariants && p.unitVariants && p.unitVariants.length > 0) {
      navigate(`/product/${p.id}`);
      return;
    }

    setAddingSlideId(p.id);
    try {
      if (!user) {
        addToLocalCart(p.id);
        toast.add({
          title: "Added to Cart ✓",
          description: `${p.name} has been added.`,
        });
      } else {
        const cartRef = collection(db, "cart", user.uid, "items");
        const snap = await getDocs(cartRef);
        const existing = snap.docs.find((d) => {
          const data = d.data();
          const pId = String(data.productId ?? data.productid ?? d.id);
          return pId === p.id && !data.variantLabel;
        });

        if (existing) {
          await updateDoc(doc(db, "cart", user.uid, "items", existing.id), {
            quantity: (Number(existing.data().quantity) || 0) + 1,
            productId: p.id,
            productid: p.id,
          });
        } else {
          const mainImg = p.images?.[0] ?? p.image;
          await addDoc(cartRef, {
            productId: p.id,
            productid: p.id,
            name: p.name,
            price: Number(p.price),
            image: mainImg,
            quantity: 1,
          });
        }
        toast.add({
          title: "Added to Cart ✓",
          description: `${p.name} added to your bag.`,
        });
      }
    } catch (err) {
      console.error(err);
      toast.add({
        title: "Cart Notice",
        description: "Could not add product to cart.",
      });
    } finally {
      setAddingSlideId(null);
    }
  };

  const scrollTrending = (dir: "left" | "right") => {
    if (!trendingRowRef.current) return;
    trendingRowRef.current.scrollBy({
      left: dir === "left" ? -320 : 320,
      behavior: "smooth",
    });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) return;
    setSubscribed(true);
    toast.add({
      title: "Welcome to the VIP Club! 🎉",
      description: "Enjoy 15% off your next checkout with code AURA15.",
    });
  };

  const heroBg = settings.heroImageUrl
    ? `url(${settings.heroImageUrl})`
    : undefined;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* ── 1. ASYMMETRIC SPLIT HERO ────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-muted/20">
        {heroBg && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none"
              style={{ backgroundImage: heroBg }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70 pointer-events-none" />
          </>
        )}
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Narrative Column */}
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-4 py-1 text-xs font-semibold backdrop-blur-md shadow-2xs">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>Next-Gen Collection · 2026 Season</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 dark:text-white leading-tight">
                {settings.heroTitle || "Curated Aesthetics. Uncompromising Quality."}
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                {settings.heroSubtitle ||
                  "Discover limited drops, verified designer staples, and everyday luxury crafted for those who demand distinction."}
              </p>

              {/* Dynamic Category Quick-Links */}
              {categories.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    Popular Categories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs ${
                        selectedCategory === "all"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-primary/50 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      All ({products.length})
                    </button>
                    {categoryMetaList.slice(0, 5).map((meta) => {
                      const managed = settings.categories?.find(
                        (c) => c.name.toLowerCase() === meta.name.toLowerCase()
                      );
                      return (
                        <button
                          key={meta.name}
                          onClick={() => setSelectedCategory(meta.name)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-2xs ${
                            selectedCategory.toLowerCase() === meta.name.toLowerCase()
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-primary/50 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {managed?.emoji ? `${managed.emoji} ` : ""}{meta.name} ({meta.count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Guarantees Strip */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-2xs space-y-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Free Shipping</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Orders over {settings.currency}{settings.freeDeliveryAbove}
                  </p>
                </div>
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-2xs space-y-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">100% Authentic</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Guaranteed Genuine</p>
                </div>
                <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 shadow-2xs space-y-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Fast Dispatch</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Dispatched in 24h</p>
                </div>
              </div>
            </div>

            {/* Right Interactive Recent Products Showcase Slider */}
            {activeProduct && (
              <div
                className="lg:col-span-5"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className="relative rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-5 sm:p-6 shadow-md hover:shadow-xl hover:border-primary/40 transition-all duration-300 group backdrop-blur-md overflow-hidden">
                  
                  {/* Top Bar: Badge, Rating & Slide Counter */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <Sparkles className="mr-1 h-3 w-3 text-primary" />
                        Recent Drop
                      </Badge>
                      {recentProducts.length > 1 && (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
                          {String(currentSlide + 1).padStart(2, "0")} / {String(recentProducts.length).padStart(2, "0")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {activeProduct.avgRating && activeProduct.avgRating > 0 ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Star className="h-3.5 w-3.5 fill-amber-500" />
                          <span>{activeProduct.avgRating.toFixed(1)}</span>
                        </div>
                      ) : null}

                      {/* Navigation Arrows (Prev / Next) */}
                      {recentProducts.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={prevSlide}
                            className="h-7 w-7 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                            aria-label="Previous product"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={nextSlide}
                            className="h-7 w-7 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
                            aria-label="Next product"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Animated Slide Canvas */}
                  <div
                    key={activeProduct.id}
                    className="animate-in fade-in zoom-in-95 duration-300"
                  >
                    {/* Image Container with Nav Chevrons Overlay */}
                    <div
                      onClick={() => navigate(`/product/${activeProduct.id}`)}
                      className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 flex items-center justify-center cursor-pointer shadow-2xs group/img"
                    >
                      <img
                        src={activeProduct.images?.[0] || activeProduct.image}
                        alt={activeProduct.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover/img:scale-108"
                      />
                      
                      {activeProduct.category && (
                        <span className="absolute bottom-3 left-3 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-2xs">
                          {activeProduct.category}
                        </span>
                      )}

                      {activeProduct.hasVariants && (
                        <span className="absolute top-3 right-3 rounded-full bg-slate-900/80 dark:bg-slate-100/90 text-white dark:text-slate-900 px-2 py-0.5 text-[10px] font-bold shadow-2xs backdrop-blur-sm">
                          {activeProduct.unitVariants?.length ?? "Multiple"} Sizes
                        </span>
                      )}
                    </div>

                    {/* Product Metadata & Actions */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3
                            onClick={() => navigate(`/product/${activeProduct.id}`)}
                            className="font-bold text-base sm:text-lg text-slate-900 dark:text-white hover:text-primary transition-colors cursor-pointer truncate"
                          >
                            {activeProduct.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {activeProduct.description || "Fresh arrival ready for immediate dispatch."}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            {formatPrice(activeProduct.price, settings.currency, settings.currencyLocale)}
                          </p>
                          {activeProduct.hasVariants && (
                            <span className="text-[10px] text-slate-500 font-medium block -mt-0.5">
                              Base Price
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={(e) => handleAddSlideProduct(e, activeProduct)}
                          disabled={addingSlideId === activeProduct.id}
                          className="flex-1 h-11 rounded-xl font-bold text-xs sm:text-sm bg-primary text-primary-foreground shadow-xs hover:shadow-md hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {activeProduct.hasVariants ? (
                            <>
                              <Scale className="h-4 w-4" />
                              <span>Select Size</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-4 w-4" />
                              <span>{addingSlideId === activeProduct.id ? "Adding..." : "Add to Bag"}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/product/${activeProduct.id}`)}
                          className="h-11 px-4 rounded-xl font-semibold text-xs border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Details</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Indicator Dots */}
                  {recentProducts.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80">
                      {recentProducts.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setCurrentSlide(idx)}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            idx === currentSlide
                              ? "w-6 bg-primary"
                              : "w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. DYNAMIC CATEGORY BENTO (If products have categories) ─────────── */}
      {categoryMetaList.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Explore by Category
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Curated departments with live inventory.
              </p>
            </div>
            {selectedCategory !== "all" && (
              <button
                onClick={() => setSelectedCategory("all")}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear Filter ({selectedCategory})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {categoryMetaList.map((meta) => {
              const isSelected = selectedCategory.toLowerCase() === meta.name.toLowerCase();
              return (
                <div
                  key={meta.name}
                  onClick={() =>
                    setSelectedCategory((prev) =>
                      prev.toLowerCase() === meta.name.toLowerCase() ? "all" : meta.name
                    )
                  }
                  className={`group relative overflow-hidden rounded-xl border p-3 sm:p-4 text-left cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border/80 bg-card hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-muted mb-3">
                    {meta.image ? (
                      <img
                        src={meta.image}
                        alt={meta.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <Layers className="h-6 w-6" />
                      </div>
                    )}
                    <Badge className="absolute right-2 top-2 text-[10px] bg-background/90 text-foreground font-semibold">
                      {meta.count} items
                    </Badge>
                  </div>

                  <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {meta.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isSelected ? "Active filter · tap to reset" : "View collection →"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 3. HORIZONTAL TRENDING STRIP ─────────────────────────────────────── */}
      {products.length > 4 && (
        <section className="border-y border-border/60 bg-muted/15 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Trending This Week
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollTrending("left")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollTrending("right")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={trendingRowRef}
              className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {products.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  className="shrink-0 snap-start w-[180px] sm:w-[220px]"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 4. COMMAND FILTER & SEARCH BAR ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pt-12 pb-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              All Products
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Showing {filteredProducts.length} of {products.length} products
              {selectedCategory !== "all" && ` in "${selectedCategory}"`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 text-xs h-9 rounded-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-9 rounded-lg border border-border/80 bg-background px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="in-stock">In-Stock First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Pills Bar */}
        {(selectedCategory !== "all" || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <span className="text-xs text-muted-foreground">Active Filters:</span>
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Category: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="ml-1 hover:text-destructive"
                >
                  ✕
                </button>
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Query: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-1 hover:text-destructive"
                >
                  ✕
                </button>
              </Badge>
            )}
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="text-xs text-primary font-semibold hover:underline ml-2"
            >
              Reset All
            </button>
          </div>
        )}
      </section>

      {/* ── 5. PRODUCT GRID ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center my-6">
            <Package className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-60" />
            <h3 className="text-base font-bold text-foreground">No matching products found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              We couldn't find any items matching your active filter criteria. Try resetting your search or category.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="mt-4 font-semibold text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── 6. TRUST & STORE PERKS GRID ─────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/20 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-border/60 bg-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Express Delivery</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Free shipping over {settings.currency}{settings.freeDeliveryAbove}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-border/60 bg-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Secure Payments</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  256-bit SSL encrypted checkout.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-border/60 bg-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Hassle-Free Returns</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  7-day return guarantee policy.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-border/60 bg-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Customer Support</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dedicated assistance whenever needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. VIP REWARDS & NEWSLETTER SECTION ──────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-foreground text-background p-8 sm:p-12 lg:flex lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-2">
            <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-background">
              Unlock 15% Off Your Next Order
            </h3>
            <p className="text-sm text-background/80 leading-relaxed">
              Join the VIP insider circle for member-only flash drops, new collection alerts, and instant discounts.
            </p>
          </div>

          <div className="mt-6 lg:mt-0 lg:ml-8 shrink-0 w-full sm:w-auto">
            {subscribed ? (
              <div className="flex items-center gap-2 rounded-xl bg-background/10 px-4 py-3 text-sm text-background border border-background/20 font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>You're enrolled! Use code <strong>AURA15</strong> at checkout.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="pl-9 pr-3 h-10 rounded-xl bg-background text-foreground border-none text-xs w-full sm:w-64"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl font-semibold text-xs bg-primary text-primary-foreground hover:opacity-90"
                >
                  Join VIP Club
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── 8. MODERN E-COMMERCE FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-border/60 bg-muted/30 py-12 text-muted-foreground text-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5 mb-10">
            {/* Brand Col */}
            <div className="col-span-2 space-y-3">
              <span className="text-lg font-bold text-foreground">
                {settings.brandName || "Shop."}
              </span>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                Premium digital storefront featuring verified apparel, lifestyle goods, and authentic seasonal staples.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {settings.socialLinks?.instagram && (
                  <a
                    href={settings.socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-border/80 hover:text-foreground hover:border-foreground transition-colors"
                  >
                    IG
                  </a>
                )}
                {settings.socialLinks?.facebook && (
                  <a
                    href={settings.socialLinks.facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-border/80 hover:text-foreground hover:border-foreground transition-colors"
                  >
                    FB
                  </a>
                )}
                {settings.socialLinks?.twitter && (
                  <a
                    href={settings.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-border/80 hover:text-foreground hover:border-foreground transition-colors"
                  >
                    X
                  </a>
                )}
              </div>
            </div>

            {/* Shop Links */}
            <div className="space-y-2">
              <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">
                Storefront
              </h5>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">
                    All Products
                  </button>
                </li>
                {categoryMetaList.slice(0, 3).map((c) => (
                  <li key={c.name}>
                    <button
                      onClick={() => {
                        setSelectedCategory(c.name);
                        window.scrollTo({ top: 400, behavior: "smooth" });
                      }}
                      className="hover:text-foreground transition-colors"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account & Orders */}
            <div className="space-y-2">
              <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">
                Account
              </h5>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => navigate("/Cart")} className="hover:text-foreground transition-colors">
                    My Bag
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate("/Profile")} className="hover:text-foreground transition-colors">
                    Order History
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate(user ? "/Profile" : "/Login")} className="hover:text-foreground transition-colors">
                    {user ? "Profile" : "Sign In"}
                  </button>
                </li>
              </ul>
            </div>

            {/* Payment & Security */}
            <div className="space-y-2">
              <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">
                Payments
              </h5>
              <p className="text-[11px] leading-relaxed">
                We accept all major debit/credit cards, UPI, and net banking with encrypted processing.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded border border-border/80 bg-background font-mono text-[10px]">
                  UPI
                </span>
                <span className="px-2 py-0.5 rounded border border-border/80 bg-background font-mono text-[10px]">
                  Visa
                </span>
                <span className="px-2 py-0.5 rounded border border-border/80 bg-background font-mono text-[10px]">
                  Mastercard
                </span>
                <span className="px-2 py-0.5 rounded border border-border/80 bg-background font-mono text-[10px]">
                  RuPay
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/60 pt-6 gap-3">
            <p className="text-[11px] text-muted-foreground">
              {settings.footerText || "© 2026 Shop. All rights reserved."}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Powered by Envision E-Commerce Engine
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
