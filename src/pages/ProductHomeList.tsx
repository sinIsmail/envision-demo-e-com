import { useNavigate } from "react-router-dom"
import { ShoppingCart, Scale, Images, Star } from "lucide-react"
import {
  collection, addDoc, getDocs, updateDoc, doc,
} from "firebase/firestore"
import { db } from "@/firebase/fb"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/context/AuthContext"
import { useSiteSettings } from "@/context/SiteSettingsContext"
import { addToLocalCart } from "../lib/cartStrorage"
import { StarRating } from "@/components/StarRating"
import { type Product, getMaxVariant } from "@/types/product"
import { formatPrice } from "@/lib/themeUtils"

function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth()
  const { settings } = useSiteSettings()
  const navigate = useNavigate()

  const cartHandler = async (e: React.MouseEvent) => {
    e.stopPropagation()
    // If product has variants, direct user to product page to choose variant
    if (product.hasVariants && product.unitVariants && product.unitVariants.length > 0) {
      navigate(`/product/${product.id}`)
      return
    }

    if (!user) {
      addToLocalCart(product.id)
      toast.add({ title: "Added to cart ✓", description: `${product.name} added.` })
      return
    }
    try {
      const cartRef = collection(db, "cart", user.uid, "items")
      const snap = await getDocs(cartRef)
      const existingDoc = snap.docs.find((d) => {
        const data = d.data()
        const pId = String(data.productId ?? data.productid ?? d.id)
        return pId === product.id && !data.variantLabel
      })

      if (existingDoc) {
        await updateDoc(doc(db, "cart", user.uid, "items", existingDoc.id), {
          quantity: (Number(existingDoc.data().quantity) || 0) + 1,
          productId: product.id,
          productid: product.id,
        })
        toast.add({ title: "Cart updated", description: "Quantity increased by 1." })
      } else {
        const mainImg = product.images?.[0] ?? product.image
        await addDoc(cartRef, {
          productId: product.id,
          productid: product.id,
          name: product.name,
          price: Number(product.price),
          image: mainImg,
          quantity: 1,
        })
        toast.add({ title: "Added to cart ✓", description: `${product.name} added.` })
      }
    } catch (error: any) {
      console.error("Cart error:", error)
      toast.add({ title: "Error", description: "Could not add to cart." })
    }
  }

  const outOfStock =
    product.hasVariants && product.unitVariants && product.unitVariants.length > 0
      ? !product.unitVariants.some((v) => v.enabled !== false && (v.stock ?? 0) > 0)
      : product.stock <= 0
  const mainImg = product.images?.[0] ?? product.image
  const avgRating = product.avgRating ?? 0
  const reviewCount = product.reviewCount ?? 0

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-xl hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 active:scale-[0.99]"
    >
      {/* ── IMAGE CANVAS (Friendly clean white / light slate backdrop) ── */}
      <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-4 flex items-center justify-center">
        <img
          src={mainImg}
          alt={product.name}
          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              Out of Stock
            </span>
          </div>
        )}

        {/* Low Stock Badge */}
        {!outOfStock && product.stock > 0 && product.stock <= 5 && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
            Only {product.stock} left
          </span>
        )}

        {/* Variant Size Count Pill */}
        {!outOfStock && product.hasVariants && (product.unitVariants?.length ?? 0) > 0 && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-primary/10 text-primary border border-primary/20 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold">
            {product.unitVariants?.length} Sizes
          </span>
        )}

        {/* Multi-image indicator */}
        {(product.images?.length ?? 0) > 1 && (
          <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-slate-900/75 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white shadow-2xs">
            <Images className="h-3 w-3" />
            +{product.images.length - 1}
          </span>
        )}
      </div>

      {/* ── PRODUCT DETAILS ── */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {/* Category Pill */}
        {product.category?.trim() && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary truncate mb-1">
            {product.category}
          </span>
        )}

        {/* Product Title */}
        <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors min-h-[2.4rem]">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-1.5 mb-2">
          {reviewCount > 0 ? (
            <>
              <StarRating value={avgRating} size="sm" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                ({reviewCount})
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>4.9 (Fresh)</span>
            </div>
          )}
        </div>

        {/* Price Display */}
        <div className="mt-auto pt-1 flex items-baseline gap-1.5 flex-wrap">
          {product.hasVariants && product.unitVariants && product.unitVariants.length > 0 ? (
            settings.showMaxVariantOnly ? (
              <>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {formatPrice(
                    getMaxVariant(product.unitVariants, true)?.price ??
                    getMaxVariant(product.unitVariants)?.price ??
                    product.price,
                    settings.currency,
                    settings.currencyLocale
                  )}
                </span>
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  (
                  {getMaxVariant(product.unitVariants, true)?.label ??
                    getMaxVariant(product.unitVariants)?.label ??
                    "Max"}
                  )
                </span>
              </>
            ) : (() => {
              const activeVariants = product.unitVariants.filter(
                (v) => v.enabled !== false && (v.stock ?? 0) > 0
              );
              const pool = activeVariants.length > 0 ? activeVariants : product.unitVariants;
              const minPrice = Math.min(...pool.map((v) => v.price));
              return (
                <div className="flex items-baseline gap-1">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    From
                  </span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {formatPrice(minPrice, settings.currency, settings.currencyLocale)}
                  </span>
                </div>
              );
            })()
          ) : (
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {formatPrice(product.price, settings.currency, settings.currencyLocale)}
            </span>
          )}
        </div>

        {/* Friendly Action Button */}
        <button
          type="button"
          disabled={outOfStock}
          onClick={cartHandler}
          className={`mt-3 w-full h-9.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 ${
            outOfStock
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700"
              : "bg-primary text-primary-foreground hover:brightness-110 hover:shadow-md cursor-pointer"
          }`}
        >
          {product.hasVariants ? (
            <>
              <Scale className="h-4 w-4 shrink-0" />
              <span>Select Size</span>
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span>{outOfStock ? "Out of Stock" : "Add to Cart"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default ProductCard