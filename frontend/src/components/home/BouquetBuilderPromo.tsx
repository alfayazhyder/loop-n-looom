import Link from "next/link";
import { ArrowRight, Flower2, Gift, MessageSquareText } from "lucide-react";

export default function BouquetBuilderPromo() {
  return (
    <section className="bg-brand-cream py-16 sm:py-20">
      <div className="page-container">
        <div
          className="
            overflow-hidden
            rounded-[2.5rem]
            border
            border-[#EADFD8]
            bg-brand-cocoa
            px-6
            py-12
            text-white
            sm:px-10
            lg:px-14
            lg:py-16
          "
        >
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#EEDCC5]">
                Make it uniquely yours
              </p>

              <h2 className="max-w-xl text-4xl leading-tight text-white sm:text-5xl">
                Build your perfect crochet bouquet.
              </h2>

              <p className="mt-6 max-w-xl text-sm leading-7 text-[#F3E9E2] sm:text-base">
                Choose your flowers, wrapping colour, ribbon finish and a
                personalised card message to create a bouquet made especially
                for someone you love.
              </p>

              <Link
                href="/build-a-bouquet"
                className="
                  mt-8
                  inline-flex
                  min-h-14
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  bg-white
                  px-7
                  text-sm
                  font-medium
                  text-brand-cocoa
                  transition-transform
                  duration-200
                  hover:-translate-y-0.5
                "
              >
                Start Building
                <ArrowRight size={17} strokeWidth={1.8} />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl bg-white/10 p-5">
                <Flower2 size={24} strokeWidth={1.6} />

                <h3 className="mt-5 text-xl text-white">
                  Pick your flowers
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#F3E9E2]">
                  Roses, tulips, daisies, lavender and more.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <Gift size={24} strokeWidth={1.6} />

                <h3 className="mt-5 text-xl text-white">
                  Style the bouquet
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#F3E9E2]">
                  Choose wrapping colours and ribbon finishes.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-5">
                <MessageSquareText size={24} strokeWidth={1.6} />

                <h3 className="mt-5 text-xl text-white">
                  Add your message
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#F3E9E2]">
                  Finish it with a personalised gift card.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}