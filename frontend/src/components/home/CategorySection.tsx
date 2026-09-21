import Link from "next/link";

const categories = [
  {
    name: "Flowers",
    href: "/shop/flowers",
    background: "bg-brand-blush",
  },
  {
    name: "Bouquets",
    href: "/shop/bouquets",
    background: "bg-[#F4E7DC]",
  },
  {
    name: "Keychains",
    href: "/shop/keychains",
    background: "bg-[#F7F0E8]",
  },
  {
    name: "Bags",
    href: "/shop/bags",
    background: "bg-brand-beige",
  },
  {
    name: "Baby Products",
    href: "/shop/baby-products",
    background: "bg-[#F3ECE7]",
  },
  {
    name: "Gift Boxes",
    href: "/shop/gift-boxes",
    background: "bg-[#F8EDEA]",
  },
];

export default function CategorySection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="page-container">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
              Explore our creations
            </p>

            <h2 className="text-3xl sm:text-4xl">
              Shop by category
            </h2>
          </div>

          <Link
            href="/shop"
            className="text-sm font-medium text-brand-cocoa underline-offset-4 hover:underline"
          >
            View all products
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              href={category.href}
              className={`
                group
                relative
                flex
                aspect-[4/5]
                flex-col
                justify-between
                overflow-hidden
                rounded-3xl
                border
                border-[#EADFD8]
                p-5
                transition-transform
                duration-200
                hover:-translate-y-1
                ${category.background}
              `}
            >
              <span className="text-xs font-medium tracking-[0.18em] text-[#8A7B72]">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div>
                <h3 className="text-xl leading-tight">
                  {category.name}
                </h3>

                <p className="mt-2 text-xs text-[#6B5A50] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  View collection →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}