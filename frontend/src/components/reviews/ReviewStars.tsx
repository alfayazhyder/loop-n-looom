import { Star } from "lucide-react";

export default function ReviewStars({ rating, size = 16 }: { rating: number; size?: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="inline-flex items-center gap-1 text-[#AC7851]">
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={size} strokeWidth={1.6} fill={index < rounded ? "currentColor" : "none"} aria-hidden="true" />
      ))}
    </span>
  );
}
