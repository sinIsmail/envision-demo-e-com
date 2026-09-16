
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from '../firebase/fb'
import ProductCard from "./ProductHomeList";
import { Link, useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"

import { Button } from "@/components/ui/button"

function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSignout = async () => {
    await signOut(auth);
    localStorage.removeItem("token");
    navigate("/Login");
  };

  const getProducts = async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, "products")
      );

      const productData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts(productData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProducts();
  }, []);

  if (loading) {
    return <div className="p-6">Loading products...</div>;
  }

  return (
    <>
     <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
    
              {/* LOGO */}
              <Link
                to="/"
                className="text-2xl font-bold tracking-tight"
              >
                Shop<span className="text-primary">.</span>
              </Link>
    
              <div className="flex items-center gap-2">
                <Button variant="outline" >
                  <Link to="/Profile">
                    Profile
                  </Link>
                </Button>
    
                <Button >
                  <Link to="/Cart">
                    Cart
                  </Link>
                </Button>

                <Button variant="destructive" onClick={handleSignout}>
                  Sign out
                </Button>
              </div>
    
            </div>
          </header>
    <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">

      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
        />
      ))}
    </div>
    </>

    
  );
}

export default Products;
