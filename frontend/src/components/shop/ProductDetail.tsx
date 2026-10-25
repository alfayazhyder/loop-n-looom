"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiRequest, ApiError } from "@/lib/api";

import {
  normalizeProduct,
  type CatalogProduct,
} from "@/lib/catalog";

interface Props {
  slug: string;
}

export default function ProductDetail({
  slug,
}: Props) {
  const [product, setProduct] =
    useState<CatalogProduct | null>(null);

  const [status, setStatus] =
    useState<"loading" | "ready" | "error">(
      "loading",
    );

  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const result =
          await apiRequest<unknown>(
            `/api/products/${encodeURIComponent(slug)}`,
            {
              signal: controller.signal,
            },
          );

        if (controller.signal.aborted) return;

        setProduct(normalizeProduct(result));
        setStatus("ready");

      } catch (error) {
        if (controller.signal.aborted) return;

        if (
          error instanceof ApiError &&
          error.status === 404
        ) {
          setMessage("This creation was not found.");
        } else {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load this creation.",
          );
        }

        setStatus("error");
      }
    }

    void load();

    return () => controller.abort();
  }, [slug]);

  return (
    <section className="bg-brand-cream py-12 sm:py-20">
      <div className="page-container">
        <Link
          href="/shop"
          className="text-sm text-[#6B5A50] underline-offset-4 hover:underline"
        >
          ← Back to shop
        </Link>

        {status === "loading" && (
          <p role="status" className="mt-12">
            Loading product details...
          </p>
        )}

        {status === "error" && (
          <div role="alert" className="mt-12 rounded-3xl bg-white p-10">
            <h1 className="font-serif text-3xl">
              Product unavailable
            </h1>
            <p className="mt-4 text-[#6B5A50]">
              {message}
            </p>
          </div>
        )}

        {status === "ready" && !product && (
          <div className="mt-12 rounded-3xl bg-white p-10">
            <h1 className="font-serif text-3xl">
              Product unavailable
            </h1>
          </div>
        )}

        {status === "ready" && product && (
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
            <div className="flex aspect-[4/5] items-center justify-center rounded-[2.5rem] border border-[#EADFD8] bg-[#F8F2EC] p-10">
              <div className="flex h-full w-full items-center justify-center rounded-[2rem] bg-white/70 p-10 text-center">
                <span className="font-serif text-3xl text-[#8A7B72]">
                  {product.name}
                </span>
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-[#EADFD8] bg-white p-7 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">
                {product.categoryName ||
                  "Handmade with love"}
              </p>

              <h1 className="mt-4 font-serif text-4xl leading-tight text-brand-cocoa">
                {product.name}
              </h1>

              <p className="mt-6 text-2xl font-medium text-brand-cocoa">
                AED {product.price.toFixed(2)}
              </p>

              <p className="mt-6 inline-flex rounded-full bg-brand-blush px-5 py-3 text-sm text-brand-cocoa">
                {product.availability}
              </p>

              <p className="mt-8 whitespace-pre-line text-sm leading-8 text-[#6B5A50]">
                {product.description ||
                  "Thoughtfully handmade for the moments that matter."}
              </p>

              <div className="mt-10 rounded-3xl bg-brand-cream p-6">
                <h2 className="font-serif text-xl">
                  Made with care
                </h2>

                <p className="mt-3 text-sm leading-7 text-[#6B5A50]">
                  Every creation is prepared with
                  attention to detail. Shopping cart,
                  customisation and checkout actions
                  will be connected in the next
                  storefront integration batch.
                </p>
              </div>

              <Link
                href="/shop"
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-cocoa px-8 text-sm font-medium text-white"
              >
                Explore more creations
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}