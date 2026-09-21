import Link from "next/link";

import Logo from "@/components/Logo";

export default function HeroSection() {
  return (
    <section className="overflow-hidden bg-brand-cream">
      <div className="page-container grid min-h-[620px] items-center gap-12 py-16 lg:grid-cols-2 lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
            Handmade in the UAE
          </p>

          <h1 className="text-5xl leading-[1.08] text-brand-cocoa sm:text-6xl lg:text-7xl">
            Handmade moments,
            <span className="block italic">crafted with love.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-8 text-[#6B5A50] sm:text-lg">
            Discover premium crochet creations, thoughtful gifts and
            personalised pieces made to turn special moments into lasting
            memories.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/shop"
              className="
                inline-flex
                min-h-14
                items-center
                justify-center
                rounded-full
                border
                border-brand-cocoa
                bg-brand-cocoa
                px-8
                text-sm
                font-medium
                tracking-wide
                text-white
                transition-opacity
                hover:opacity-90
              "
            >
              Shop Collection
            </Link>

            <Link
              href="/custom-crochet"
              className="
                inline-flex
                min-h-14
                items-center
                justify-center
                rounded-full
                border
                border-brand-cocoa
                px-8
                text-sm
                font-medium
                tracking-wide
                text-brand-cocoa
                transition-colors
                hover:bg-brand-blush
              "
            >
              Create Something Custom
            </Link>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-xl items-center justify-center">
          <div className="absolute left-0 top-10 h-40 w-40 rounded-full bg-brand-blush" />

          <div className="absolute bottom-8 right-0 h-52 w-52 rounded-full bg-brand-beige/70" />

          <div
            className="
              relative
              z-10
              flex
              aspect-[4/5]
              w-[82%]
              max-w-md
              flex-col
              items-center
              justify-center
              rounded-[2.5rem]
              border
              border-[#EADFD8]
              bg-white
              px-10
              text-center
              shadow-[0_18px_60px_rgba(74,59,50,0.10)]
            "
          >
            <Logo size={210} priority />

            <p className="mt-8 font-serif text-2xl text-brand-cocoa">
              Made by hand.
            </p>

            <p className="mt-2 text-sm leading-6 text-[#8A7B72]">
              Thoughtfully created for the people and moments that matter.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}