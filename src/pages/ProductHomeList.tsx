import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart } from "lucide-react"
import {
  collection, addDoc, getDocs, query, where, updateDoc, doc,
} from "firebase/firestore"
import { db } from "@/firebase/fb"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/context/AuthContext"
import { addToLocalCart } from "../lib/cartStrorage"

function ProductCard({ product }: any) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const cartHandler = async (e: React.MouseEvent) => {
    // Stop card tap-through to detail page
    e.stopPropagation()

    if (!user) {
      addToLocalCart(product.id)
      toast.add({ title: "Added to cart ✓", description: `${product.name} added.` })
      return
    }

    try {
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
    } catch (error: any) {
      console.error("Cart error:", error)
      toast.add({ title: "Error", description: "Could not add to cart." })
    }
  }

  const outOfStock = product.stock <= 0

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
    >
      {/* IMAGE */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
          </div>
        )}
        {!outOfStock && product.stock <= 5 && (
          <Badge className="absolute left-2 top-2 text-[10px] px-1.5 py-0.5">
            {product.stock} left
          </Badge>
        )}
      </div>

      {/* INFO */}
      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
        <p className="line-clamp-2 text-xs font-semibold leading-tight sm:text-sm">
          {product.name}
        </p>
        <p className="text-sm font-bold sm:text-base">
          ₹{Number(product.price).toLocaleString("en-IN")}
        </p>

        {/* ADD TO CART — compact icon+text on mobile */}
        <Button
          size="sm"
          className="mt-auto w-full gap-1.5 text-xs sm:text-sm"
          disabled={outOfStock}
          onClick={cartHandler}
        >
          <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">{outOfStock ? "Out of Stock" : "Add to Cart"}</span>
          <span className="sm:hidden">{outOfStock ? "Sold out" : "Add"}</span>
        </Button>
      </div>
    </div>
  )
}

export default ProductCard