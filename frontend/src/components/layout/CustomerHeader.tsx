import Link from "next/link";
import { Heart, Search, ShoppingBag, User, Bell, CalendarHeart } from "lucide-react";

import Logo from "@/components/Logo";
import MobileMenu from "@/components/layout/MobileMenu";

export default function CustomerHeader() {
  return (
    <header className="border-b border-[#EADFD8] bg-brand-cream">
      <div className="page-container flex min-h-20 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MobileMenu />

          <Link href="/" aria-label="LOOP_N_LOOOM home">
            <Logo size={86} priority />
          </Link>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-brand-cocoa lg:flex">
          <Link href="/shop" className="transition-opacity hover:opacity-60">
            Shop
          </Link>

          <Link
            href="/occasions"
            className="transition-opacity hover:opacity-60"
          >
            Occasions
          </Link>

          <Link
            href="/build-a-bouquet"
            className="transition-opacity hover:opacity-60"
          >
            Build a Bouquet
          </Link>

          <Link
            href="/custom-crochet"
            className="transition-opacity hover:opacity-60"
          >
            Custom Orders
          </Link>

          <Link href="/about" className="transition-opacity hover:opacity-60">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-4 text-brand-cocoa">
          <Link
            href="/search"
            aria-label="Search"
            className="transition-opacity hover:opacity-60"
          >
            <Search size={20} strokeWidth={1.8} />
          </Link>

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="transition-opacity hover:opacity-60"
          >
            <Heart size={20} strokeWidth={1.8} />
          </Link>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className="transition-opacity hover:opacity-60"
          >
            <Bell size={20} strokeWidth={1.8} />
          </Link>
          <Link
            href="/reminders"
            aria-label="Occasion reminders"
            className="hidden transition-opacity hover:opacity-60 sm:inline-flex"
          >
            <CalendarHeart size={20} strokeWidth={1.8} />
          </Link>

          <Link
            href="/account"
            aria-label="Account"
            className="hidden transition-opacity hover:opacity-60 sm:inline-flex"
          >
            <User size={20} strokeWidth={1.8} />
          </Link>

          <Link
            href="/cart"
            aria-label="Cart"
            className="transition-opacity hover:opacity-60"
          >
            <ShoppingBag size={20} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </header>
  );
}