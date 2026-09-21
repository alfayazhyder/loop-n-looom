import { Star } from "lucide-react";

const reviews = [
  {
    name: "Sarah A.",
    text: "The bouquet looked even more beautiful in person. The handmade details were perfect and the packaging felt so special.",
    rating: 5,
  },
  {
    name: "Mariam K.",
    text: "I ordered a customised crochet gift and loved how easy it was to explain what I wanted. The final result felt very personal.",
    rating: 5,
  },
  {
    name: "Noor F.",
    text: "Such a lovely gifting experience. Everything felt thoughtful from the product to the presentation.",
    rating: 5,
  },
];

export default function CustomerLoveSection() {
  return (
    <section className="bg-brand-cream py-16 sm:py-20">
      <div className="page-container">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
            Customer love
          </p>

          <h2 className="text-3xl sm:text-4xl">
            Made for moments people remember.
          </h2>

          <p className="mt-4 text-sm leading-7 text-[#6B5A50] sm:text-base">
            A preview of how customer reviews will appear once verified buyer
            feedback is connected to the platform.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {reviews.map((review) => (
            <article
              key={review.name}
              className="
                rounded-3xl
                border
                border-[#EADFD8]
                bg-white
                p-7
                shadow-[0_4px_20px_rgba(74,59,50,0.05)]
              "
            >
              <div
                className="flex items-center gap-1 text-[#A9783F]"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {Array.from({ length: review.rating }).map((_, index) => (
                  <Star
                    key={index}
                    size={17}
                    strokeWidth={1.7}
                    fill="currentColor"
                  />
                ))}
              </div>

              <blockquote className="mt-6 text-sm leading-7 text-[#6B5A50]">
                “{review.text}”
              </blockquote>

              <p className="mt-6 text-sm font-semibold text-brand-cocoa">
                {review.name}
              </p>

              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8A7B72]">
                Demo review
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}