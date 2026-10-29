"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Gift,
  Heart,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import ProductCard from "@/components/ui/ProductCard";
import { apiRequest } from "@/lib/api";
import { normalizeCatalog, type CatalogProduct } from "@/lib/catalog";
import {
  productSearchApiPath,
  type ProductSearchFilters,
} from "@/lib/productSearch";

type TaxonomyItem = {
  id: string;
  slug: string;
  nameEn: string;
};

type ProductResponse = {
  products: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const fieldClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-white px-4 text-sm text-brand-cocoa outline-offset-2 focus:border-brand-cocoa";

const suggestions = [
  { label: "Crochet bouquets", value: "bouquet" },
  { label: "Handmade flowers", value: "flower" },
  { label: "Thoughtful gifts", value: "gift" },
];

function validTaxonomy(input: unknown): input is TaxonomyItem {
  if (!input || typeof input !== "object") return false;
  const item = input as Partial<TaxonomyItem>;
  return (
    typeof item.id === "string" &&
    typeof item.slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) &&
    typeof item.nameEn === "string" &&
    item.nameEn.trim().length > 0
  );
}

function asTaxonomy(input: unknown, key: "categories" | "occasions"): TaxonomyItem[] {
  if (!input || typeof input !== "object") return [];
  const data = input as Record<string, unknown>;
  const records = data[key];
  return Array.isArray(records) ? records.filter(validTaxonomy) : [];
}

