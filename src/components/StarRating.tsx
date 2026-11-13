import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;       // current rating 0-5 (can be fractional for display)
  max?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function StarRating({
  value,
  max = 5,
  size = "md",
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);

  const displayValue = interactive ? (hover || value) : value;

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      onMouseLeave={() => interactive && setHover(0)}
    >
      {Array.from({ length: max }, (_, i) => {
        const starIndex = i + 1;
        const filled = displayValue >= starIndex;
        const halfFilled = !filled && displayValue >= starIndex - 0.5;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starIndex)}
            onMouseEnter={() => interactive && setHover(starIndex)}
            className={cn(
              "relative transition-transform",
              interactive && "cursor-pointer hover:scale-110 focus:outline-none",
              !interactive && "cursor-default"
            )}
            aria-label={`${starIndex} star${starIndex !== 1 ? "s" : ""}`}
          >
            {/* Background star (empty) */}
            <Star
              className={cn(
                sizeMap[size],
                "text-muted-foreground/30"
              )}
            />
            {/* Filled overlay */}
            {(filled || halfFilled) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: filled ? "100%" : "50%" }}
              >
                <Star
                  className={cn(
                    sizeMap[size],
                    "fill-amber-400 text-amber-400"
                  )}
                />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
