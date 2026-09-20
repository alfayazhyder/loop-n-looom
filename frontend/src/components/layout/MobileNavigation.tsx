import Link from "next/link";
import {
  Heart,
  Home,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";

export default function MobileNavigation() {
  return (
    <nav
      className="
        fixed
        bottom-0
        left-0
        right-0
        z-50
        border-t
        border-[#EADFD8]
        bg-white
        px-3
        py-2
        lg:hidden
      "
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link
          href="/"
          className="flex min-w-14 flex-col items-center gap-1 text-xs text-brand-cocoa"
        >
          <Home size={20} strokeWidth={1.8} />
          <span>Home</span>
        </Link>

        <Link
          href="/shop"
          className="flex min-w-14 flex-col items-center gap-1 text-xs text-brand-cocoa"
        >
          <ShoppingBag size={20} strokeWidth={1.8} />
          <span>Shop</span>
        </Link>

        <Link
          href="/custom-crochet"
          className="flex min-w-14 flex-col items-center gap-1 text-xs text-brand-cocoa"
        >
          <Sparkles size={20} strokeWidth={1.8} />
          <span>Create</span>
        </Link>

        <Link
          href="/wishlist"
          className="flex min-w-14 flex-col items-center gap-1 text-xs text-brand-cocoa"
        >
          <Heart size={20} strokeWidth={1.8} />
          <span>Saved</span>
        </Link>

        <Link
          href="/account"
          className="flex min-w-14 flex-col items-center gap-1 text-xs text-brand-cocoa"
        >
          <User size={20} strokeWidth={1.8} />
          <span>Account</span>
        </Link>
      </div>
    </nav>
  );
}