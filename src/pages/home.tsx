import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/fb";
import Navbar from "@/components/Navbar";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { DefaultClassicLayout } from "@/components/layouts/DefaultClassicLayout";
import { UrbanChicLayout } from "@/components/layouts/UrbanChicLayout";
import { NeoLuxeLayout } from "@/components/layouts/NeoLuxeLayout";
import { AuraModernLayout } from "@/components/layouts/AuraModernLayout";
import { HyperFluidLayout } from "@/components/layouts/HyperFluidLayout";
import type { Product } from "@/types/product";

function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useSiteSettings();

  const getProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productData = querySnapshot.docs.map((doc) => ({
        ...(doc.data() as Product),
        id: doc.id,
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
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  const activeLayout = settings.storeLayout ?? "aura-modern";

  return (
    <>
      <Navbar />
      {activeLayout === "hyper-fluid" ? (
        <HyperFluidLayout products={products} />
      ) : activeLayout === "urban-chic" ? (
        <UrbanChicLayout products={products} />
      ) : activeLayout === "neo-luxe" ? (
        <NeoLuxeLayout products={products} />
      ) : activeLayout === "default" ? (
        <DefaultClassicLayout products={products} />
      ) : (
        <AuraModernLayout products={products} />
      )}
    </>
  );
}

export default Home;
