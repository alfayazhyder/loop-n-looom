import Link from "next/link";

import ProductCard from "@/components/ui/ProductCard";

const newArrivals = [
  {
    name: "Crochet Daisy Bunch",
    href: "/products/crochet-daisy-bunch",
    price: 85,
    badge: "NEW",
    badgeVariant: "success" as const,
    availability: "Made to Order" as const,
  },
  {
    name: "Mini Heart Keychain",
    href: "/products/mini-heart-keychain",
    price: 28,
    badge: "NEW",
    badgeVariant: "blush" as const,
    availability: "Ready Stock" as const,
  },
  {
    name: "Crochet Baby Gift Set",
    href: "/products/crochet-baby-gift-set",
    price: 165,
    badge: "HANDMADE",
    badgeVariant: "beige" as const,
    availability: "Made to Order" as const,
  },
  {
    name: "Personalised Crochet Bookmark",
    href: "/products/personalised-crochet-bookmark",
    price: 32,
    badge: "CUSTOMIZABLE",
    badgeVariant: "default" as const,
    availability: "Made to Order" as const,
  },
];

export default function NewArrivalsSection() {
  return (
    <section className="bg-brand-cream py-16 sm:py-20">
      <div className="page-container">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
              Fresh from our studio
            </p>

            <h2 className="text-3xl sm:text-4xl">
              New arrivals
            </h2>
          </div>

          <Link
            href="/shop?sort=newest"
            className="text-sm font-medium text-brand-cocoa underline-offset-4 hover:underline"
          >
            View newest
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {newArrivals.map((product) => (
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