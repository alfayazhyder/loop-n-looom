"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import WishlistButton from "@/components/wishlist/WishlistButton";
import ProductReviews from "@/components/reviews/ProductReviews";

import { apiJson, apiRequest } from "@/lib/api";

import {
  normalizeProduct,
  type CatalogProduct,
} from "@/lib/catalog";

export default function ProductDetail({
  slug,
}: {
  slug: string;
}) {
  const router = useRouter();

  const [product, setProduct] =
    useState<CatalogProduct | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [variantId, setVariantId] = useState("");
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);

      try {
        const result = await apiRequest<unknown>(
          `/api/products/${encodeURIComponent(slug)}`,
          {
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) return;

        const next = normalizeProduct(result);

        setProduct(next);
        setVariantId(next?.variants[0]?.id ?? "");
        setImageIndex(0);
      } catch (error) {
        if (controller.signal.aborted) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load product.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [slug]);

  const variant = product?.variants.find(
    (item) => item.id === variantId,
  );

  const price =
    variant?.price ?? product?.price ?? 0;

  const soldOut =
    product?.fulfillmentType === "READY_STOCK" &&
    (
      product.variants.length === 0 ||
      !variant ||
      variant.stockQuantity < 1
    );

  const maxQuantity =
    product?.fulfillmentType === "READY_STOCK" &&
    variant
      ? Math.max(1, Math.min(20, variant.stockQuantity))
      : 20;

  async function addToCart() {
    if (!product || busy || soldOut) return;

    setBusy(true);
    setMessage("");

    try {
      await apiJson(
        "/api/cart/items",
        "POST",
        {
          productId: product.id,
          ...(variantId ? { variantId } : {}),
          quantity,
        },
      );

      router.push("/cart");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not add product to cart.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-brand-cream py-12 sm:py-20">
      <div className="page-container">
        <Link
          href="/shop"
          className="text-sm text-[#6B5A50] hover:underline"
        >
          ← Back to shop
        </Link>

        {loading && (
          <p role="status" className="mt-12">
            Loading this creation...
          </p>
        )}

        {!loading && !product && (
          <div className="mt-10 rounded-3xl bg-white p-10">
            <h1 className="text-3xl">
              Product unavailable
            </h1>
            <p className="mt-4">{message}</p>
          </div>
        )}

        {!loading && product && (
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
            <div>
              <div className="aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-[#EADFD8] bg-[#F8F2EC]">
                {product.media[imageIndex] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.media[imageIndex].url}
                    alt={product.media[imageIndex].alt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-10 text-center">
                    <span className="font-serif text-3xl text-[#8A7B72]">
                      {product.name}
                    </span>
                  </div>
                )}
              </div>

              {product.media.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {product.media.map((image, index) => (
                    <button
                      key={image.id || index}
                      type="button"
                      onClick={() => setImageIndex(index)}
                      aria-label={`View image ${index + 1}`}
                      aria-pressed={imageIndex === index}
                      className={`h-20 w-20 overflow-hidden rounded-2xl border-2 ${
                        imageIndex === index
                          ? "border-brand-cocoa"
                          : "border-[#EADFD8]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.alt}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[2.5rem] border border-[#EADFD8] bg-white p-7 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">
                {product.categoryName ||
                  "Handmade creation"}
              </p>

              <h1 className="mt-4 font-serif text-4xl leading-tight">
                {product.name}
              </h1>

              <p className="mt-6 text-2xl font-semibold">
                AED {price.toFixed(2)}
              </p>

              <p className="mt-5 inline-flex rounded-full bg-brand-blush px-5 py-3 text-sm">
                {product.availability}
              </p>

              <p className="mt-7 whitespace-pre-line text-sm leading-8 text-[#6B5A50]">
                {product.description ||
                  "Thoughtfully handmade for special moments."}
              </p>

              {product.productionMinDays !== null &&
                product.productionMaxDays !== null && (
                  <p className="mt-5 rounded-2xl bg-brand-cream p-4 text-sm">
                    Production time:{" "}
                    {product.productionMinDays}–
                    {product.productionMaxDays} days
                  </p>
                )}

              {product.variants.length > 0 && (
                <label className="mt-8 block text-sm font-medium">
                  Choose your variation
                  <select
                    value={variantId}
                    onChange={(event) => {
                      setVariantId(event.target.value);
                      setQuantity(1);
                    }}
                    className="mt-3 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-brand-cream px-4"
                  >
                    {product.variants.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                        disabled={
                          product.fulfillmentType ===
                            "READY_STOCK" &&
                          item.stockQuantity < 1
                        }
                      >
                        {item.name}
                        {item.price !== null
                          ? ` — AED ${item.price.toFixed(2)}`
                          : ""}
                        {product.fulfillmentType ===
                          "READY_STOCK"
                          ? ` (${item.stockQuantity} available)`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="mt-8 block text-sm font-medium">
                Quantity
                <input
                  type="number"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(event) => {
                    const parsed =
                      Number(event.target.value);

                    setQuantity(
                      Number.isFinite(parsed)
                        ? Math.max(
                            1,
                            Math.min(
                              maxQuantity,
                              Math.trunc(parsed),
                            ),
                          )
                        : 1,
                    );
                  }}
                  className="mt-3 block min-h-12 w-28 rounded-2xl border border-[#EADFD8] px-4"
                />
              </label>

              <button
                type="button"
                disabled={busy || soldOut}
                onClick={() => void addToCart()}
                className="mt-8 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-brand-cocoa px-6 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag size={19} />
                {soldOut
                  ? "Currently unavailable"
                  : busy
                    ? "Please wait..."
                    : "Add to Cart"}
              </button>

              <WishlistButton productId={product.id} name={product.name} display="detail" disabled={busy} />

              {message && (
                <p
                  role="status"
                  className="mt-5 text-sm text-[#6B5A50]"
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        )}
        {!loading && product && <ProductReviews slug={slug} />}
      </div>
    </section>
  );
}
