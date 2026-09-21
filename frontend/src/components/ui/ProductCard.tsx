import Link from "next/link";
import { Heart } from "lucide-react";

import Badge from "@/components/ui/Badge";

interface ProductCardProps {
  name: string;
  href: string;
  price: number;
  badge?: string;
  badgeVariant?: "default" | "blush" | "beige" | "success" | "sale";
  availability?: "Ready Stock" | "Made to Order";
}

export default function ProductCard({
  name,
  href,
  price,
  badge,
  badgeVariant = "blush",
  availability = "Made to Order",
}: ProductCardProps) {
  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-3xl border border-[#EADFD8] bg-[#F8F2EC]">
        <Link
          href={href}
          className="flex aspect-[4/5] items-center justify-center p-8"
        >
          <div className="flex h-full w-full items-center justify-center rounded-[2rem] bg-white/70">
            <span className="text-center font-serif text-xl text-[#8A7B72]">
              Product image
            </span>
          </div>
        </Link>

        {badge && (
          <div className="absolute left-4 top-4">
            <Badge variant={badgeVariant}>{badge}</Badge>
          </div>
        )}

        <button
          type="button"
          aria-label={`Add ${name} to wishlist`}
          className="
            absolute
            right-4
            top-4
            inline-flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-white
            text-brand-cocoa
            shadow-sm
            transition-transform
            hover:scale-105
          "
        >
          <Heart size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div className="pt-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8A7B72]">
          {availability}
        </p>

        <Link href={href}>
          <h3 className="mt-2 text-xl transition-opacity group-hover:opacity-70">
            {name}
          </h3>
        </Link>

        <p className="mt-2 text-sm font-semibold text-brand-cocoa">
          AED {price.toFixed(2)}
        </p>
      </div>
    </article>
  );
}