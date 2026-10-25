"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import Badge from "@/components/ui/Badge";
import { apiJson, ApiError } from "@/lib/api";
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
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const image = safeImageUrl(imageUrl ?? "");

  async function addToWishlist() {
    if (!productId || busy) return;

    setBusy(true);
    setNotice("");

    try {
      await apiJson(
        `/api/customer/wishlist/${encodeURIComponent(productId)}`,
        "POST",
      );

      setSaved(true);
      setNotice("Added to your wishlist.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSaved(true);
        setNotice("Already in your wishlist.");
      } else if (
        error instanceof ApiError &&
        error.status === 401
      ) {
        setNotice("Please sign in to save your favourites.");
      } else {
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not update wishlist.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

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

        {productId && (
          <button
            type="button"
            onClick={() => void addToWishlist()}
            disabled={busy}
            aria-label={
              saved
                ? `${name} saved to wishlist`
                : `Add ${name} to wishlist`
            }
            aria-pressed={saved}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-cocoa shadow-sm transition-transform hover:scale-105 disabled:opacity-50"
          >
            <Heart
              size={18}
              fill={saved ? "currentColor" : "none"}
              strokeWidth={1.8}
            />
          </button>
        )}
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

        {notice && (
          <p
            role="status"
            className="mt-2 text-xs leading-5 text-[#6B5A50]"
          >
            {notice}
          </p>
        )}
      </div>
    </article>
  );
}