export default function SearchExperience({ filters }: { filters: ProductSearchFilters }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [occasions, setOccasions] = useState<TaxonomyItem[]>([]);
  const [taxonomyError, setTaxonomyError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTaxonomy() {
      const results = await Promise.allSettled([
        apiRequest<unknown>("/api/catalog/categories", { signal: controller.signal }),
        apiRequest<unknown>("/api/catalog/occasions", { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;
      if (results[0].status === "fulfilled") {
        setCategories(asTaxonomy(results[0].value, "categories"));
      }
      if (results[1].status === "fulfilled") {
        setOccasions(asTaxonomy(results[1].value, "occasions"));
      }
      if (results.some((item) => item.status === "rejected")) {
        setTaxonomyError(true);
      }
    }

    void loadTaxonomy();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await apiRequest<ProductResponse>(
          productSearchApiPath(filters, page),
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (!response.pagination || !Array.isArray(response.products)) {
          throw new Error("The product catalogue returned an unexpected response.");
        }

        const incoming = normalizeCatalog(response);
        setProducts((previous) => {
          if (page === 1) return incoming;
          const ids = new Set(previous.map((item) => item.id));
          return [...previous, ...incoming.filter((item) => !ids.has(item.id))];
        });
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
        setError("");
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unable to search creations.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadProducts();
    return () => controller.abort();
  }, [filters, page]);

  const isFiltered = Boolean(
    filters.q || filters.category || filters.occasion || filters.color ||
    filters.minPrice || filters.maxPrice || filters.fulfillmentType || filters.sort !== "newest",
  );

  function loadMore() {
    if (loading || error || page >= totalPages) return;
    setLoading(true);
    setPage((previous) => previous + 1);
  }

  return (
    <section className="min-h-[72vh] bg-brand-cream pb-20 text-brand-cocoa">
      <div className="relative overflow-hidden border-b border-[#EADFD8] bg-[#F7EBE8] py-14 sm:py-20">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/60" />
        <div className="pointer-events-none absolute -right-2 -top-8 h-48 w-48 rounded-full border border-white/60" />
        <div className="page-container relative">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#78665B]">
            <Sparkles size={17} aria-hidden="true" /> A little something made with love
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">
            Find your next meaningful gift.
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-8 text-[#6B5A50] sm:text-base">
            Explore crochet bouquets, delicate handmade details and thoughtful creations.
            Search the live collection, then make your favourites your own.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/occasions" className="inline-flex items-center gap-2 rounded-full border border-[#D8C6BC] bg-white/75 px-5 py-3 text-sm font-medium transition hover:bg-white">
              <Gift size={17} aria-hidden="true" /> Shop by occasion
            </Link>
            <Link href="/wishlist" className="inline-flex items-center gap-2 rounded-full border border-[#D8C6BC] bg-white/75 px-5 py-3 text-sm font-medium transition hover:bg-white">
              <Heart size={17} aria-hidden="true" /> Your saved creations
            </Link>
          </div>
        </div>
      </div>

      <div className="page-container pt-10 sm:pt-14">
        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[2rem] border border-[#EADFD8] bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <div className="mb-6 flex items-center gap-3 border-b border-[#EADFD8] pb-5">
              <SlidersHorizontal size={20} aria-hidden="true" />
              <h2 className="font-serif text-2xl">Refine your search</h2>
            </div>

            <form action="/search" method="get" className="space-y-5">
              <label className="block text-sm font-medium">
                Search creations
                <div className="relative mt-2">
                  <Search size={18} className="pointer-events-none absolute left-4 top-4 text-[#8A7B72]" aria-hidden="true" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={filters.q}
                    maxLength={120}
                    placeholder="Bouquets, flowers, gifts..."
                    className="min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-white py-2 pl-11 pr-4 text-sm outline-offset-2 focus:border-brand-cocoa"
                  />
                </div>
              </label>

              <label className="block text-sm font-medium">
                Category
                <select name="category" defaultValue={filters.category} className={fieldClass}>
                  <option value="">All categories</option>
                  {filters.category && !categories.some((item) => item.slug === filters.category) && (
                    <option value={filters.category}>{filters.category.replaceAll("-", " ")}</option>
                  )}
                  {categories.map((item) => <option key={item.id} value={item.slug}>{item.nameEn}</option>)}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Occasion
                <select name="occasion" defaultValue={filters.occasion} className={fieldClass}>
                  <option value="">Every occasion</option>
                  {filters.occasion && !occasions.some((item) => item.slug === filters.occasion) && (
                    <option value={filters.occasion}>{filters.occasion.replaceAll("-", " ")}</option>
                  )}
                  {occasions.map((item) => <option key={item.id} value={item.slug}>{item.nameEn}</option>)}
                </select>
              </label>

              <label className="block text-sm font-medium">
                Flower or product colour
                <input type="text" name="color" defaultValue={filters.color} maxLength={60}
                  placeholder="e.g. pink" className={fieldClass} />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  Min. AED
                  <input type="number" name="minPrice" defaultValue={filters.minPrice} min="0" max="9999999"
                    step="0.01" placeholder="0" className={fieldClass} />
                </label>
                <label className="block text-sm font-medium">
                  Max. AED
                  <input type="number" name="maxPrice" defaultValue={filters.maxPrice} min="0" max="9999999"
                    step="0.01" placeholder="Any" className={fieldClass} />
                </label>
              </div>

              <label className="block text-sm font-medium">
                Availability
                <select name="fulfillmentType" defaultValue={filters.fulfillmentType} className={fieldClass}>
                  <option value="">All creations</option>
                  <option value="READY_STOCK">Ready stock</option>
                  <option value="MADE_TO_ORDER">Made to order</option>
                </select>
              </label>

              <label className="block text-sm font-medium">
                Sort by
                <select name="sort" defaultValue={filters.sort} className={fieldClass}>
                  <option value="newest">Newest first</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                </select>
              </label>

              <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-cocoa px-5 text-sm font-medium text-white transition hover:opacity-90">
                <Search size={17} aria-hidden="true" /> Show matching gifts
              </button>
              <Link href="/search" className="flex min-h-11 items-center justify-center gap-2 text-sm text-[#78665B] underline underline-offset-4">
                <X size={15} aria-hidden="true" /> Clear all filters
              </Link>
            </form>
            {taxonomyError && (
              <p role="status" className="mt-4 text-xs leading-6 text-[#8A7B72]">
                Some category filters could not load. Product search remains available.
              </p>
            )}
          </aside>

          <div className="min-w-0">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">Your discovery</p>
                <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
                  {filters.q ? `Results for “${filters.q}”` : "Handmade favourites"}
                </h2>
                <p role="status" aria-live="polite" className="mt-3 text-sm text-[#6B5A50]">
                  {loading && page === 1 ? "Searching our collection..." :
                    error && products.length === 0 ? "Search could not be completed." :
                    `${total} ${total === 1 ? "creation" : "creations"} found`}
                </p>
              </div>
              {isFiltered && <Link href="/search" className="text-sm font-medium underline underline-offset-4">See all creations</Link>}
            </div>

            {!isFiltered && !loading && !error && (
              <div className="mb-8 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-[#6B5A50]">Explore ideas:</span>
                {suggestions.map((item) => (
                  <Link key={item.value} href={`/search?q=${encodeURIComponent(item.value)}`}
                    className="rounded-full border border-[#EADFD8] bg-white px-4 py-2 text-xs font-medium transition hover:bg-[#F7EBE8]">
                    {item.label} <ArrowRight size={13} className="ml-1 inline" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}

            {loading && page === 1 && (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Searching products">
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <div key={index} className="animate-pulse">
                    <div className="aspect-[4/5] rounded-3xl bg-[#EADFD8]" />
                    <div className="mt-4 h-5 w-2/3 rounded-full bg-[#EADFD8]" />
                    <div className="mt-3 h-4 w-1/3 rounded-full bg-[#EADFD8]" />
                  </div>
                ))}
              </div>
            )}

            {error && <div role="alert" className="mb-7 rounded-3xl border border-[#EADFD8] bg-white p-6 text-sm text-[#A95757]">
              {error}
              <p className="mt-2 text-[#6B5A50]">Please check your filters or try again.</p>
            </div>}

            {products.length > 0 && (
              <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    productId={product.id}
                    name={product.name}
                    href={`/products/${encodeURIComponent(product.slug)}`}
                    price={product.price}
                    imageUrl={product.media[0]?.url}
                    availability={product.availability}
                    badge={product.isNewArrival ? "NEW" : product.isFeatured ? "FEATURED" : undefined}
                  />
                ))}
              </div>
            )}

            {!loading && !error && products.length === 0 && (
              <div className="rounded-[2rem] border border-[#EADFD8] bg-white px-8 py-16 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#F7EBE8]">
                  <Search size={35} strokeWidth={1.3} aria-hidden="true" />
                </div>
                <h3 className="mt-6 font-serif text-2xl">No matching creations just yet</h3>
                <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#6B5A50]">
                  Try a different search term, colour or price range. Our handmade collection is always growing.
                </p>
                <Link href="/search" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-brand-cocoa px-7 text-sm font-medium text-white">
                  Explore all creations
                </Link>
              </div>
            )}

            {!error && page < totalPages && products.length > 0 && (
              <div className="mt-12 text-center">
                <button type="button" disabled={loading} onClick={loadMore}
                  className="min-h-12 rounded-full bg-brand-cocoa px-8 text-sm font-medium text-white disabled:opacity-50">
                  {loading ? "Loading more..." : "Load more creations"}
                </button>
                <p className="mt-3 text-xs text-[#8A7B72]">Showing {products.length} of {total}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
