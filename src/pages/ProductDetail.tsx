import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  doc, getDoc, collection, addDoc, getDocs, updateDoc,
  onSnapshot, serverTimestamp, runTransaction, query, where, limit,
} from "firebase/firestore"
import { db } from "@/firebase/fb"
import { useAuth } from "@/context/AuthContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { addToLocalCart } from "@/lib/cartStrorage"
import Navbar from "@/components/Navbar"
import ProductCard from "@/pages/ProductHomeList"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { StarRating } from "@/components/StarRating"
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  ChevronLeft,
  ChevronRight,
  Send,
  Trash2,
  Scale,
  Sparkles,
  Truck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
} from "lucide-react"
import { type Product, type UnitVariant, getMaxVariant } from "@/types/product"
import type { Review } from "@/types/review"
import { formatPrice } from "@/lib/themeUtils"

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { settings } = useSiteSettings()

  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<UnitVariant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [notFound, setNotFound] = useState(false)

  // Image gallery
  const [activeImg, setActiveImg] = useState(0)
  const thumbRef = useRef<HTMLDivElement>(null)

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([])
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Related products from same category
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }
    const fetchProduct = async () => {
      try {
        const snap = await getDoc(doc(db, "products", id))
        if (snap.exists()) {
          const data = snap.data() as Product
          const images = data.images?.length ? data.images : data.image ? [data.image] : []
          const p = { ...data, id: snap.id, images }
          setProduct(p)
          if (p.hasVariants && p.unitVariants && p.unitVariants.length > 0) {
            if (settings.showMaxVariantOnly) {
              const maxV = getMaxVariant(p.unitVariants, true) || getMaxVariant(p.unitVariants);
              setSelectedVariant(maxV || p.unitVariants[p.unitVariants.length - 1]);
            } else {
              const firstInStock = p.unitVariants.find(
                (v) => v.enabled !== false && (v.stock ?? 0) > 0
              );
              const firstEnabled = p.unitVariants.find((v) => v.enabled !== false);
              setSelectedVariant(firstInStock || firstEnabled || p.unitVariants[0]);
            }
          } else {
            setSelectedVariant(null);
          }
        } else {
          setNotFound(true)
        }
      } catch (err) {
        console.error(err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  // Real-time reviews listener
  useEffect(() => {
    if (!id) return
    const reviewsRef = collection(db, "products", id, "reviews")
    const unsubscribe = onSnapshot(reviewsRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review))
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      setReviews(data)
    })
    return unsubscribe
  }, [id])

  // Fetch related products strictly if product has a category
  useEffect(() => {
    const cat = product?.category?.trim()
    if (!cat || !product?.id) {
      setRelatedProducts([])
      return
    }
    const fetchRelated = async () => {
      try {
        const q = query(
          collection(db, "products"),
          where("category", "==", cat),
          limit(6)
        )
        const snap = await getDocs(q)
        const items = snap.docs
          .map((d) => ({ ...(d.data() as Product), id: d.id }))
          .filter((p) => p.id !== product.id)
          .slice(0, 4)
        setRelatedProducts(items)
      } catch (err) {
        console.error("Error fetching related products:", err)
      }
    }
    fetchRelated()
  }, [product?.id, product?.category])

  const effectivePrice = selectedVariant ? selectedVariant.price : Number(product?.price ?? 0)
  // Out-of-stock: for variant products check selected variant's stock, else check product.stock
  const selectedVariantStock = selectedVariant?.stock ?? 0
  const outOfStockForVariant = product?.hasVariants
    ? selectedVariant
      ? selectedVariantStock <= 0 || selectedVariant.enabled === false
      : true
    : false

  const cartHandler = async () => {
    if (!product) return
    setAdding(true)
    try {
      const variantLabel = selectedVariant?.label
      const itemPrice = effectivePrice
      const addCount = Math.max(1, quantity)

      if (!user) {
        addToLocalCart(product.id, variantLabel, itemPrice, addCount)
        toast.add({
          title: "Added to cart ✓",
          description: `${product.name}${variantLabel ? ` (${variantLabel})` : ""} × ${addCount} added.`,
        })
        return
      }

      const cartRef = collection(db, "cart", user.uid, "items")
      const snap = await getDocs(cartRef)
      const existingDoc = snap.docs.find((d) => {
        const data = d.data()
        const pId = String(data.productId ?? data.productid ?? d.id)
        const vLabel = data.variantLabel ? String(data.variantLabel) : undefined
        return pId === product.id && vLabel === variantLabel
      })

      if (existingDoc) {
        await updateDoc(doc(db, "cart", user.uid, "items", existingDoc.id), {
          quantity: (Number(existingDoc.data().quantity) || 0) + addCount,
          productId: product.id,
          productid: product.id,
        })
        toast.add({ title: "Cart updated", description: `Quantity increased by ${addCount}.` })
      } else {
        await addDoc(cartRef, {
          productId: product.id,
          productid: product.id,
          name: product.name,
          price: itemPrice,
          image: product.images?.[0] ?? product.image,
          quantity: addCount,
          ...(variantLabel && { variantLabel }),
        })
        toast.add({
          title: "Added to cart ✓",
          description: `${product.name}${variantLabel ? ` (${variantLabel})` : ""} × ${addCount} added.`,
        })
      }
    } catch (err) {
      console.error(err)
      toast.add({ title: "Error", description: "Could not add to cart." })
    } finally {
      setAdding(false)
    }
  }


  const submitReview = async () => {
    if (!user) { toast.add({ title: "Sign in required", description: "Please log in to leave a review." }); return }
    if (myRating === 0) { toast.add({ title: "Select a rating", description: "Please choose 1–5 stars." }); return }
    if (!id) return
    setSubmitting(true)
    try {
      const reviewsRef = collection(db, "products", id, "reviews")
      const productRef = doc(db, "products", id)

      await runTransaction(db, async (tx) => {
        const productSnap = await tx.get(productRef)
        if (!productSnap.exists()) throw new Error("Product not found")
        const pData = productSnap.data() as Product

        // Add new + update product avgRating & reviewCount
        const newCount = (pData.reviewCount ?? 0) + 1
        const newAvg = ((pData.avgRating ?? 0) * (pData.reviewCount ?? 0) + myRating) / newCount
        tx.update(productRef, { avgRating: parseFloat(newAvg.toFixed(2)), reviewCount: newCount })
        
        const newReviewRef = doc(reviewsRef)
        tx.set(newReviewRef, {
          userId: user.uid,
          userName: user.displayName ?? user.email ?? "Anonymous",
          userAvatar: user.photoURL ?? "",
          rating: myRating,
          comment: myComment,
          createdAt: serverTimestamp(),
        })
      })
      
      setMyRating(0)
      setMyComment("")
      toast.add({ title: "Review submitted!", description: "Thanks for your feedback." })
    } catch (err) {
      console.error(err)
      toast.add({ title: "Error", description: "Could not submit review." })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteSpecificReview = async (targetReviewId: string) => {
    if (!id || !user) return;
    setSubmitting(true);
    try {
      const reviewRef = doc(db, "products", id, "reviews", targetReviewId);
      const productRef = doc(db, "products", id);

      await runTransaction(db, async (tx) => {
        const productSnap = await tx.get(productRef);
        if (!productSnap.exists()) throw new Error("Product not found");
        const pData = productSnap.data() as Product;

        const oldReviewSnap = await tx.get(reviewRef);
        if (!oldReviewSnap.exists()) return;
        const oldRating = oldReviewSnap.data().rating ?? 0;
        
        const newCount = Math.max(0, (pData.reviewCount ?? 0) - 1);
        let newAvg = 0;
        if (newCount > 0) {
          const totalScore = (pData.avgRating ?? 0) * (pData.reviewCount ?? 0);
          newAvg = (totalScore - oldRating) / newCount;
        }

        tx.update(productRef, { avgRating: parseFloat(newAvg.toFixed(2)), reviewCount: newCount });
        tx.delete(reviewRef);
      });

      toast.add({ title: "Review deleted", description: "Your review has been removed." });
    } catch (err) {
      console.error(err);
      toast.add({ title: "Error", description: "Could not delete review." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </>
    )
  }

  if (notFound || !product) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <Package className="h-14 w-14 text-muted-foreground" />
          <h2 className="text-xl font-bold">Product not found</h2>
          <p className="text-sm text-muted-foreground">This product may have been removed.</p>
          <Button onClick={() => navigate("/")}>← Back to Store</Button>
        </div>
      </>
    )
  }

  const images = product.images?.length ? product.images : [product.image]
  // For variant products: out-of-stock means the selected variant has no stock.
  // For plain products: use the top-level product.stock.
  const outOfStock = product.hasVariants ? outOfStockForVariant : product.stock <= 0
  const availableStock = product.hasVariants ? selectedVariantStock : product.stock
  const avgRating = product.avgRating ?? 0
  const reviewCount = product.reviewCount ?? 0

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-8">

        {/* ── Breadcrumb & Navigation ── */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 px-3.5 py-1.5 rounded-full transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {product.category?.trim() && (
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <button onClick={() => navigate("/")} className="hover:underline">Store</button>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-200 font-semibold capitalize">{product.category}</span>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-bold truncate max-w-[160px] sm:max-w-none">{product.name}</span>
            </nav>
          )}
        </div>

        {/* ── Product Hero Grid ── */}
        <div className="grid gap-8 lg:gap-12 md:grid-cols-2 items-start">

          {/* ── LEFT: Product Visual Showcase ── */}
          <div className="space-y-4">
            {/* Main Padded Image Canvas with Fluid Frosted Glass */}
            <div className="relative overflow-hidden rounded-[32px] border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl aspect-square p-6 sm:p-10 flex items-center justify-center shadow-lg">
              <img
                src={images[activeImg]}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
              />

              {/* Out of Stock Overlay */}
              {outOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs">
                  <span className="rounded-full bg-rose-600 px-4 py-1.5 text-xs sm:text-sm font-bold text-white shadow-md">
                    Out of Stock
                  </span>
                </div>
              )}

              {/* Badges on image */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                {product.category?.trim() && (
                  <span className="rounded-full bg-black text-[#FDE047] dark:bg-[#FDE047] dark:text-black border border-black/10 dark:border-white/10 backdrop-blur-md px-3.5 py-1 text-[11px] font-extrabold tracking-wider uppercase shadow-md">
                    {product.category}
                  </span>
                )}
              </div>

              {/* Prev/Next arrows for multiple images */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg((i) => Math.max(0, i - 1))}
                    disabled={activeImg === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-zinc-800/90 text-slate-700 dark:text-slate-200 shadow-md hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setActiveImg((i) => Math.min(images.length - 1, i + 1))}
                    disabled={activeImg === images.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 dark:bg-zinc-800/90 text-slate-700 dark:text-slate-200 shadow-md hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div
                ref={thumbRef}
                className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin pt-1"
              >
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`shrink-0 h-16 w-16 sm:h-18 sm:w-18 overflow-hidden rounded-2xl border-2 p-1.5 bg-white dark:bg-zinc-900 transition-all ${
                      i === activeImg
                        ? "border-[#FDE047] ring-2 ring-[#FDE047]/30 scale-102 shadow-xs"
                        : "border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100 hover:border-slate-400"
                    }`}
                  >
                    <img src={url} alt={`View ${i + 1}`} className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Store Trust Perks */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="flex flex-col items-center text-center p-3.5 rounded-[22px] border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xs">
                <Truck className="h-4 w-4 text-[#eab308] mb-1" />
                <span className="text-[11px] font-bold text-slate-900 dark:text-white">Express Delivery</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Free above ₹{settings.freeDeliveryAbove}</span>
              </div>
              <div className="flex flex-col items-center text-center p-3.5 rounded-[22px] border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-500 mb-1" />
                <span className="text-[11px] font-bold text-slate-900 dark:text-white">Quality Checked</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">100% Genuine Item</span>
              </div>
              <div className="flex flex-col items-center text-center p-3.5 rounded-[22px] border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xs">
                <RotateCcw className="h-4 w-4 text-amber-500 mb-1" />
                <span className="text-[11px] font-bold text-slate-900 dark:text-white">Easy Returns</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Hassle-free replacement</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Commerce & Action Panel ── */}
          <div className="flex flex-col gap-4">

            {/* Header info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {product.category?.trim() && (
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {product.category}
                  </span>
                )}
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {outOfStock ? "Out of Stock" : "In Stock & Ready to Dispatch"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {product.name}
              </h1>

              {/* Stars & Reviews */}
              <div className="flex items-center gap-2 pt-0.5">
                <StarRating value={avgRating} size="sm" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  {avgRating > 0 ? avgRating.toFixed(1) : "5.0"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({reviewCount} customer {reviewCount === 1 ? "review" : "reviews"})
                </span>
              </div>
            </div>

            {/* Price Hero Glass Card */}
            <div className="rounded-[32px] border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl p-5 sm:p-6 flex items-baseline justify-between flex-wrap gap-2 shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1">
                  Special Price
                </span>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {formatPrice(effectivePrice, settings.currency, settings.currencyLocale)}
                  </span>
                  {selectedVariant && (
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      for {selectedVariant.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Stock Status Pill */}
              <div>
                {outOfStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Out of Stock
                  </span>
                ) : availableStock <= 5 ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Only {availableStock} left in stock!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    In Stock ({availableStock} units)
                  </span>
                )}
              </div>
            </div>

            {/* Unit / Weight Variant Selector */}
            {product.hasVariants && product.unitVariants && product.unitVariants.length > 0 && (() => {
              const isMaxMode = Boolean(settings.showMaxVariantOnly);
              const maxVariant = isMaxMode ? (getMaxVariant(product.unitVariants, true) || getMaxVariant(product.unitVariants)) : null;

              return (
                <div className="space-y-3 rounded-[32px] border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-[#eab308]" />
                      Select Size / Quantity ({product.unitType})
                    </span>
                    {selectedVariant && (
                      <span className="text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-full">
                        Selected: {selectedVariant.label}
                      </span>
                    )}
                  </div>

                  {isMaxMode && maxVariant && (
                    <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-2 text-xs text-amber-900 dark:text-amber-300">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span>
                        <strong>Max size only ({maxVariant.label})</strong> is enabled by store policy.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {product.unitVariants.map((v, idx) => {
                      const isSelected = selectedVariant?.label === v.label;
                      const variantSoldOut = (v.stock ?? 0) <= 0;
                      const isAdminDisabled = v.enabled === false;
                      const isLowerTurnedOff = Boolean(isMaxMode && maxVariant && v.label !== maxVariant.label);
                      const isDisabled = variantSoldOut || isAdminDisabled || isLowerTurnedOff;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (!isDisabled) {
                              setSelectedVariant(v);
                              setQuantity(1);
                            }
                          }}
                          disabled={isDisabled}
                          className={`relative flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                            isLowerTurnedOff
                              ? "opacity-30 cursor-not-allowed border-dashed border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-800/30"
                              : variantSoldOut || isAdminDisabled
                              ? "opacity-50 cursor-not-allowed border-dashed border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-zinc-800/40"
                              : isSelected
                              ? "border-black dark:border-[#FDE047] ring-2 ring-black/10 dark:ring-[#FDE047]/20 bg-slate-50 dark:bg-white/10 shadow-xs scale-102"
                              : "border-slate-200/90 dark:border-white/10 bg-white dark:bg-zinc-900 hover:border-slate-400 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{v.label}</span>
                            {maxVariant?.label === v.label && (
                              <span className="flex h-4 items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold px-1.5 shadow-2xs">
                                MAX
                              </span>
                            )}
                          </div>

                          <span className={`text-sm font-extrabold mt-1 ${
                            isDisabled ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"
                          }`}>
                            {formatPrice(v.price, settings.currency, settings.currencyLocale)}
                          </span>

                          {isAdminDisabled || variantSoldOut ? (
                            <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                              Out of Stock
                            </span>
                          ) : isLowerTurnedOff ? (
                            <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                              Turned off
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                              {v.stock} in stock
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Quantity Stepper & Add to Cart Button */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {/* Quantity Stepper Pill */}
                <div className="flex items-center rounded-full border border-slate-200/90 dark:border-white/15 bg-white dark:bg-zinc-900 p-1 shadow-2xs">
                  <button
                    type="button"
                    disabled={quantity <= 1 || outOfStock}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors text-base font-bold active:scale-95"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-slate-900 dark:text-white">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= availableStock || outOfStock}
                    onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors text-base font-bold active:scale-95"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Tactile Pill Add to Cart CTA Button */}
                <button
                  type="button"
                  disabled={outOfStock || adding}
                  onClick={cartHandler}
                  className={`flex-1 h-13 rounded-full font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 ${
                    outOfStock
                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-zinc-700"
                      : "bg-[#0A0A0A] text-[#FDE047] hover:bg-black hover:shadow-xl dark:bg-[#FDE047] dark:text-[#0A0A0A] dark:hover:bg-[#facc15] cursor-pointer"
                  }`}
                >
                  <ShoppingCart className="h-5 w-5 shrink-0" />
                  <span>
                    {adding
                      ? "Adding to Bag..."
                      : outOfStock
                      ? "Currently Sold Out"
                      : `Add to Cart • ${formatPrice(effectivePrice * quantity, settings.currency, settings.currencyLocale)}`}
                  </span>
                </button>
              </div>

              {!user && !outOfStock && (
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  Guest checkout enabled — no account required to add items.
                </p>
              )}
            </div>

            {/* About This Product / Description Card */}
            {product.description && (
              <div className="rounded-[32px] border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl p-5 sm:p-6 space-y-2 mt-2 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  About this product
                </h3>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* ── REVIEWS SECTION ── */}
        <div className="mt-12">
          <Separator className="mb-8" />
          <h2 className="text-xl font-bold mb-6">
            Customer Reviews
            {reviewCount > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({reviewCount})
              </span>
            )}
          </h2>

          {/* Summary bar */}
          {reviewCount > 0 && (
            <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-muted/40">
              <div className="text-center">
                <p className="text-4xl font-extrabold">{avgRating.toFixed(1)}</p>
                <StarRating value={avgRating} size="sm" className="mt-1 justify-center" />
                <p className="text-xs text-muted-foreground mt-1">{reviewCount} reviews</p>
              </div>
            </div>
          )}

          {/* Write a review */}
          <div className="mb-8 rounded-[32px] border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl p-5 sm:p-7 space-y-4 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Write a Review
            </h3>
            {!user && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                <button onClick={() => navigate("/Login")} className="text-primary font-semibold underline">
                  Sign in
                </button>{" "}
                to leave a review for this product.
              </p>
            )}
            {user && (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your Rating</p>
                  <StarRating
                    value={myRating}
                    interactive
                    size="lg"
                    onChange={setMyRating}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Your Feedback</p>
                  <Textarea
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    placeholder="Share your experience with this product..."
                    rows={3}
                    className="rounded-2xl"
                  />
                </div>
                <Button
                  onClick={submitReview}
                  disabled={submitting || myRating === 0}
                  className="rounded-full h-11 px-6 gap-2 font-bold active:scale-95 shadow-md"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Review"}
                </Button>
              </>
            )}
          </div>

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <div className="text-center py-10 rounded-[28px] border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-900/40">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No reviews yet. Be the first to share your experience!
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-[28px] border border-slate-200/90 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-5 space-y-2 relative group shadow-xs">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                        {(r.userName?.[0] ?? "?").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{r.userName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating value={r.rating} size="sm" />
                        {r.createdAt?.seconds && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {new Date(r.createdAt.seconds * 1000).toLocaleDateString()}
                          </span>
                        )}
                        {user && r.userId === user.uid && (
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.2 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-slate-700 dark:text-slate-200 pl-12 leading-relaxed">
                      {r.comment}
                    </p>
                  )}
                  {/* Delete Button for User's Own Reviews */}
                  {user && r.userId === user.uid && (
                    <button
                      onClick={() => deleteSpecificReview(r.id)}
                      disabled={submitting}
                      className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors disabled:opacity-50"
                      aria-label="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Related Products from Same Category (Only shown if product has category and related products exist) ── */}
        {product.category?.trim() && relatedProducts.length > 0 && (
          <div className="mt-12 pt-8 border-t space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary">Explore Category</span>
                <h2 className="text-xl sm:text-2xl font-bold capitalize">More in {product.category}</h2>
              </div>
              <Badge variant="secondary" className="text-xs">
                {relatedProducts.length} items
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

      </main>
    </>
  )
}
