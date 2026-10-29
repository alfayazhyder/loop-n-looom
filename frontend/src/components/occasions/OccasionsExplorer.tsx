"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Gift, Heart, Sparkles } from "lucide-react";

import { apiRequest } from "@/lib/api";
import { safeImageUrl } from "@/lib/catalog";

interface Occasion {
  id: string;
  nameEn: string;
  slug: string;
  imageUrl: string | null;
}

interface OccasionsResponse {
  occasions: Occasion[];
}

const accents = ["bg-[#F7EBE8]", "bg-[#EEDCC5]", "bg-[#F3EAE1]", "bg-[#F8F2EC]"];

function validOccasion(value: unknown): value is Occasion {
  if (typeof value !== "object" || value === null) return false;

  const item = value as Partial<Occasion>;

  return (
    typeof item.id === "string" &&
    typeof item.nameEn === "string" &&
    item.nameEn.trim().length > 0 &&
    typeof item.slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
  );
}

export default function OccasionsExplorer() {
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOccasions() {
      try {
        const response = await apiRequest<OccasionsResponse>(
          "/api/catalog/occasions",
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        if (!Array.isArray(response.occasions)) {
          throw new Error("The occasion catalogue is currently unavailable.");
        }

        setOccasions(response.occasions.filter(validOccasion));
        setError("");
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load occasions. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadOccasions();

    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setLoading(true);
    setError("");
    setAttempt((previous) => previous + 1);
  }

  return (
    <section className="min-h-[70vh] bg-brand-cream pb-20">
      <div className="border-b border-[#EADFD8] bg-[#F7EBE8] py-16 sm:py-24">
        <div className="page-container grid items-center gap-10 lg:grid-cols-[1fr_350px]">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
              <Sparkles size={15} aria-hidden="true" />
              Made for meaningful moments
            </p>
            <h1 className="mt-5 max-w-2xl font-serif text-4xl leading-tight text-brand-cocoa sm:text-6xl">
              Every moment deserves something handmade.
            </h1>
            <p className="mt-7 max-w-xl text-sm leading-8 text-[#6B5A50] sm:text-base">
              Explore our thoughtful crochet gifts by occasion, chosen to make
              life&apos;s celebrations feel a little more personal.
            </p>
            <Link
              href="/build-a-bouquet"
              className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-brand-cocoa px-7 text-sm font-medium text-white transition-opacity hover:opacity-85"
            >
              Design a special bouquet
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div
            aria-hidden="true"
            className="relative hidden aspect-square rounded-[3rem] border border-[#EADFD8] bg-[#FCF9F5] lg:flex lg:items-center lg:justify-center"
          >
            <div className="absolute inset-8 rounded-full border border-[#EADFD8]" />
            <div className="absolute inset-16 rounded-full border border-[#EADFD8]" />
            <Gift size={108} strokeWidth={0.85} className="relative text-[#AB8075]" />
            <Heart size={26} strokeWidth={1.3} className="absolute right-16 top-16 text-[#AB8075]" />
            <Sparkles size={28} strokeWidth={1.3} className="absolute bottom-16 left-16 text-[#AB8075]" />
          </div>
        </div>
      </div>

      <div className="page-container pt-14 sm:pt-20">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">
              Find the right gift
            </p>
            <h2 className="mt-3 font-serif text-3xl text-brand-cocoa sm:text-4xl">
              Shop by occasion
            </h2>
          </div>
          <Link href="/shop" className="text-sm font-medium text-brand-cocoa underline underline-offset-4">
            Explore all creations
          </Link>
        </div>

        {loading && (
          <div role="status" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-80 animate-pulse rounded-[2rem] bg-[#EADFD8]" />
            ))}
            <span className="sr-only">Loading occasions...</span>
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-[2rem] border border-[#EADFD8] bg-white p-8">
            <p className="text-sm text-[#A95757]">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-5 min-h-11 rounded-full bg-brand-cocoa px-6 text-sm font-medium text-white"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && occasions.length === 0 && (
          <div className="rounded-[2rem] border border-[#EADFD8] bg-white px-7 py-12 text-center">
            <h3 className="font-serif text-2xl text-brand-cocoa">More celebrations are coming soon.</h3>
            <p className="mt-3 text-sm leading-7 text-[#6B5A50]">
              No occasions are published just yet. You can still explore every handmade creation.
            </p>
            <Link href="/shop" className="mt-5 inline-block text-sm font-semibold text-brand-cocoa underline">
              Shop all gifts
            </Link>
          </div>
        )}

        {!loading && !error && occasions.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {occasions.map((occasion, index) => {
              const image = safeImageUrl(occasion.imageUrl ?? "");

              return (
                <Link
                  href={`/occasions/${encodeURIComponent(occasion.slug)}`}
                  key={occasion.id}
                  className={`group relative flex min-h-80 flex-col overflow-hidden rounded-[2rem] border border-[#EADFD8] ${accents[index % accents.length]} p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(74,59,50,0.09)]`}
                >
                  {image && (
                    // Product and occasion images are served by the asset provider.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover opacity-35 transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#FCF9F5]/95 via-[#FCF9F5]/35 to-transparent" />
                  <span className="relative text-xs font-semibold tracking-[0.18em] text-[#6B5A50]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="relative mt-auto">
                    <h3 className="font-serif text-3xl text-brand-cocoa">
                      {occasion.nameEn}
                    </h3>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand-cocoa">
                      Explore handmade gifts
                      <ArrowUpRight size={17} aria-hidden="true" className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
