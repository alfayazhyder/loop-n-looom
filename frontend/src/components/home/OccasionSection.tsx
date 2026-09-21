import Link from "next/link";

const occasions = [
  {
    name: "Birthday",
    href: "/occasions/birthday",
    description: "Thoughtful handmade gifts for their special day.",
  },
  {
    name: "Wedding",
    href: "/occasions/wedding",
    description: "Elegant keepsakes and personalised wedding gifts.",
  },
  {
    name: "Anniversary",
    href: "/occasions/anniversary",
    description: "Celebrate your story with something made by hand.",
  },
  {
    name: "Baby Shower",
    href: "/occasions/baby-shower",
    description: "Soft and meaningful gifts for beautiful new beginnings.",
  },
];

export default function OccasionSection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="page-container">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
            Celebrate every moment
          </p>

          <h2 className="text-3xl sm:text-4xl">
            Shop by occasion
          </h2>

          <p className="mt-4 text-sm leading-7 text-[#6B5A50] sm:text-base">
            Find meaningful handmade gifts created for life&apos;s most memorable
            moments.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {occasions.map((occasion, index) => (
            <Link
              key={occasion.name}
              href={occasion.href}
              className="
                group
                flex
                min-h-64
                flex-col
                justify-between
                rounded-3xl
                border
                border-[#EADFD8]
                bg-brand-blush
                p-6
                transition-all
                duration-200
                hover:-translate-y-1
                hover:shadow-[0_12px_35px_rgba(74,59,50,0.08)]
              "
            >
              <span className="text-xs font-medium tracking-[0.18em] text-[#8A7B72]">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div>
                <h3 className="text-2xl">
                  {occasion.name}
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#6B5A50]">
                  {occasion.description}
                </p>

                <p className="mt-5 text-sm font-medium text-brand-cocoa">
                  Explore gifts →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}