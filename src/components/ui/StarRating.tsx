import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const sizes = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };

  return (
    <div className="inline-flex items-center gap-1">
      <div className={cn("flex gap-0.5", sizes[size])}>
        {Array.from({ length: maxStars }, (_, i) => (
          <span
            key={i}
            className={cn(
              i < Math.round(rating) ? "text-[#F5A623]" : "text-[var(--cream-300)]"
            )}
          >
            ★
          </span>
        ))}
      </div>
      {showValue && (
        <span className="text-[0.85rem] font-semibold text-[var(--text-muted)] ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
