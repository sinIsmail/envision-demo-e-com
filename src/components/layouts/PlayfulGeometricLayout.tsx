import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { addToLocalCart } from "@/lib/cartStrorage";
import { formatPrice } from "@/lib/themeUtils";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/fb";
import { toast } from "@/components/ui/toast";
import {
  Search,
  ShoppingCart,
  Scale,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  Truck,
  Star,
  CheckCircle2,
  Mail,
  ArrowUpDown,
  Tag,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import type { Product } from "@/types/product";

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "in-stock";

export function PlayfulGeometricLayout({ products }: { products: Product[] }) {
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>(urlQuery);
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [addingSlideId, setAddingSlideId] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

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

  // Dynamic filter and sort products
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
      if (sortBy === "price-asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price-desc") return Number(b.price) - Number(a.price);
      if (sortBy === "rating") return (b.avgRating ?? 0) - (a.avgRating ?? 0);
      if (sortBy === "in-stock") {
        const aStock = a.hasVariants ? (a.unitVariants?.some((v) => (v.stock ?? 0) > 0) ? 1 : 0) : a.stock;
        const bStock = b.hasVariants ? (b.unitVariants?.some((v) => (v.stock ?? 0) > 0) ? 1 : 0) : b.stock;
        return (bStock > 0 ? 1 : 0) - (aStock > 0 ? 1 : 0);
      }
      return 0;
    });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Spotlight carousel items (first 5 products)
  const spotlightProducts = useMemo(() => products.slice(0, 5), [products]);
  const activeSlideProduct = spotlightProducts[currentSlide] || products[0];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.max(1, spotlightProducts.length));
  };
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + spotlightProducts.length) % Math.max(1, spotlightProducts.length));
  };

  // Add to cart handler with tactile feedback
  const handleAddToCart = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (product.hasVariants && product.unitVariants && product.unitVariants.length > 0) {
      navigate(`/product/${product.id}`);
      return;
    }

    setAddingSlideId(product.id);
    if (!user) {
      addToLocalCart(product.id);
      toast.add({ title: "Added to Bag! ★", description: `${product.name} is in your bag.` });
      setAddingSlideId(null);
      return;
    }

    try {
      const cartRef = collection(db, "cart", user.uid, "items");
      const snap = await getDocs(cartRef);
      const existingDoc = snap.docs.find((d) => {
        const data = d.data();
        const pId = String(data.productId ?? data.productid ?? d.id);
        return pId === product.id && !data.variantLabel;
      });

      if (existingDoc) {
        await updateDoc(doc(db, "cart", user.uid, "items", existingDoc.id), {
          quantity: (Number(existingDoc.data().quantity) || 0) + 1,
          productId: product.id,
          productid: product.id,
        });
        toast.add({ title: "Bag Updated! ★", description: "Quantity increased by 1." });
      } else {
        const mainImg = product.images?.[0] ?? product.image;
        await addDoc(cartRef, {
          productId: product.id,
          productid: product.id,
          name: product.name,
          price: Number(product.price),
          image: mainImg,
          quantity: 1,
        });
        toast.add({ title: "Added to Bag! ★", description: `${product.name} added.` });
      }
    } catch (err) {
      console.error(err);
      toast.add({ title: "Error", description: "Could not add item to bag." });
    } finally {
      setAddingSlideId(null);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    toast.add({
      title: "VIP Pop Club Unlocked! ★",
      description: "Use code POP20 for 20% off your order.",
    });
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-[#1E293B] antialiased selection:bg-[#F472B6] selection:text-white relative overflow-hidden bg-dot-matrix">
      
      {/* ── 1. ASYMMETRIC MEMPHIS PLAYGROUND HERO ─────────────────────────── */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24 border-b-2 border-[#1E293B]">
        {/* Playful Floating Memphis Shapes */}
        <div className="absolute top-8 left-8 w-12 h-12 rounded-full border-2 border-[#1E293B] bg-[#F472B6] opacity-80 pointer-events-none hidden sm:block animate-bounce duration-1000" />
        <div className="absolute top-24 right-16 w-8 h-8 rotate-45 border-2 border-[#1E293B] bg-[#FBBF24] opacity-80 pointer-events-none hidden sm:block" />
        <div className="absolute bottom-10 left-1/3 w-10 h-10 rounded-full border-2 border-[#1E293B] bg-[#34D399] opacity-75 pointer-events-none hidden md:block" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left Column: Bold Typography & Candy CTAs */}
            <div className="space-y-6 lg:col-span-7">
              {/* Limited Edition Stamp Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#1E293B] bg-[#FBBF24] px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#1E293B] shadow-pop-sm">
                <Sparkles className="h-4 w-4 fill-[#1E293B] text-[#1E293B]" />
                <span>{settings.brandName || "Pop Editions"} · Curated Direct Drops</span>
              </div>

              {/* Massive Headline with Yellow Marker Highlight */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-[#1E293B]">
                <span>Pure Joy in </span>
                <span className="relative inline-block px-2">
                  <span className="relative z-10 text-[#1E293B]">Every Single</span>
                  <span className="absolute inset-x-0 bottom-1 sm:bottom-2 h-4 sm:h-6 bg-[#FBBF24] -rotate-1 rounded-sm z-0" />
                </span>
                <br />
                <span className="text-[#8B5CF6]">
                  {settings.heroTitle || "Fresh Sourced Drop."}
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-[#64748B] max-w-xl font-medium leading-relaxed">
                {settings.heroSubtitle ||
                  "Zero boring corporate design. Honest pricing, transparent sourcing, and delightfully rapid delivery right to your door."}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("playful-catalog")?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="btn-candy h-13 px-8 rounded-full font-black text-sm uppercase tracking-wide bg-[#8B5CF6] text-white border-2 border-[#1E293B] flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore Items ({products.length})</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                {categoriesData.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("playful-categories")?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="h-13 px-7 rounded-full font-bold text-sm bg-white text-[#1E293B] border-2 border-[#1E293B] shadow-pop-sm hover:bg-[#FBBF24] hover:shadow-pop transition-all cursor-pointer"
                  >
                    Categories ({categoriesData.length})
                  </button>
                )}
              </div>

              {/* Customer Guarantee Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-[#1E293B]">
                <div className="flex items-center gap-1.5 bg-white border-2 border-[#1E293B] px-3 py-1.5 rounded-full shadow-pop-sm">
                  <Zap className="h-3.5 w-3.5 text-[#8B5CF6]" />
                  <span>Rapid Dispatch</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white border-2 border-[#1E293B] px-3 py-1.5 rounded-full shadow-pop-sm">
                  <Shield className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>100% Genuine</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white border-2 border-[#1E293B] px-3 py-1.5 rounded-full shadow-pop-sm">
                  <Truck className="h-3.5 w-3.5 text-[#F472B6]" />
                  <span>Free over {settings.currency}{settings.freeDeliveryAbove}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Arched Showcase Frame & Interactive Spotlight Slider */}
            {activeSlideProduct && (
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-md relative">
                  
                  {/* Floating Rotated Star Badge */}
                  <div className="absolute -top-4 -right-3 z-20 rotate-12 bg-[#FBBF24] text-[#1E293B] font-black text-xs uppercase px-3.5 py-1.5 rounded-full border-2 border-[#1E293B] shadow-pop-sm">
                    ★ POP CHOICE
                  </div>

                  {/* Arched Showcase Card */}
                  <div className="rounded-t-full rounded-b-[36px] border-2 border-[#1E293B] bg-white p-5 sm:p-7 shadow-pop-pink relative overflow-hidden space-y-4">
                    
                    {/* Top Slider Navigation & Counter */}
                    <div className="flex items-center justify-between pt-4 px-2">
                      <span className="text-xs font-mono font-black text-[#1E293B] bg-[#F1F5F9] px-2.5 py-1 rounded-full border border-[#1E293B]/20">
                        0{currentSlide + 1} / 0{Math.max(1, spotlightProducts.length)}
                      </span>
                      {spotlightProducts.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={prevSlide}
                            className="h-8 w-8 rounded-full border-2 border-[#1E293B] bg-white flex items-center justify-center hover:bg-[#FBBF24] active:scale-95 transition-all cursor-pointer shadow-pop-sm"
                            aria-label="Previous product"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={nextSlide}
                            className="h-8 w-8 rounded-full border-2 border-[#1E293B] bg-white flex items-center justify-center hover:bg-[#FBBF24] active:scale-95 transition-all cursor-pointer shadow-pop-sm"
                            aria-label="Next product"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Product Photo Canvas */}
                    <div
                      onClick={() => navigate(`/product/${activeSlideProduct.id}`)}
                      className="relative aspect-square w-full rounded-full border-2 border-[#1E293B] bg-[#FFFDF5] p-6 flex items-center justify-center cursor-pointer group shadow-inner"
                    >
                      <img
                        src={activeSlideProduct.images?.[0] || activeSlideProduct.image}
                        alt={activeSlideProduct.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110"
                      />
                      {activeSlideProduct.category && (
                        <span className="absolute bottom-4 rounded-full bg-[#1E293B] text-white px-3 py-0.5 text-[10px] font-black uppercase tracking-wider">
                          {activeSlideProduct.category}
                        </span>
                      )}
                    </div>

                    {/* Product Meta & Candy Action */}
                    <div className="space-y-3 pt-2 text-center">
                      <div>
                        <h3
                          onClick={() => navigate(`/product/${activeSlideProduct.id}`)}
                          className="font-extrabold text-lg sm:text-xl text-[#1E293B] hover:text-[#8B5CF6] transition-colors cursor-pointer truncate"
                        >
                          {activeSlideProduct.name}
                        </h3>
                        <p className="text-xl sm:text-2xl font-black text-[#1E293B] mt-1">
                          {formatPrice(activeSlideProduct.price, settings.currency, settings.currencyLocale)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(e, activeSlideProduct)}
                          disabled={addingSlideId === activeSlideProduct.id}
                          className="btn-candy flex-1 h-12 rounded-full font-black text-xs sm:text-sm uppercase tracking-wide bg-[#8B5CF6] text-white border-2 border-[#1E293B] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {activeSlideProduct.hasVariants ? (
                            <>
                              <Scale className="h-4 w-4" />
                              <span>Select Size</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-4 w-4" />
                              <span>{addingSlideId === activeSlideProduct.id ? "Adding..." : "Add to Bag"}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/product/${activeSlideProduct.id}`)}
                          className="h-12 w-12 rounded-full border-2 border-[#1E293B] bg-white flex items-center justify-center hover:bg-[#FBBF24] transition-all shadow-pop-sm cursor-pointer shrink-0"
                          aria-label="View product details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ── 2. DYNAMIC CATEGORY STICKER BENTO ─────────────────────────────── */}
      {categoriesData.length > 0 && (
        <section id="playful-categories" className="py-12 px-4 sm:px-6 border-b-2 border-[#1E293B] bg-white">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-[#8B5CF6]">
                  ★ THE COLLECTION VAULT
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-[#1E293B] tracking-tight">
                  Browse by Category
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-[#F472B6] text-white px-3.5 py-1 text-xs font-black border-2 border-[#1E293B] shadow-pop-sm">
                {categoriesData.length} Collections
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categoriesData.map((cat, idx) => {
                const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                const colors = [
                  "bg-[#FBBF24]", // yellow
                  "bg-[#F472B6]", // pink
                  "bg-[#34D399]", // mint
                  "bg-[#8B5CF6]", // violet
                ];
                const badgeColor = colors[idx % colors.length];

                return (
                  <div
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(isSelected ? "all" : cat.name);
                      document.getElementById("playful-catalog")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`card-sticker relative overflow-hidden rounded-tl-3xl rounded-tr-xl rounded-br-3xl rounded-bl-xl border-2 border-[#1E293B] cursor-pointer aspect-16/10 flex flex-col justify-end p-4 ${
                      isSelected
                        ? "bg-[#FFFDF5] ring-4 ring-[#8B5CF6] shadow-pop-lg"
                        : "bg-white hover:bg-[#FFFDF5]"
                    }`}
                  >
                    {/* Product Photo Backdrop */}
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-30 group-hover:opacity-50"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#F1F5F9]" />
                    )}

                    <div className="relative z-10 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-[#1E293B] ${badgeColor} text-[#1E293B]`}>
                          0{idx + 1}
                        </span>
                        <span className="text-[11px] font-bold text-[#1E293B] bg-white/90 px-2 py-0.5 rounded-full border border-[#1E293B]/20">
                          {cat.count} {cat.count === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base sm:text-lg capitalize text-[#1E293B] truncate drop-shadow-xs">
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

      {/* ── 3. NEO-BRUTALIST LIVE SEARCH & CATALOG HUD ─────────────────────── */}
      <section id="playful-catalog" className="py-14 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-8">
          
          {/* Header, Search & Sort */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white p-6 rounded-3xl border-2 border-[#1E293B] shadow-pop">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#8B5CF6] mb-1">
                <span className="h-2 w-2 rounded-full bg-[#8B5CF6] animate-ping" />
                Live Pop Catalog
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-[#1E293B] tracking-tight">
                {selectedCategory === "all" ? "Available Drops" : selectedCategory}
              </h2>
            </div>

            {/* Search Input & Sort Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-11 pr-9 h-12 rounded-full text-xs font-bold bg-[#FFFDF5] border-2 border-[#1E293B] text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none focus:shadow-pop-violet transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748B] hover:text-[#1E293B]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 border-2 border-[#1E293B] rounded-full px-4 h-12 bg-[#FFFDF5] text-xs font-black text-[#1E293B] shadow-pop-sm">
                <ArrowUpDown className="h-4 w-4 text-[#8B5CF6] shrink-0" />
                <span className="text-[#64748B] uppercase">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent border-none text-xs font-bold text-[#1E293B] focus:outline-none cursor-pointer pr-1"
                >
                  <option value="featured">Featured Drops</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="in-stock">In Stock First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Filter Candy Pills */}
          {categoriesData.length > 0 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              <span className="text-xs font-black text-[#1E293B] shrink-0 flex items-center gap-1 mr-1 uppercase">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#8B5CF6]" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-full px-5 py-2 text-xs font-black uppercase transition-all shrink-0 border-2 border-[#1E293B] cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-[#8B5CF6] text-white shadow-pop-sm -translate-y-0.5"
                    : "bg-white text-[#1E293B] hover:bg-[#FFFDF5]"
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
                    className={`rounded-full px-5 py-2 text-xs font-black capitalize transition-all shrink-0 border-2 border-[#1E293B] cursor-pointer ${
                      isSelected
                        ? "bg-[#8B5CF6] text-white shadow-pop-sm -translate-y-0.5"
                        : "bg-white text-[#1E293B] hover:bg-[#FFFDF5]"
                    }`}
                  >
                    {managed?.emoji ? `${managed.emoji} ` : ""}{cat.name} ({cat.count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Category Banner */}
          {selectedCategory !== "all" && (
            <div className="flex items-center justify-between rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] px-5 py-3 text-xs font-bold shadow-pop-sm">
              <span className="flex items-center gap-2 text-[#1E293B]">
                <Tag className="h-4 w-4 text-[#8B5CF6]" />
                Viewing category: <strong className="capitalize text-[#8B5CF6]">{selectedCategory}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="text-xs font-bold text-[#8B5CF6] hover:underline"
              >
                Show all products
              </button>
            </div>
          )}

          {/* Product Grid (Sticker Cards) */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((p) => {
                const outOfStock =
                  p.hasVariants && p.unitVariants && p.unitVariants.length > 0
                    ? !p.unitVariants.some((v) => v.enabled !== false && (v.stock ?? 0) > 0)
                    : p.stock <= 0;
                const mainImg = p.images?.[0] ?? p.image;

                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/product/${p.id}`)}
                    className="card-sticker group flex flex-col overflow-hidden rounded-2xl border-2 border-[#1E293B] bg-white cursor-pointer relative"
                  >
                    {/* Image Canvas */}
                    <div className="relative aspect-square overflow-hidden bg-[#FFFDF5] p-4 flex items-center justify-center border-b-2 border-[#1E293B]">
                      <img
                        src={mainImg}
                        alt={p.name}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-108"
                        loading="lazy"
                      />

                      {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs">
                          <span className="rounded-full bg-[#1E293B] text-white px-3 py-1 text-xs font-black uppercase">
                            Sold Out
                          </span>
                        </div>
                      )}

                      {!outOfStock && p.category && (
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-[#FBBF24] text-[#1E293B] border border-[#1E293B] px-2 py-0.5 text-[10px] font-black uppercase">
                          {p.category}
                        </span>
                      )}

                      {!outOfStock && p.hasVariants && (p.unitVariants?.length ?? 0) > 0 && (
                        <span className="absolute top-2.5 right-2.5 rounded-full bg-[#34D399] text-[#1E293B] border border-[#1E293B] px-2 py-0.5 text-[10px] font-black">
                          {p.unitVariants?.length} Sizes
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-2 text-xs sm:text-sm font-bold leading-snug text-[#1E293B] group-hover:text-[#8B5CF6] transition-colors min-h-[2.4rem]">
                        {p.name}
                      </h3>

                      <div className="mt-auto pt-2 flex items-baseline justify-between">
                        <span className="text-base sm:text-lg font-black text-[#1E293B]">
                          {formatPrice(p.price, settings.currency, settings.currencyLocale)}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#FBBF24]">
                          <Star className="h-3 w-3 fill-[#FBBF24] text-[#FBBF24]" />
                          <span className="text-[#1E293B]">{p.avgRating ? p.avgRating.toFixed(1) : "5.0"}</span>
                        </div>
                      </div>

                      {/* Candy CTA Button */}
                      <button
                        type="button"
                        disabled={outOfStock}
                        onClick={(e) => handleAddToCart(e, p)}
                        className={`btn-candy mt-3 w-full h-10 rounded-full font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 border-2 border-[#1E293B] cursor-pointer disabled:opacity-50 ${
                          outOfStock
                            ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed"
                            : "bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                        }`}
                      >
                        {p.hasVariants ? (
                          <>
                            <Scale className="h-3.5 w-3.5" />
                            <span>Select Size</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>{outOfStock ? "Sold Out" : "Add to Bag"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-[#1E293B] p-12 text-center space-y-3 bg-white">
              <p className="text-lg font-black text-[#1E293B]">No drops found</p>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                {searchQuery
                  ? `No items matching "${searchQuery}". Try a different keyword.`
                  : `No products currently available under "${selectedCategory}".`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="btn-candy text-xs font-bold px-6 py-2.5 mt-2 rounded-full border-2 border-[#1E293B] bg-[#FBBF24] text-[#1E293B]"
              >
                Reset Filters
              </button>
            </div>
          )}

        </div>
      </section>

      {/* ── 4. CONNECTED MEMPHIS PERKS TRAIL ──────────────────────────────── */}
      <section className="py-14 px-4 sm:px-6 border-y-2 border-[#1E293B] bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <span className="text-xs font-black uppercase tracking-widest text-[#8B5CF6]">
              ★ BUILT ON TRUST
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase text-[#1E293B]">
              The Pop Guarantee
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] shadow-pop text-center space-y-2">
              <div className="h-12 w-12 rounded-full border-2 border-[#1E293B] bg-[#8B5CF6] text-white flex items-center justify-center mx-auto shadow-pop-sm">
                <Zap className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-sm uppercase text-[#1E293B]">Rapid Dispatch</h4>
              <p className="text-xs text-[#64748B] font-medium">Orders packaged within 24 hours.</p>
            </div>

            <div className="p-5 rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] shadow-pop text-center space-y-2">
              <div className="h-12 w-12 rounded-full border-2 border-[#1E293B] bg-[#34D399] text-[#1E293B] flex items-center justify-center mx-auto shadow-pop-sm">
                <Shield className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-sm uppercase text-[#1E293B]">100% Genuine</h4>
              <p className="text-xs text-[#64748B] font-medium">Direct sourcing from authentic makers.</p>
            </div>

            <div className="p-5 rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] shadow-pop text-center space-y-2">
              <div className="h-12 w-12 rounded-full border-2 border-[#1E293B] bg-[#F472B6] text-white flex items-center justify-center mx-auto shadow-pop-sm">
                <Truck className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-sm uppercase text-[#1E293B]">Free Delivery</h4>
              <p className="text-xs text-[#64748B] font-medium">On all orders above {settings.currency}{settings.freeDeliveryAbove}.</p>
            </div>

            <div className="p-5 rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] shadow-pop text-center space-y-2">
              <div className="h-12 w-12 rounded-full border-2 border-[#1E293B] bg-[#FBBF24] text-[#1E293B] flex items-center justify-center mx-auto shadow-pop-sm">
                <Star className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-sm uppercase text-[#1E293B]">Direct Support</h4>
              <p className="text-xs text-[#64748B] font-medium">Human customer care on standby.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. VIP POP CLUB (NEWSLETTER) ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-[36px] border-2 border-[#1E293B] bg-[#FBBF24] p-8 sm:p-12 lg:flex lg:items-center lg:justify-between shadow-pop-xl">
          
          {/* Rotated Stamp Badge */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 rotate-[-6deg] bg-white border-2 border-[#1E293B] px-4 py-1.5 rounded-full shadow-pop-sm font-black text-xs uppercase text-[#1E293B]">
            ★ VIP 20% OFF STAMP
          </div>

          <div className="max-w-xl space-y-3">
            <span className="rounded-full bg-white text-[#1E293B] border-2 border-[#1E293B] text-[10px] font-black uppercase tracking-widest px-3 py-1 shadow-pop-sm">
              MEMBER ACCESS
            </span>
            <h3 className="text-3xl font-black tracking-tight sm:text-4xl text-[#1E293B]">
              UNLOCK 20% OFF YOUR NEXT DROP
            </h3>
            <p className="text-sm text-[#1E293B]/80 font-bold leading-relaxed">
              Join the Pop Club for exclusive early access to drops, secret discount vouchers, and direct order tracking.
            </p>
          </div>

          <div className="mt-6 lg:mt-0 lg:ml-8 shrink-0 w-full sm:w-auto">
            {subscribed ? (
              <div className="flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm text-[#1E293B] border-2 border-[#1E293B] font-black shadow-pop-sm">
                <CheckCircle2 className="h-5 w-5 text-[#34D399]" />
                <span>You&apos;re in! Use code <strong>POP20</strong> at checkout.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email..."
                    className="w-full sm:w-72 h-13 pl-11 pr-4 rounded-full border-2 border-[#1E293B] bg-white text-[#1E293B] placeholder:text-[#94A3B8] text-xs font-bold focus:outline-none focus:shadow-pop-violet"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn-candy h-13 px-8 rounded-full bg-[#8B5CF6] text-white border-2 border-[#1E293B] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>JOIN CLUB</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── 6. POP MINIMAL FOOTER ─────────────────────────────────────────── */}
      <footer className="py-10 px-4 sm:px-6 border-t-2 border-[#1E293B] bg-white">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono font-bold text-[#64748B]">
          <div className="flex items-center gap-2 text-[#1E293B]">
            <span className="h-3 w-3 rounded-full border border-[#1E293B] bg-[#8B5CF6]" />
            <span>{settings.brandName || "Shop."}</span>
            <span className="text-[#94A3B8]">· Playful Geometric Engine & Secure Checkout</span>
          </div>
          <p>{settings.footerText || `© ${new Date().getFullYear()} ${settings.brandName || "Shop."}. All rights reserved.`}</p>
        </div>
      </footer>
    </div>
  );
}
