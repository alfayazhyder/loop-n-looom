import Link from "next/link";
import { Flower2, Heart, Sparkles } from "lucide-react";

export default function BrandStorySection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="page-container">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div
            className="
              flex
              min-h-[480px]
              items-center
              justify-center
              rounded-[2.5rem]
              border
              border-[#EADFD8]
              bg-[#F8F2EC]
              p-8
            "
          >
            <div className="max-w-md text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-brand-cocoa shadow-sm">
                <Flower2 size={34} strokeWidth={1.6} />
              </div>

              <p className="mt-7 font-serif text-3xl leading-tight text-brand-cocoa">
                Handmade slowly.
                <span className="block italic">Remembered for longer.</span>
              </p>

              <p className="mt-4 text-sm leading-7 text-[#6B5A50]">
                Every piece is created with care, patience and thoughtful
                attention to the little details.
              </p>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
              The LOOP_N_LOOOM story
            </p>

            <h2 className="max-w-xl text-4xl leading-tight sm:text-5xl">
              Gifts should feel personal.
            </h2>

            <p className="mt-6 max-w-xl text-sm leading-7 text-[#6B5A50] sm:text-base">
              LOOP_N_LOOOM brings together handmade crochet, thoughtful
              customisation and meaningful gifting. We create pieces designed
              to feel personal from the moment they are chosen to the moment
              they are received.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#EADFD8] bg-brand-cream p-5">
                <Heart size={22} strokeWidth={1.7} />

                <h3 className="mt-4 text-xl">
                  Made with care
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#6B5A50]">
                  Thoughtful handmade details in every creation.
                </p>
              </div>

              <div className="rounded-3xl border border-[#EADFD8] bg-brand-cream p-5">
                <Sparkles size={22} strokeWidth={1.7} />

                <h3 className="mt-4 text-xl">
                  Made for you
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#6B5A50]">
                  Personalised colours, messages and custom ideas.
                </p>
              </div>
            </div>

            <Link
              href="/about"
              className="
                mt-8
                inline-flex
                min-h-12
                items-center
                justify-center
                rounded-full
                border
                border-brand-cocoa
                px-7
                text-sm
                font-medium
                text-brand-cocoa
                transition-colors
                hover:bg-brand-blush
              "
            >
              Our Story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}