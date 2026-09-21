import Link from "next/link";

import ProductCard from "@/components/ui/ProductCard";

const bestSellers = [
  {
    name: "Crochet Rose Bouquet",
    href: "/products/crochet-rose-bouquet",
    price: 145,
    badge: "BEST SELLER",
    badgeVariant: "blush" as const,
    availability: "Made to Order" as const,
  },
  {
    name: "Mini Tulip Bouquet",
    href: "/products/mini-tulip-bouquet",
    price: 95,
    badge: "HANDMADE",
    badgeVariant: "beige" as const,
    availability: "Made to Order" as const,
  },
  {
    name: "Crochet Flower Keychain",
    href: "/products/crochet-flower-keychain",
    price: 35,
    badge: "NEW",
    badgeVariant: "success" as const,
    availability: "Ready Stock" as const,
  },
  {
    name: "Pastel Crochet Gift Box",
    href: "/products/pastel-crochet-gift-box",
    price: 175,
    badge: "CUSTOMIZABLE",
    badgeVariant: "default" as const,
    availability: "Made to Order" as const,
  },
];

export default function BestSellersSection() {
  return (
    <section className="bg-brand-cream py-16 sm:py-20">
      <div className="page-container">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
              Customer favourites
            </p>

            <h2 className="text-3xl sm:text-4xl">
              Best sellers
            </h2>
          </div>

          <Link
            href="/shop"
            className="text-sm font-medium text-brand-cocoa underline-offset-4 hover:underline"
          >
            Shop all
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellers.map((product) => (
            <ProductCard
              key={product.name}
              name={product.name}
              href={product.href}
              price={product.price}
              badge={product.badge}
              badgeVariant={product.badgeVariant}
              availability={product.availability}
            />
          ))}
        </div>
      </div>
    </section>
  );
}