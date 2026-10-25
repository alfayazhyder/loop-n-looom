"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ProductCard from "@/components/ui/ProductCard";
import { apiRequest } from "@/lib/api";

import {
  normalizeCatalog,
  type CatalogProduct,
} from "@/lib/catalog";

interface Props {
  title: string;
  eyebrow: string;
  filter: "featured" | "newArrival";
}

export default function LiveProductSection({
  title,
  eyebrow,
  filter,
}: Props) {
  const [products, setProducts] =
    useState<CatalogProduct[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const params = new URLSearchParams({
        limit: "4",
        page: "1",
        [filter]: "true",
      });

      try {
        const response = await apiRequest<unknown>(
          `/api/products?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) return;

        setProducts(normalizeCatalog(response));
      } catch (caught) {
        if (controller.signal.aborted) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load this collection.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [filter]);

  return (
    <section className="bg-brand-cream py-16 sm:py-20">
      <div className="page-container">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
              {eyebrow}
            </p>

            <h2 className="text-3xl sm:text-4xl">
              {title}
            </h2>
          </div>

          <Link
            href="/shop"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Shop all creations
          </Link>
        </div>

        {loading && (
          <p role="status" className="text-sm text-[#6B5A50]">
            Loading creations...
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-[#A95757]">
            {error}
          </p>
        )}

        {!loading && !error && products.length === 0 && (
          <p className="rounded-3xl border border-[#EADFD8] bg-white p-8 text-sm text-[#6B5A50]">
            New handmade creations will appear here
            when they are added to our collection.
          </p>
        )}

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
                filter === "newArrival"
                  ? "NEW"
                  : "FEATURED"
              }
              badgeVariant="blush"
            />
          ))}
        </div>
      </div>
    </section>
  );
}