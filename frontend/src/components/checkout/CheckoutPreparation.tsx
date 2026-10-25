"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  ShoppingBag,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { apiRequest } from "@/lib/api";

import {
  authenticatedRequest,
  isAuthenticationError,
} from "@/lib/session";

interface CartSummary {
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
}

interface Address {
  id: string;
  recipientName: string;
  emirate: string;
  city: string;
  area: string;
  isDefault: boolean;
}

function money(value: number) {
  return `AED ${Number(value).toFixed(2)}`;
}

export default function CheckoutPreparation() {
  const [summary, setSummary] =
    useState<CartSummary | null>(null);

  const [addresses, setAddresses] =
    useState<Address[]>([]);

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const cartResponse =
          await apiRequest<{
            summary: CartSummary;
          }>("/api/cart");

        if (!active) return;

        setSummary(cartResponse.summary);

        try {
          const addressResponse =
            await authenticatedRequest<{
              addresses: Address[];
            }>("/api/customer/addresses");

          if (!active) return;

          setLoggedIn(true);

          setAddresses(
            Array.isArray(addressResponse.addresses)
              ? addressResponse.addresses
              : [],
          );
        } catch (caught) {
          if (
            active &&
            !isAuthenticationError(caught)
          ) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Unable to load addresses.",
            );
          }
        }
      } catch (caught) {
        if (!active) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load your cart.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const defaultAddress =
    addresses.find(
      (address) => address.isDefault,
    ) ?? addresses[0];

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">
          Thoughtfully delivered
        </p>

        <h1 className="font-serif text-4xl sm:text-5xl">
          Checkout
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">
          Review your shopping bag and prepare your
          delivery details.
        </p>

        {loading && (
          <p role="status" className="mt-10">
            Preparing your checkout...
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-8 rounded-2xl bg-white p-5 text-sm text-[#A95757]"
          >
            {error}
          </p>
        )}

        {!loading && (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-[#EADFD8] bg-white p-7">
                <div className="flex items-center gap-3">
                  <ShoppingBag size={24} />

                  <h2 className="font-serif text-2xl">
                    Your Shopping Bag
                  </h2>
                </div>

                <p className="mt-5 text-sm text-[#6B5A50]">
                  {summary?.itemCount ?? 0} items
                  in your bag.
                </p>

                <Link
                  href="/cart"
                  className="mt-5 inline-block text-sm font-medium underline"
                >
                  Review Shopping Bag
                </Link>
              </div>

              <div className="rounded-3xl border border-[#EADFD8] bg-white p-7">
                <div className="flex items-center gap-3">
                  <MapPin size={24} />

                  <h2 className="font-serif text-2xl">
                    Delivery Information
                  </h2>
                </div>

                {defaultAddress ? (
                  <div className="mt-6">
                    <p className="text-sm font-medium">
                      {defaultAddress.recipientName}
                    </p>

                    <p className="mt-2 text-sm leading-7 text-[#6B5A50]">
                      {defaultAddress.area},{" "}
                      {defaultAddress.city}
                      <br />
                      {defaultAddress.emirate.replaceAll(
                        "_",
                        " ",
                      )}
                    </p>

                    <Link
                      href="/account/addresses"
                      className="mt-5 inline-block text-sm font-medium underline"
                    >
                      Manage Addresses
                    </Link>
                  </div>
                ) : (
                  <div className="mt-5">
                    <p className="text-sm leading-7 text-[#6B5A50]">
                      {loggedIn
                        ? "Add your delivery address to prepare for checkout."
                        : "You can sign in to use saved addresses, or continue with guest checkout when the full checkout flow is enabled."}
                    </p>

                    <Link
                      href={
                        loggedIn
                          ? "/account/addresses"
                          : "/login"
                      }
                      className="mt-5 inline-block text-sm font-medium underline"
                    >
                      {loggedIn
                        ? "Add Delivery Address"
                        : "Sign In"}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <aside className="h-fit rounded-3xl border border-[#EADFD8] bg-white p-7">
              <div className="flex items-center gap-3">
                <ShieldCheck size={23} />

                <h2 className="font-serif text-2xl">
                  Order Summary
                </h2>
              </div>

              <div className="mt-7 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>
                    {money(summary?.subtotal ?? 0)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>
                    -{money(
                      summary?.discountAmount ?? 0,
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-t border-[#EADFD8] pt-4 text-base font-semibold">
                  <span>Cart Total</span>
                  <span>
                    {money(summary?.total ?? 0)}
                  </span>
                </div>
              </div>

              <p className="mt-6 text-xs leading-6 text-[#8A7B72]">
                This is your cart total, not a final
                payment quotation. Shipping,
                applicable taxes and payment details
                will be confirmed during the full
                checkout process.
              </p>

              <div className="mt-7 rounded-2xl bg-brand-blush p-5">
                <p className="text-sm font-semibold">
                  Checkout integration in progress
                </p>

                <p className="mt-3 text-xs leading-6 text-[#6B5A50]">
                  Final order placement and online
                  payment are not active on this
                  screen yet. No payment will be
                  collected here.
                </p>
              </div>

              <Link
                href="/cart"
                className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-brand-cocoa px-6 text-sm font-medium text-white"
              >
                Return to Shopping Bag
              </Link>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}