import { useState } from "react";
import { X, Plus, GripVertical, Star } from "lucide-react";
import { Label } from "@/components/ui/label";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("cloud_name", CLOUD_NAME);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Upload failed");
  return data.secure_url as string;
}

interface MultiImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function MultiImageUpload({ images, onChange, maxImages = 6 }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = maxImages - images.length;
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    try {
      const urls = await Promise.all(toUpload.map(uploadToCloudinary));
      onChange([...images, ...urls]);
    } catch {
      alert("One or more uploads failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0) return;
    const next = [...images];
    const [chosen] = next.splice(index, 1);
    next.unshift(chosen);
    onChange(next);
  };

  const moveImage = (from: number, to: number) => {
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label>
        Product Images
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          ({images.length}/{maxImages}) — First image is the main display image
        </span>
      </Label>

      {/* Thumbnails grid */}
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div
            key={url + i}
            className={`group relative h-20 w-20 overflow-hidden rounded-lg border-2 ${
              i === 0 ? "border-primary shadow-sm" : "border-border"
            }`}
          >
            {i === 0 && (
              <span className="absolute left-0 top-0 z-10 bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground leading-none rounded-br">
                MAIN
              </span>
            )}
            <img src={url} alt={`Product ${i + 1}`} className="h-full w-full object-cover" />

            {/* Overlay actions */}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
              {/* Set Primary Button */}
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => setPrimaryImage(i)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-amber-400 text-black hover:bg-amber-300 transition-colors"
                  title="Make Primary Photo"
                >
                  <Star className="h-3 w-3 fill-black" />
                </button>
              )}
              {/* Move left */}
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => moveImage(i, i - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-white/90 text-black hover:bg-white"
                  title="Move left"
                >
                  <GripVertical className="h-3 w-3 rotate-90" />
                </button>
              )}
              {/* Remove */}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="flex h-6 w-6 items-center justify-center rounded bg-destructive text-white hover:bg-destructive/90"
                title="Remove"
              >
                <X className="h-3 w-3" />
              </button>
              {/* Move right */}
              {i < images.length - 1 && (
                <button
                  type="button"
                  onClick={() => moveImage(i, i + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-white/90 text-black hover:bg-white"
                  title="Move right"
                >
                  <GripVertical className="h-3 w-3 -rotate-90" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add more button */}
        {images.length < maxImages && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 transition-colors">
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <Plus className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Add</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {images.length === 0 && !uploading && (
        <p className="text-xs text-muted-foreground">No images added yet. Click + to upload.</p>
      )}
    </div>
  );
}
