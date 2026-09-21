import Link from "next/link";

import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-[#EADFD8] bg-brand-cream">
      <div className="page-container py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="max-w-sm">
            <Link href="/" aria-label="LOOP_N_LOOOM home">
              <Logo size={110} />
            </Link>

            <p className="mt-5 text-sm leading-7 text-[#6B5A50]">
              Premium handmade crochet creations, personalised gifts and
              thoughtful pieces made for memorable moments across the UAE.
            </p>
          </div>

          <div>
            <h2 className="text-lg">Shop</h2>

            <nav className="mt-5 flex flex-col gap-3 text-sm text-[#6B5A50]">
              <Link href="/shop">All Products</Link>
              <Link href="/shop/flowers">Flowers</Link>
              <Link href="/shop/bouquets">Bouquets</Link>
              <Link href="/shop/gift-boxes">Gift Boxes</Link>
              <Link href="/shop/baby-products">Baby Products</Link>
            </nav>
          </div>

          <div>
            <h2 className="text-lg">Create</h2>

            <nav className="mt-5 flex flex-col gap-3 text-sm text-[#6B5A50]">
              <Link href="/build-a-bouquet">Build a Bouquet</Link>
              <Link href="/custom-crochet">Custom Crochet</Link>
              <Link href="/occasions">Shop by Occasion</Link>
              <Link href="/wishlist">Wishlist</Link>
            </nav>
          </div>

          <div>
            <h2 className="text-lg">Help</h2>

            <nav className="mt-5 flex flex-col gap-3 text-sm text-[#6B5A50]">
              <Link href="/account/orders">Track Your Order</Link>
              <Link href="/support">Support</Link>
              <Link href="/shipping">Shipping</Link>
              <Link href="/returns">Returns</Link>
              <Link href="/about">About Us</Link>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[#EADFD8] pt-6 text-xs text-[#8A7B72] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} LOOP_N_LOOOM. All rights reserved.
          </p>

          <div className="flex flex-wrap gap-5">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}