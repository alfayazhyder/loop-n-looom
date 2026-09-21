export default function NewsletterSection() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="page-container">
        <div className="rounded-[2.5rem] border border-[#EADFD8] bg-brand-blush px-6 py-12 text-center sm:px-10 lg:py-16">
          <div className="mx-auto max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
              Stay in the loop
            </p>

            <h2 className="text-3xl sm:text-4xl">
              Beautiful things are always in the making.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#6B5A50] sm:text-base">
              Be the first to hear about new handmade creations, seasonal
              collections, gifting ideas and special offers.
            </p>

            <form
              className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
              action="#"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>

              <input
                id="newsletter-email"
                type="email"
                placeholder="Enter your email address"
                className="
                  min-h-14
                  flex-1
                  rounded-full
                  border
                  border-[#EADFD8]
                  bg-white
                  px-6
                  text-sm
                  text-brand-cocoa
                  outline-none
                  placeholder:text-[#A99B92]
                  focus:border-brand-cocoa
                "
              />

              <button
                type="submit"
                className="
                  min-h-14
                  rounded-full
                  bg-brand-cocoa
                  px-8
                  text-sm
                  font-medium
                  text-white
                  transition-opacity
                  hover:opacity-90
                "
              >
                Join the List
              </button>
            </form>

            <p className="mt-4 text-xs leading-5 text-[#8A7B72]">
              Newsletter signup is currently UI-only and will be connected to
              the backend later.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}