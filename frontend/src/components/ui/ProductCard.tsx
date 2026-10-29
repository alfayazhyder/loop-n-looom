"use client";

import Link from "next/link";

import Badge from "@/components/ui/Badge";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { safeImageUrl } from "@/lib/catalog";

interface ProductCardProps {
  name: string;
  href: string;
  price: number;
  productId?: string;
  imageUrl?: string;
  badge?: string;
  badgeVariant?:
    | "default"
    | "blush"
    | "beige"
    | "success"
    | "sale";
  availability?: "Ready Stock" | "Made to Order";
}

export default function ProductCard({
  name,
  href,
  price,
  productId,
  imageUrl,
  badge,
  badgeVariant = "blush",
  availability = "Made to Order",
}: ProductCardProps) {
  const image = safeImageUrl(imageUrl ?? "");

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-3xl border border-[#EADFD8] bg-[#F8F2EC]">
        <Link
          href={href}
          className="block aspect-[4/5] overflow-hidden"
          aria-label={`View ${name}`}
        >
          {image ? (
            // Product images are optimized at the asset provider.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-8">
              <span className="text-center font-serif text-xl text-[#8A7B72]">
                {name}
              </span>
            </div>
          )}
        </Link>

        {badge && (
          <div className="absolute left-4 top-4">
            <Badge variant={badgeVariant}>
              {badge}
            </Badge>
          </div>
        )}

        {productId && <WishlistButton productId={productId} name={name} display="card" />}

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
