
import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ImageURL from "@/components/imageUrl";

import {
  collection,
  addDoc,
  getCountFromServer,
} from "firebase/firestore";

import { db } from "../firebase/fb";
import { toast } from "@/components/ui/toast";

export default function AdminProductUpload() {
  const [product, setProduct] = useState({
    proName: "",
    proPrice: "",
    proStock: "",
    proDescription: "",
  });

  const [loading, setLoading] = useState(false);
  const [imgURL, setImgURL] = useState("");

  const addProductHandler = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!imgURL) {
      toast.add({
        title: "Image required",
        description: "Please select a product image.",
      });
      return;
    }

    try {
      setLoading(true);

      const productCollection = collection(
        db,
        "products"
      );

      // Get current product count
      const snapshot =
        await getCountFromServer(productCollection);

      const totalCount =
        snapshot.data().count;

      // Generate ID: 01, 02, 03...
      const nextIdNumber =
        totalCount + 1;

      const generatedId =
        String(nextIdNumber).padStart(2, "0");

      // Add product
      await addDoc(productCollection, {
        id: generatedId,
        name: product.proName,
        price: Number(product.proPrice),
        stock: Number(product.proStock),
        description: product.proDescription,
        image: imgURL,
      });

      // Reset form
      setProduct({
        proName: "",
        proPrice: "",
        proStock: "",
        proDescription: "",
      });

      setImgURL("");

      toast.add({
        title: "Successfully uploaded",
        description: `Product ${generatedId} added successfully.`,
      });
    } catch (error) {
      console.error(
        "Error uploading product:",
        error
      );

      toast.add({
        title: "Upload failed",
        description:
          "Something went wrong while adding the product.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg shadow-md">

        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Add New Product
          </CardTitle>

          <CardDescription>
            Upload listing assets and publish them directly
            to Firestore.
          </CardDescription>
        </CardHeader>

        <form onSubmit={addProductHandler}>

          <CardContent className="space-y-4">

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Product Name
              </Label>

              <Input
                id="name"
                placeholder="e.g. Wireless Mechanical Keyboard"
                value={product.proName}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    proName: e.target.value,
                  })
                }
                disabled={loading}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description
              </Label>

              <Textarea
                id="description"
                placeholder="Describe your product key features..."
                value={product.proDescription}
                onChange={(e) =>
                  setProduct({
                    ...product,
                    proDescription: e.target.value,
                  })
                }
                disabled={loading}
                required
              />
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label htmlFor="price">
                  Price (₹)
                </Label>

                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={product.proPrice}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      proPrice: e.target.value,
                    })
                  }
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">
                  Inventory Stock
                </Label>

                <Input
                  id="stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={product.proStock}
                  onChange={(e) =>
                    setProduct({
                      ...product,
                      proStock: e.target.value,
                    })
                  }
                  disabled={loading}
                  required
                />
              </div>

            </div>

            {/* Image */}
            <div className="space-y-2">

              <Label>
                Product Image
              </Label>

              <ImageURL
                onSelectImg={(file) =>
                  setImgURL(file)
                }
              />

              {imgURL && (
                <p className="break-all text-xs text-muted-foreground">
                  {imgURL}
                </p>
              )}

            </div>

          </CardContent>

          <CardFooter>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? "Publishing..."
                : "Upload Product"}
            </Button>

          </CardFooter>

        </form>

      </Card>
    </div>
  );
}
