import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore"
import { db } from "@/firebase/fb"
import { toast } from "@/components/ui/toast"
import { useAuth } from "@/context/AuthContext"

function ProductCard({ product }: any) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const cartHandler = async () => {
    if (!user) {
      toast.add({ title: "Sign in to shop", description: "Please log in or create an account to add items to your cart." });
      navigate("/Login");
      return;
    }

    try {
      const cartRef = collection(db, "cart", user.uid, "items");
      const q = query(cartRef, where("productid", "==", product.id));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const currentQty = existingDoc.data().quantity || 0;
        await updateDoc(doc(db, "cart", user.uid, "items", existingDoc.id), {
          quantity: currentQty + 1,
        });
        toast.add({ title: "Cart updated", description: "Quantity increased by 1." });
      } else {
        await addDoc(cartRef, {
          productid: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
        });
        toast.add({ title: "Added to cart ✓", description: `${product.name} added to your cart.` });
      }
    } catch (error: any) {
      console.error("Cart error:", error);
      toast.add({ title: "Error", description: "Could not add to cart. Please try again." });
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">

      {/* IMAGE */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
        {product.stock > 0 && (
          <Badge className="absolute left-3 top-3">{product.stock} left</Badge>
        )}
      </div>

      {/* CONTENT */}
      <CardContent className="p-4">
        <h3 className="font-semibold leading-tight line-clamp-2">{product.name}</h3>
        <p className="mt-2 text-xl font-bold">₹{Number(product.price).toLocaleString("en-IN")}</p>
      </CardContent>

      {/* FOOTER */}
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={cartHandler}
          disabled={product.stock <= 0}
        >
          {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardFooter>

    </Card>
  );
}

export default ProductCard;