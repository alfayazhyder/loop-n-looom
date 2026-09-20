import AnnouncementBar from "@/components/layout/AnnouncementBar";
import CustomerHeader from "@/components/layout/CustomerHeader";
import MobileNavigation from "@/components/layout/MobileNavigation";

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <CustomerHeader />

      <main className="page-container pb-24 pt-20 lg:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#8A7B72]">
            Handmade with love
          </p>

          <h1 className="text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Welcome to LOOP_N_LOOOM
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#6B5A50] sm:text-lg">
            Premium handmade crochet creations and thoughtful customised gifts
            crafted for special moments.
          </p>
        </div>
      </main>

      <MobileNavigation />
    </>
  );
}