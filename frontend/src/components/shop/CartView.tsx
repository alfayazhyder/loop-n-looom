"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import { apiJson, apiRequest } from "@/lib/api";

interface CartItem {
  id: string;
  quantity: number;
  unitPrice: string | number;
  product: {
    id: string;
    nameEn: string;
    slug: string;
  } | null;
  variant: {
    id: string;
    nameEn?: string | null;
    colorEn?: string | null;
    size?: string | null;
  } | null;
}

interface CartResponse {
  cart: {
    id: string;
    items: CartItem[];
    coupon?: {
      code: string;
    } | null;
  } | null;
  summary: {
    itemCount: number;
    subtotal: number;
    discountAmount: number;
    total: number;
    currency: string;
  };
}

function money(value: number | string) {
  return `AED ${Number(value).toFixed(2)}`;
}

export default function CartView() {
  const [data, setData] =
    useState<CartResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coupon, setCoupon] = useState("");

  const loadCart = useCallback(async () => {
    const response =
      await apiRequest<CartResponse>("/api/cart");

    setData(response);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response =
          await apiRequest<CartResponse>("/api/cart");

        if (active) setData(response);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load your cart.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function perform(
    operation: () => Promise<unknown>,
  ) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await operation();
      await loadCart();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update cart.",
      );
    } finally {
      setBusy(false);
    }
  }

  function applyCoupon(event: FormEvent) {
    event.preventDefault();

    const code = coupon.trim();

    if (!code) return;

    void perform(async () => {
      await apiJson(
        "/api/cart/coupon",
        "POST",
        { code },
      );

      setCoupon("");
    });
  }

  const items = data?.cart?.items ?? [];

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
          Handmade with love
        </p>

        <h1 className="font-serif text-4xl sm:text-5xl">
          Your Shopping Bag
        </h1>

        {loading && (
          <p role="status" className="mt-10">
            Loading your shopping bag...
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-8 rounded-2xl border border-[#EADFD8] bg-white p-5 text-sm text-[#A95757]"
          >
            {error}
          </p>
        )}

        {!loading && items.length === 0 && (
          <div className="mt-10 rounded-3xl border border-[#EADFD8] bg-white p-10 text-center">
            <h2 className="font-serif text-2xl">
              Your bag is waiting for something lovely.
            </h2>

            <p className="mt-4 text-sm text-[#6B5A50]">
              Browse our handmade collections to get started.
            </p>

            <Link
              href="/shop"
              className="mt-8 inline-flex min-h-12 items-center rounded-full bg-brand-cocoa px-8 text-sm text-white"
            >
              Explore Creations
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-[#EADFD8] bg-white p-6"
                >
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      {item.product?.slug ? (
                        <Link
                          href={`/products/${encodeURIComponent(item.product.slug)}`}
                          className="font-serif text-xl hover:underline"
                        >
                          {item.product.nameEn}
                        </Link>
                      ) : (
                        <h2 className="font-serif text-xl">
                          Custom handmade item
                        </h2>
                      )}

                      {item.variant && (
                        <p className="mt-2 text-sm text-[#6B5A50]">
                          {[
                            item.variant.nameEn,
                            item.variant.colorEn,
                            item.variant.size,
                          ]
                            .filter(Boolean)
                            .join(" / ")}
                        </p>
                      )}

                      <p className="mt-3 text-sm">
                        {money(item.unitPrice)} each
                      </p>
                    </div>

                    <p className="font-semibold">
                      {money(
                        Number(item.unitPrice) *
                          item.quantity,
                      )}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-3 text-sm">
                      Quantity
                      <input
                        type="number"
                        min={1}
                        max={20}
                        defaultValue={item.quantity}
                        key={`${item.id}-${item.quantity}`}
                        onChange={(event) => {
                          const quantity = Number(
                            event.target.value,
                          );

                          if (
                            !Number.isInteger(quantity) ||
                            quantity < 1 ||
                            quantity > 20
                          ) {
                            return;
                          }

                          void perform(() =>
                            apiJson(
                              `/api/cart/items/${item.id}`,
                              "PATCH",
                              { quantity },
                            ),
                          );
                        }}
                        disabled={busy}
                        className="w-20 rounded-xl border border-[#EADFD8] px-3 py-2"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void perform(() =>
                          apiJson(
                            `/api/cart/items/${item.id}`,
                            "DELETE",
                          ),
                        )
                      }
                      className="text-sm text-[#A95757] underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <aside className="h-fit rounded-3xl border border-[#EADFD8] bg-white p-7">
              <h2 className="font-serif text-2xl">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{data?.summary.itemCount ?? 0}</span>
                </div>

                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {money(data?.summary.subtotal ?? 0)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>
                    -{money(data?.summary.discountAmount ?? 0)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-[#EADFD8] pt-4 text-base font-semibold">
                  <span>Total</span>
                  <span>
                    {money(data?.summary.total ?? 0)}
                  </span>
                </div>
              </div>

              {data?.cart?.coupon && (
                <div className="mt-6 flex items-center justify-between rounded-2xl bg-brand-blush p-4 text-sm">
                  <span>
                    {data.cart.coupon.code}
                  </span>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void perform(() =>
                        apiJson(
                          "/api/cart/coupon",
                          "DELETE",
                        ),
                      )
                    }
                    className="underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              <form
                onSubmit={applyCoupon}
                className="mt-6 flex gap-2"
              >
                <input
                  value={coupon}
                  onChange={(event) =>
                    setCoupon(event.target.value)
                  }
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  className="min-w-0 flex-1 rounded-xl border border-[#EADFD8] px-3 py-3 text-sm"
                />

                <button
                  type="submit"
                  disabled={busy || !coupon.trim()}
                  className="rounded-xl bg-brand-cocoa px-4 text-sm text-white disabled:opacity-50"
                >
                  Apply
                </button>
              </form>

              <p className="mt-7 text-xs leading-6 text-[#8A7B72]">
                Final delivery charges and payment
                details are confirmed at checkout.
              </p>

              <Link
                href="/checkout"
                className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-brand-cocoa px-6 text-sm font-medium text-white"
              >
                Continue to Checkout
              </Link>

              <Link
                href="/shop"
                className="mt-4 block text-center text-sm underline"
              >
                Continue Shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}