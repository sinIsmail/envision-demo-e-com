

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from "firebase/firestore"
import { db, auth } from "@/firebase/fb"
import { toast } from "@/components/ui/toast"

function ProductCard({ product }: any) {
  
  const cartHandler = async () => {
    try {

      const userid = auth.currentUser?.uid;

      if (!userid) {
        return;
      }

      const res = collection(db, 'cart', userid, 'items');

      const q = query(res, where("productid", '==', product.id));

      const qsnip = await getDocs(q);

      if (!qsnip.empty) {

        const existingDoc = qsnip.docs[0];

        const currentQuantity =
          existingDoc.data().quantity || 0;

        await updateDoc(
          doc(
            db,
            "cart",
            userid,
            "items",
            existingDoc.id
          ),
          {
            quantity: currentQuantity + 1,
          }
        );

        toast.add({
          title: "Cart updated",
          description: "Quantity increased by 1",
        });

      } else {
        // Product doesn't exist, create it
        await addDoc(res, {
          productid: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
        });

        toast.add({
          title: "Added to cart successfully",
          description: "Product added to your cart",
        });
      }

    } catch (error) {
      console.error("Cart error:", error);
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

        <Badge className="absolute left-3 top-3">
          {product.stock}
        </Badge>
        <Badge className="absolute left-3 top-3">
          {product.id}
        </Badge>
      </div>

      {/* CONTENT */}
      <CardContent className="p-5">
        <h3 className="text-lg font-semibold">
          {product.name}
        </h3>

        <p className="mt-2 text-xl font-bold">
          ₹{product.price.toLocaleString("en-IN")}
        </p>
      </CardContent>

      {/* FOOTER */}
      <CardFooter className="p-5 pt-0">
        <Button className="w-full" onClick={cartHandler}>
          Add to Cart
        </Button>
      </CardFooter>

    </Card>
  )
}
export default ProductCard;