import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface onSelectImgprops {
    onSelectImg: (url: string) => void; // Fix 1: Fixed to lowercase 'string'
}

const ImageURL = ({ onSelectImg }: onSelectImgprops) => {
    const CLOUD_NAME = "cvx21k8i";
    const UPLOAD_PRESET = "ml_default";
    const [loading, setLoading] = useState(false); // Added a simple visual loader state

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Fix 2: Safety guard check that stops code execution if no file is chosen
        if (!e.target.files || !e.target.files[0]) {
            return;
        }

        const selectedFile = e.target.files[0];
        const formData = new FormData(); // Fix 3: Added parenthesis to constructor 'new FormData()'

        formData.append('file', selectedFile);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('cloud_name',CLOUD_NAME )

        setLoading(true);

        try {
            // Correct API delivery endpoint
            const res = await fetch(
              " https://api.cloudinary.com/v1_1/cvx21k8i/image/upload"
,
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await res.json();

            if (res.ok) {
                onSelectImg(data.secure_url); // Returns the full CDN URL string to the parent
                console.log(data.secure_url);
                console.log("Successfully uploaded to Cloudinary!");
            } else {
                alert("Upload failed: " + data.error?.message);
            }
        } catch (error) {
            console.error("Network upload error:", error);
        }

    }

    return (
        <div className="space-y-2">
            <Label htmlFor="image">{loading ? "Uploading to Cloudinary..." : "Product Image"}</Label>
            <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={loading}
                className="cursor-pointer"
            />
        </div>
    )
}

export default ImageURL;
