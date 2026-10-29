"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

import { useWishlist } from "@/components/wishlist/WishlistProvider";

export default function WishlistButton({
  productId,
  name,
  display,
  disabled = false,
}: {
  productId: string;
  name: string;
  display: "card" | "detail";
  disabled?: boolean;
}) {
  const { items, guest, loading, busyIds, toggle } = useWishlist();
  const [notice, setNotice] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const saved = items.some((item) => item.productId === productId);
  const busy = loading || busyIds.includes(productId) || disabled;
  const isCard = display === "card";

  async function handleClick() {
    setNotice("");
    if (guest) {
      setNeedsLogin(true);
      setNotice("Sign in to save your favourites.");
      return;
    }
    setNeedsLogin(false);
    try {
      const added = await toggle(productId);
      setNotice(added ? "Saved to your wishlist." : "Removed from your wishlist.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not update your wishlist.");
      if (caught instanceof Error && caught.message.toLowerCase().includes("sign in")) setNeedsLogin(true);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleClick()}
        aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
        aria-pressed={saved}
        title={saved ? "Remove from wishlist" : "Save to wishlist"}
        className={isCard
          ? "absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-cocoa shadow-sm transition-transform hover:scale-105 disabled:opacity-50"
          : "mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-brand-cocoa text-sm font-medium text-brand-cocoa transition-colors hover:bg-brand-blush disabled:opacity-50"}
      >
        <Heart size={18} fill={saved ? "currentColor" : "none"} strokeWidth={1.8} />
        {!isCard && (loading ? "Checking saved items..." : saved ? "Remove from Wishlist" : "Save to Wishlist")}
      </button>
      {notice && (
        <p role="status" className={isCard
          ? "absolute bottom-3 left-3 right-3 rounded-xl bg-white/95 px-3 py-2 text-xs text-brand-cocoa shadow-sm"
          : "mt-2 text-sm text-[#6B5A50]"}>
          {notice}{" "}{needsLogin && <Link href="/login" className="font-semibold underline">Sign in</Link>}
        </p>
      )}
    </>
  );
}
