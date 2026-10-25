"use client";

import { useEffect, useMemo, useState } from "react";

import ProductCard from "@/components/ui/ProductCard";

import { apiRequest } from "@/lib/api";

import {
  normalizeCatalog,
  type CatalogProduct,
} from "@/lib/catalog";

interface Props {
  category?: string;
}

type Status = "loading" | "ready" | "error";

export default function CatalogGrid({
  category,
}: Props) {
  const [products, setProducts] = useState<
    CatalogProduct[]
  >([]);

  const [status, setStatus] =
    useState<Status>("loading");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [availability, setAvailability] =
    useState("all");

  const [sort, setSort] =
    useState("newest");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response =
          await apiRequest<unknown>(
            "/api/products",
            {
              signal: controller.signal,
            },
          );

        if (controller.signal.aborted) return;

        setProducts(normalizeCatalog(response));
        setStatus("ready");

      } catch (error) {
        if (controller.signal.aborted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load products.",
        );

        setStatus("error");
      }
    }

    void load();

    return () => controller.abort();
  }, []);

  const visibleProducts = useMemo(() => {
    const search =
      query.trim().toLowerCase();

    const filtered = products.filter(
      (product) => {
        if (category) {
          const requested =
            category.toLowerCase();

          const matchingCategory =
            product.categorySlug.toLowerCase() ===
              requested ||
            product.categoryName
              .toLowerCase()
              .replaceAll(" ", "-") === requested;

          if (!matchingCategory) {
            return false;
          }
        }

        if (
          availability !== "all" &&
          product.availability !== availability
        ) {
          return false;
        }

        if (search) {
          const searchable = [
            product.name,
            product.description,
            product.categoryName,
          ]
            .join(" ")
            .toLowerCase();

          if (!searchable.includes(search)) {
            return false;
          }
        }

        return true;
      },
    );

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") {
        return a.price - b.price;
      }

      if (sort === "price-high") {
        return b.price - a.price;
      }

      if (sort === "name") {
        return a.name.localeCompare(b.name);
      }

      return b.createdAt.localeCompare(a.createdAt);
    });

  }, [products, category, query, availability, sort]);

  const heading = category
    ? category
        .split("-")
        .map(
          (part) =>
            part.charAt(0).toUpperCase() +
            part.slice(1),
        )
        .join(" ")
    : "Explore our creations";

  return (
    <section className="bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
          Thoughtfully handmade
        </p>

        <h1 className="font-serif text-4xl text-brand-cocoa sm:text-5xl">
          {heading}
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50] sm:text-base">
          Discover handmade crochet creations, personalised
          gifts and meaningful pieces made with care.
        </p>

        <div className="mt-10 grid gap-4 rounded-3xl border border-[#EADFD8] bg-white p-5 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-brand-cocoa">
            Search creations
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search products..."
              className="min-h-12 rounded-2xl border border-[#EADFD8] bg-brand-cream px-4 outline-none focus:border-brand-cocoa"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-brand-cocoa">
            Availability
            <select
              value={availability}
              onChange={(event) =>
                setAvailability(event.target.value)
              }
              className="min-h-12 rounded-2xl border border-[#EADFD8] bg-brand-cream px-4"
            >
              <option value="all">All products</option>
              <option value="Ready Stock">
                Ready stock
              </option>
              <option value="Made to Order">
                Made to order
              </option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-brand-cocoa">
            Sort products
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value)
              }
              className="min-h-12 rounded-2xl border border-[#EADFD8] bg-brand-cream px-4"
            >
              <option value="newest">Newest first</option>
              <option value="price-low">
                Price: low to high
              </option>
              <option value="price-high">
                Price: high to low
              </option>
              <option value="name">
                Name: A to Z
              </option>
            </select>
          </label>
        </div>

        {status === "loading" && (
          <div
            role="status"
            className="mt-10 rounded-3xl border border-[#EADFD8] bg-white p-10 text-center text-[#6B5A50]"
          >
            Loading handmade creations...
          </div>
        )}

        {status === "error" && (
          <div
            role="alert"
            className="mt-10 rounded-3xl border border-[#EADFD8] bg-white p-10 text-center"
          >
            <h2 className="font-serif text-2xl">
              We couldn&apos;t load the collection
            </h2>

            <p className="mt-3 text-sm text-[#6B5A50]">
              {errorMessage}
            </p>
          </div>
        )}

        {status === "ready" && (
          <>
            <p className="my-8 text-sm text-[#6B5A50]">
              {visibleProducts.length} creations found
            </p>

            {visibleProducts.length === 0 ? (
              <div className="rounded-3xl border border-[#EADFD8] bg-white p-10 text-center">
                <h2 className="font-serif text-2xl">
                  No matching creations yet
                </h2>

                <p className="mt-3 text-sm text-[#6B5A50]">
                  Try a different search or filter.
                </p>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.slug}
                    name={product.name}
                    href={`/products/${encodeURIComponent(product.slug)}`}
                    price={product.price}
                    availability={product.availability}
                    badge={
                      product.isNewArrival
                        ? "NEW"
                        : product.isFeatured
                          ? "FEATURED"
                          : undefined
                    }
                    badgeVariant={
                      product.isNewArrival
                        ? "success"
                        : "blush"
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}