"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import ProductCard from "@/components/ui/ProductCard";
import { apiRequest } from "@/lib/api";

import {
  normalizeCatalog,
  type CatalogProduct,
} from "@/lib/catalog";

interface Props {
  category?: string;
}

interface CatalogResponse {
  products: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function CatalogGrid({
  category,
}: Props) {
  const [products, setProducts] =
    useState<CatalogProduct[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("");
  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "24",
        sort,
      });

      if (category) {
        params.set("category", category);
      }

      if (search) {
        params.set("search", search);
      }

      if (availability) {
        params.set("fulfillmentType", availability);
      }

      try {
        const response =
          await apiRequest<CatalogResponse>(
            `/api/products?${params.toString()}`,
            { signal: controller.signal },
          );

        if (controller.signal.aborted) return;

        const incoming = normalizeCatalog(response);

        setProducts((previous) => {
          if (page === 1) return incoming;

          const existing = new Set(
            previous.map((product) => product.id),
          );

          return [
            ...previous,
            ...incoming.filter(
              (product) => !existing.has(product.id),
            ),
          ];
        });

        setTotal(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
      } catch (caught) {
        if (controller.signal.aborted) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load products.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [category, search, availability, sort, page]);

  function resetFilters() {
    setProducts([]);
    setPage(1);
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    resetFilters();
    setSearch(searchInput.trim().slice(0, 120));
  }

  const heading = category
    ? category
        .split("-")
        .map(
          (word) =>
            word.charAt(0).toUpperCase() +
            word.slice(1),
        )
        .join(" ")
    : "Explore our creations";

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
          Thoughtfully handmade
        </p>

        <h1 className="font-serif text-4xl sm:text-5xl">
          {heading}
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">
          Discover thoughtful crochet creations and
          personalised gifts, handmade with care.
        </p>

        <form
          onSubmit={submitSearch}
          className="mt-10 grid gap-4 rounded-3xl border border-[#EADFD8] bg-white p-5 md:grid-cols-[1.4fr_1fr_1fr_auto]"
        >
          <label className="flex flex-col gap-2 text-sm">
            Search creations
            <input
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              maxLength={120}
              placeholder="Search handmade gifts"
              className="min-h-12 rounded-2xl border border-[#EADFD8] px-4"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Availability
            <select
              value={availability}
              onChange={(event) => {
                resetFilters();
                setAvailability(event.target.value);
              }}
              className="min-h-12 rounded-2xl border border-[#EADFD8] px-4"
            >
              <option value="">All creations</option>
              <option value="READY_STOCK">
                Ready stock
              </option>
              <option value="MADE_TO_ORDER">
                Made to order
              </option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Sort by
            <select
              value={sort}
              onChange={(event) => {
                resetFilters();
                setSort(event.target.value);
              }}
              className="min-h-12 rounded-2xl border border-[#EADFD8] px-4"
            >
              <option value="newest">
                Newest first
              </option>
              <option value="price_asc">
                Price: low to high
              </option>
              <option value="price_desc">
                Price: high to low
              </option>
              <option value="name_asc">
                Name: A to Z
              </option>
            </select>
          </label>

          <button
            type="submit"
            className="min-h-12 self-end rounded-full bg-brand-cocoa px-6 text-sm font-medium text-white"
          >
            Search
          </button>
        </form>

        <p className="my-8 text-sm text-[#6B5A50]">
          {loading && page === 1
            ? "Loading creations..."
            : `${total} creations found`}
        </p>

        {error && (
          <div
            role="alert"
            className="mb-8 rounded-3xl border border-[#EADFD8] bg-white p-6 text-sm text-[#A95757]"
          >
            {error}
          </div>
        )}

        {products.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                productId={product.id}
                name={product.name}
                href={`/products/${encodeURIComponent(product.slug)}`}
                price={product.price}
                imageUrl={product.media[0]?.url}
                availability={product.availability}
                badge={
                  product.isNewArrival
                    ? "NEW"
                    : product.isFeatured
                      ? "FEATURED"
                      : undefined
                }
                badgeVariant="blush"
              />
            ))}
          </div>
        )}

        {!loading &&
          !error &&
          products.length === 0 && (
            <div className="rounded-3xl border border-[#EADFD8] bg-white p-10 text-center">
              <h2 className="text-2xl">
                No matching creations yet
              </h2>
              <p className="mt-3 text-sm text-[#6B5A50]">
                Try a different search or filter.
              </p>
            </div>
          )}

        {page < totalPages && (
          <div className="mt-12 text-center">
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                setPage((current) => current + 1)
              }
              className="min-h-12 rounded-full bg-brand-cocoa px-8 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading
                ? "Loading..."
                : "Load more creations"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}