import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { doc, getDoc, collection, addDoc, getDocs, query, where, updateDoc } from "firebase/firestore"
import { db } from "@/firebase/fb"
import { useAuth } from "@/context/AuthContext"
import { addToLocalCart } from "@/lib/cartStrorage"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { ArrowLeft, ShoppingCart, Package, Tag } from "lucide-react"

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }
    const fetchProduct = async () => {
      try {
        const snap = await getDoc(doc(db, "products", id))
        if (snap.exists()) {
          setProduct({ id: snap.id, ...snap.data() })
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

  const cartHandler = async () => {
    if (!product) return
    setAdding(true)
    try {
      if (!user) {
        addToLocalCart(product.id)
        toast.add({ title: "Added to cart ✓", description: `${product.name} added.` })
        return
      }

      const cartRef = collection(db, "cart", user.uid, "items")
      const q = query(cartRef, where("productid", "==", product.id))
      const snap = await getDocs(q)

      if (!snap.empty) {
        const existingDoc = snap.docs[0]
        await updateDoc(doc(db, "cart", user.uid, "items", existingDoc.id), {
          quantity: (Number(existingDoc.data().quantity) || 0) + 1,
        })
        toast.add({ title: "Cart updated", description: "Quantity increased by 1." })
      } else {
        await addDoc(cartRef, {
          productid: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.image,
          quantity: 1,
        })
        toast.add({ title: "Added to cart ✓", description: `${product.name} added.` })
      }
    } catch (err) {
      console.error(err)
      toast.add({ title: "Error", description: "Could not add to cart." })
    } finally {
      setAdding(false)
    }
  }

  /* ── Loading ── */
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

  /* ── Not found ── */
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

  const outOfStock = product.stock <= 0

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-8">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="grid gap-6 sm:gap-10 md:grid-cols-2">

          {/* ── LEFT — Image ── */}
          <div className="overflow-hidden rounded-2xl bg-muted aspect-square relative">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            {outOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Badge variant="destructive" className="px-4 py-1.5 text-sm">Out of Stock</Badge>
              </div>
            )}
          </div>

          {/* ── RIGHT — Details ── */}
          <div className="flex flex-col gap-4">

            {/* Name */}
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-extrabold text-primary">
                ₹{Number(product.price).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Stock badge */}
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {outOfStock ? (
                <Badge variant="destructive">Out of Stock</Badge>
              ) : product.stock <= 5 ? (
                <Badge variant="secondary" className="text-orange-600 bg-orange-100">
                  Only {product.stock} left!
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-green-700 bg-green-100">
                  In Stock — {product.stock} available
                </Badge>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Description */}
            {product.description && (
              <div>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  About this product
                </h2>
                <p className="text-sm leading-relaxed text-foreground/80 sm:text-base">
                  {product.description}
                </p>
              </div>
            )}

            {/* Spacer on desktop */}
            <div className="flex-1" />

            {/* Add to Cart — sticky on mobile */}
            <div className="sticky bottom-4 sm:static">
              <Button
                size="lg"
                className="w-full gap-2 text-base shadow-lg sm:shadow-none"
                disabled={outOfStock || adding}
                onClick={cartHandler}
              >
                <ShoppingCart className="h-5 w-5" />
                {adding ? "Adding..." : outOfStock ? "Out of Stock" : "Add to Cart"}
              </Button>
              {!user && !outOfStock && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  You can add to cart without an account — sign in at checkout.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
