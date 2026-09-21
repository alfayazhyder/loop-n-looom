import Link from "next/link";
import { ArrowRight, ImagePlus, MessageCircleMore, Palette } from "lucide-react";

export default function CustomCrochetPromo() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="page-container">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div
            className="
              flex
              min-h-[460px]
              items-center
              justify-center
              rounded-[2.5rem]
              border
              border-[#EADFD8]
              bg-brand-blush
              p-8
            "
          >
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-brand-cocoa shadow-sm">
                <ImagePlus size={32} strokeWidth={1.6} />
              </div>

              <p className="mt-6 font-serif text-3xl text-brand-cocoa">
                Your idea, made by hand.
              </p>

              <p className="mt-4 text-sm leading-7 text-[#6B5A50]">
                Upload your inspiration and tell us what you&apos;d love to
                create.
              </p>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
              Bespoke commissions
            </p>

            <h2 className="max-w-xl text-4xl leading-tight sm:text-5xl">
              Create your own crochet.
            </h2>

            <p className="mt-6 max-w-xl text-sm leading-7 text-[#6B5A50] sm:text-base">
              Have something unique in mind? Share your inspiration images,
              preferred colours, size, occasion and delivery date. Our team
              will review your request and send you a personalised quotation.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-[#EADFD8] bg-brand-cream p-5">
                <Palette size={22} strokeWidth={1.7} />

                <h3 className="mt-4 text-xl">
                  Personalise every detail
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#6B5A50]">
                  Choose colours, dimensions, occasion and style.
                </p>
              </div>

              <div className="rounded-3xl border border-[#EADFD8] bg-brand-cream p-5">
                <MessageCircleMore size={22} strokeWidth={1.7} />

                <h3 className="mt-4 text-xl">
                  Chat with our team
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#6B5A50]">
                  Clarify your idea before accepting the final quotation.
                </p>
              </div>
            </div>

            <Link
              href="/custom-crochet"
              className="
                mt-8
                inline-flex
                min-h-14
                items-center
                justify-center
                gap-2
                rounded-full
                bg-brand-cocoa
                px-7
                text-sm
                font-medium
                text-white
                transition-opacity
                hover:opacity-90
              "
            >
              Start a Custom Request
              <ArrowRight size={17} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}