import React, { useState } from "react";


// shadcn/ui components (Adjust import paths based on your project configuration)
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ImageURL from "@/components/imageUrl";

import { collection, addDoc, getCountFromServer } from "firebase/firestore";
import { db } from "../firebase/fb";
import { toast } from "@/components/ui/toast";


export default function AdminProductUpload() {
  const [product, setproduct] = useState({
    proName: "",
    proPrice: "",
    proStock: "",
    imgUrl: "",
    proDescription: ""
  })

 const [uploadedok, setuploadedok] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imgURL, setImgURL] = useState("");

  
  const addProductHandler = async (e:any) => {
    e.preventDefault();
    const productCollection = collection(db, "products");
    
    // 1. Get the efficient server-side count of documents
    const snapshot = await getCountFromServer(productCollection);
    const totalCount = snapshot.data().count; // e.g., 0 or 3
    
    // 2. Increment by 1 and pad with zero (1 becomes "01", 4 becomes "04")
    const nextIdNumber = totalCount + 1;
    const generatedId = String(nextIdNumber).padStart(2, '0');
    try {
      const res = await addDoc(collection(db, "products"), {
        id:generatedId,
        name: product.proName,
        price: Number(product.proPrice),
        stock: Number(product.proStock),
        description:product.proDescription,
        image:imgURL

      })
      if(res){
     toast.add({
                title: "successfully uploaded",
                description: "oolala uploaded"
            });
        setproduct({...product,
            proName:"",
            proDescription:"",
            proPrice:"",
            proStock:"",
            imgUrl:""
        }
        )
      }
    }
    catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-lg shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Add New Product</CardTitle>
          <CardDescription>Upload listing assets and publish them directly to Firestore.</CardDescription>
        </CardHeader>
        <form onSubmit={addProductHandler} >
          <CardContent className="space-y-4">

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name </Label>
              <Input
                id="name"
                placeholder="e.g. Wireless Mechanical Keyboard"
                value={product.proName}
                onChange={(e) => setproduct({ ...product, proName: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your product key features..."
                value={product.proDescription}
                onChange={(e) => setproduct({ ...product, proDescription: e.target.value })}
                disabled={loading}
                required
              />
            </div>

            {/* Price & Stock Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={product.proPrice}
                  onChange={(e) => setproduct({ ...product, proPrice: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Inventory Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="0"
                  value={product.proStock}
                  onChange={(e) => setproduct({ ...product, proStock: e.target.value })}
                  disabled={loading}
                  required
                />
              </div>
            </div>

         
            <ImageURL onSelectImg={(file)=>setImgURL(file)} />
              <p>{imgURL}</p>

            {/* Upload Progress Indicator */}
            {loading && progress > 0 && (
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
                <p className="text-xs text-right mt-1 text-slate-500">Uploading: {progress}%</p>
              </div>
            )}

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Publishing..." : "Upload Product"}
              {uploadedok?"uploaded successfully":"" }
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
