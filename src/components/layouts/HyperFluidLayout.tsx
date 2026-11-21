import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ProductCard from "@/pages/ProductHomeList";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { addToLocalCart } from "@/lib/cartStrorage";
import { formatPrice, getContrastForeground, getLuminance } from "@/lib/themeUtils";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/fb";
import { toast } from "@/components/ui/toast";
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
  ExternalLink,
  Zap,
  ShoppingCart,
  Scale,
  ArrowRight,
} from "lucide-react";
import type { Product } from "@/types/product";

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "in-stock";

interface CategoryMeta {
  name: string;
  count: number;
  image: string;
}

export function HyperFluidLayout({ products }: { products: Product[] }) {
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>(urlQuery);
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const trendingRowRef = useRef<HTMLDivElement>(null);

  // Sync with URL query (?q=...)
  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (val.trim()) {
          next.set("q", val);
        } else {
          next.delete("q");
        }
        return next;
      },
      { replace: true }
    );
  };

  // ─── Extract Real Categories with Counts ─────────────────────────────────
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

  // ─── Recent Products for Spotlight Glass Slider ──────────────────────────
  const recentProducts = useMemo(() => {
    if (products.length === 0) return [];
    return products.slice(0, 8);
  }, [products]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [addingSlideId, setAddingSlideId] = useState<string | null>(null);

  useEffect(() => {
    if (recentProducts.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % recentProducts.length);
    }, 4500);
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
      left: dir === "left" ? -340 : 340,
      behavior: "smooth",
    });
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) return;
    setSubscribed(true);
    toast.add({
      title: "VIP Fluid Club Unlocked! ⚡",
      description: "Use code FLUID20 for 20% off your next checkout.",
    });
  };

  // Compute dynamic hero colors based on active color palette
  const heroColor = settings.primaryColor || "#FDE047";
  const isDarkHero = getLuminance(heroColor) < 0.45;
  const heroFg = getContrastForeground(heroColor);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-white selection:bg-primary selection:text-primary-foreground transition-colors duration-300">
      
      {/* ── 1. ASYMMETRIC LIQUID HERO (Dynamic Shout Color Area) ────────────────── */}
      <section
        style={{ backgroundColor: heroColor, color: heroFg }}
        className="relative overflow-hidden rounded-br-[80px] sm:rounded-br-[140px] rounded-bl-[28px] sm:rounded-bl-[48px] shadow-2xl transition-all"
      >
        {/* Subtle Fluid Decorative Blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-24 lg:pb-28">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            
            {/* Left Column: Massive Left-Aligned Typography */}
            <div className="space-y-6 lg:col-span-7">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold shadow-lg tracking-wide ${
                  isDarkHero ? "bg-white/15 text-white border border-white/20" : "bg-black/90 text-white"
                }`}
              >
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="tracking-widest uppercase text-[10px]">HYPER-SATURATED FLUID · 2026</span>
              </div>

              <h1 className="text-5xl font-black tracking-tighter sm:text-7xl lg:text-8xl leading-[0.92]">
                {settings.heroTitle || "CURATED AESTHETICS. HYPER QUALITY."}
              </h1>

              <p className={`max-w-xl text-base sm:text-lg font-medium leading-relaxed ${
                isDarkHero ? "text-white/80" : "text-black/80"
              }`}>
                {settings.heroSubtitle ||
                  "Next-generation shopping experience merging liquid geometry, glassmorphism, and instant dispatch."}
              </p>

              {/* Dynamic Pill Category Fast-Filters */}
              {categories.length > 0 && (
                <div className="pt-2">
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2.5 ${
                    isDarkHero ? "text-white/60" : "text-black/60"
                  }`}>
                    DEPARTMENTS & DROPS
                  </p>
                  <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`h-9 px-4 rounded-full text-xs font-black transition-all active:scale-95 shadow-md shrink-0 flex items-center cursor-pointer ${
                        selectedCategory === "all"
                          ? isDarkHero
                            ? "bg-white text-black shadow-lg scale-102"
                            : "bg-black text-white shadow-lg scale-102"
                          : isDarkHero
                            ? "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                            : "bg-white/80 text-black hover:bg-black hover:text-white border border-black/10"
                      }`}
                    >
                      ALL ({products.length})
                    </button>
                    {categoryMetaList.slice(0, 8).map((meta) => {
                      const managed = settings.categories?.find(
                        (c) => c.name.toLowerCase() === meta.name.toLowerCase()
                      );
                      const isSelected = selectedCategory.toLowerCase() === meta.name.toLowerCase();
                      return (
                        <button
                          key={meta.name}
                          onClick={() => setSelectedCategory(meta.name)}
                          className={`h-9 px-4 rounded-full text-xs font-black transition-all active:scale-95 shadow-md shrink-0 flex items-center cursor-pointer ${
                            isSelected
                              ? isDarkHero
                                ? "bg-white text-black shadow-lg scale-102"
                                : "bg-black text-white shadow-lg scale-102"
                              : isDarkHero
                                ? "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                                : "bg-white/80 text-black hover:bg-black hover:text-white border border-black/10"
                          }`}
                        >
                          {managed?.emoji ? `${managed.emoji} ` : ""}{meta.name} ({meta.count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* High-Impact Pill Trust Strips */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3">
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                  isDarkHero ? "bg-white/10 border border-white/15 text-white" : "bg-black/10 border border-black/15 text-black"
                }`}>
                  <Truck className="h-3.5 w-3.5" />
                  <span>Free Express Delivery &gt; {settings.currency}{settings.freeDeliveryAbove}</span>
                </div>
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                  isDarkHero ? "bg-white/10 border border-white/15 text-white" : "bg-black/10 border border-black/15 text-black"
                }`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>100% Genuine Guaranteed</span>
                </div>
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                  isDarkHero ? "bg-white/10 border border-white/15 text-white" : "bg-black/10 border border-black/15 text-black"
                }`}>
                  <Zap className="h-3.5 w-3.5" />
                  <span>24h Dispatch</span>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Frosted Glass Product Spotlight */}
            {activeProduct && (
              <div
                className="lg:col-span-5"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                <div className={`relative rounded-[32px] backdrop-blur-2xl p-5 sm:p-7 shadow-2xl transition-all duration-300 group overflow-hidden border ${
                  isDarkHero ? "border-white/20 bg-white/10" : "border-black/15 bg-white/40 dark:bg-black/30"
                }`}>
                  
                  {/* Top Bar inside Glass Card */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black tracking-wider uppercase shadow-xs flex items-center gap-1 ${
                        isDarkHero ? "bg-white text-black" : "bg-black text-white"
                      }`}>
                        <Sparkles className="h-3 w-3" />
                        SPOTLIGHT
                      </span>
                      {recentProducts.length > 1 && (
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isDarkHero ? "text-white/80 bg-white/10" : "text-black/70 bg-black/10"
                        }`}>
                          {String(currentSlide + 1).padStart(2, "0")} / {String(recentProducts.length).padStart(2, "0")}
                        </span>
                      )}
                    </div>

                    {/* Prev / Next Arrows */}
                    {recentProducts.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={prevSlide}
                          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-90 ${
                            isDarkHero ? "bg-white/15 hover:bg-white text-white hover:text-black" : "bg-black/10 hover:bg-black text-black hover:text-white"
                          }`}
                          aria-label="Previous product"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={nextSlide}
                          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-90 ${
                            isDarkHero ? "bg-white/15 hover:bg-white text-white hover:text-black" : "bg-black/10 hover:bg-black text-black hover:text-white"
                          }`}
                          aria-label="Next product"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Active Product Canvas */}
                  <div key={activeProduct.id} className="animate-in fade-in zoom-in-95 duration-300 space-y-4">
                    <div
                      onClick={() => navigate(`/product/${activeProduct.id}`)}
                      className="relative aspect-4/3 sm:aspect-16/10 w-full overflow-hidden rounded-[24px] border border-black/10 bg-white/70 p-4 flex items-center justify-center cursor-pointer shadow-inner group/img"
                    >
                      <img
                        src={activeProduct.images?.[0] || activeProduct.image}
                        alt={activeProduct.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover/img:scale-108"
                      />
                      {activeProduct.category && (
                        <span className="absolute bottom-3 left-3 rounded-full bg-black text-[#FDE047] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-md">
                          {activeProduct.category}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3
                            onClick={() => navigate(`/product/${activeProduct.id}`)}
                            className="font-black text-lg sm:text-xl text-black hover:underline cursor-pointer truncate"
                          >
                            {activeProduct.name}
                          </h3>
                          <p className="text-xs text-black/70 line-clamp-1 mt-0.5 font-medium">
                            {activeProduct.description || "Limited edition drop ready for instant delivery."}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xl sm:text-2xl font-black text-black block">
                            {formatPrice(activeProduct.price, settings.currency, settings.currencyLocale)}
                          </span>
                        </div>
                      </div>

                      {/* Pill Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={(e) => handleAddSlideProduct(e, activeProduct)}
                          disabled={addingSlideId === activeProduct.id}
                          className={`flex-1 h-12 rounded-full font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                            isDarkHero
                              ? "bg-white text-black hover:bg-slate-100"
                              : "bg-black text-white hover:bg-neutral-900"
                          }`}
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
                          className={`h-12 px-5 rounded-full font-bold text-xs border active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                            isDarkHero
                              ? "bg-white/10 text-white border-white/20 hover:bg-white/20"
                              : "bg-white text-black border-black/20 hover:bg-black/5"
                          }`}
                        >
                          <span>Details</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Indicator Dots */}
                  {recentProducts.length > 1 && (
                    <div className="flex items-center justify-center gap-1.5 pt-4 mt-2 border-t border-black/10">
                      {recentProducts.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setCurrentSlide(idx)}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            idx === currentSlide
                              ? "w-7 bg-black"
                              : "w-2 bg-black/20 hover:bg-black/40"
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

      {/* ── 2. TRENDING HORIZONTAL REEL ─────────────────────── */}
      {products.length > 4 && (
        <section className="py-12 border-b border-slate-200/80 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    TRENDING RIGHT NOW
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Curated high-velocity staples moving fast</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollTrending("left")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 dark:border-white/20 bg-white/80 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-white transition-all cursor-pointer active:scale-90 shadow-2xs"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scrollTrending("right")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 dark:border-white/20 bg-white/80 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-white transition-all cursor-pointer active:scale-90 shadow-2xs"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Sliding Reel: Frosted Glass Cards (260px) */}
            <div
              ref={trendingRowRef}
              className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth scrollbar-none"
            >
              {products.slice(0, 8).map((product) => (
                <div
                  key={product.id}
                  className="shrink-0 snap-start w-[240px] sm:w-[260px] md:w-[280px] rounded-[32px] border border-slate-200/80 dark:border-white/15 bg-white/90 dark:bg-white/[0.06] backdrop-blur-2xl p-2 hover:border-primary hover:shadow-[0_0_35px_rgba(37,99,235,0.25)] transition-all duration-300 shadow-sm"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 3. CATALOG COMMAND BAR (Sort & Results) ─────────────────────────── */}
      <section id="store-catalog" className="mx-auto max-w-7xl px-4 pt-12 pb-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-white/10 pb-6">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              PRODUCT CATALOG
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">
              Showing {filteredProducts.length} of {products.length} products
              {selectedCategory !== "all" && ` in "${selectedCategory}"`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input in Catalog */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-400" />
              <input
                type="text"
                placeholder="Filter catalog..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 text-xs h-10 rounded-full border border-slate-200/90 dark:border-white/20 bg-white/90 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-400 hidden sm:block" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-10 rounded-full border border-slate-200/90 dark:border-white/20 bg-white dark:bg-[#171717] px-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer shadow-2xs"
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
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Active:</span>
            {selectedCategory !== "all" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3.5 py-1 text-xs font-black shadow-xs">
                Category: {selectedCategory}
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="hover:opacity-70 cursor-pointer ml-1"
                >
                  ✕
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black px-3.5 py-1 text-xs font-black shadow-xs">
                Query: &quot;{searchQuery}&quot;
                <button
                  onClick={() => handleSearchChange("")}
                  className="hover:opacity-70 cursor-pointer ml-1"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedCategory("all");
                handleSearchChange("");
              }}
              className="text-xs text-primary font-bold hover:underline ml-2 cursor-pointer"
            >
              Reset All
            </button>
          </div>
        )}
      </section>

      {/* ── 4. FROSTED GLASS CATALOG GRID ───────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {filteredProducts.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 dark:border-white/20 bg-slate-100/50 dark:bg-white/[0.03] p-12 text-center my-6">
            <Package className="mx-auto h-12 w-12 text-slate-400 dark:text-zinc-500 mb-3 opacity-60" />
            <h3 className="text-lg font-black text-slate-900 dark:text-white">NO PRODUCTS FOUND</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto font-medium">
              We couldn&apos;t find any items matching your active search or filter. Try clearing filters.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("all");
                handleSearchChange("");
              }}
              className="mt-5 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-black text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg shadow-primary/20"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-white/[0.04] backdrop-blur-2xl p-2 hover:border-primary hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] transition-all duration-300 shadow-sm"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 5. STORE TRUST STRIP ─────────────────────────────────────────── */}
      <section className="border-t border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-[#121212] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-4 p-5 rounded-[28px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Express Dispatch</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Complimentary free shipping over {settings.currency}{settings.freeDeliveryAbove}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-[28px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Secure Protocol</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  256-bit encrypted checkout with live order tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-[28px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Fluid Returns</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  7-day hassle-free replacement guarantee.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-[28px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl shadow-xs">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Always Online</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Dedicated customer service on standby for any order questions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. VIP FLUID NEWSLETTER ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[40px] border border-slate-200/80 dark:border-white/15 bg-gradient-to-r from-amber-100/60 via-yellow-50/80 to-amber-200/50 dark:from-[#171717] dark:to-[#262626] p-8 sm:p-12 lg:flex lg:items-center lg:justify-between shadow-xl">
          <div className="max-w-xl space-y-3">
            <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 shadow-xs">
              INSIDER ACCESS
            </span>
            <h3 className="text-3xl font-black tracking-tight sm:text-4xl text-slate-900 dark:text-white">
              UNLOCK 20% OFF YOUR NEXT DROP
            </h3>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">
              Join the fluid circle for secret vault releases, member discounts, and instant priority dispatch.
            </p>
          </div>

          <div className="mt-6 lg:mt-0 lg:ml-8 shrink-0 w-full sm:w-auto">
            {subscribed ? (
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span>You&apos;re in! Use code <strong>FLUID20</strong> at checkout.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-400" />
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email..."
                    className="w-full sm:w-72 h-12 pl-11 pr-4 rounded-full border border-slate-300 dark:border-white/20 bg-white/90 dark:bg-black/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-7 rounded-full bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>JOIN NOW</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
