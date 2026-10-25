"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { apiJson, apiRequest } from "@/lib/api";
import { getCurrentCustomer, authenticatedRequest, isAuthenticationError } from "@/lib/session";
import {
  type Emirate, type SavedAddress, type ShippingAddress,
  type CheckoutPreview, type CheckoutPayload, type PaymentMethod,
  emirates, label, money, dateLabel,
} from "@/lib/checkout";

const emptyShipping: ShippingAddress = {
  recipientName: "", phone: "", emirate: "ABU_DHABI", city: "", area: "",
  street: "", building: "", apartmentOrVilla: "", landmark: "", deliveryInstructions: "",
};

interface CartResponse {
  cart: { items: Array<{ id: string }> } | null;
  summary: { itemCount: number; total: number; currency: string };
}

const fieldClass = "mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-white px-4 text-sm focus:border-brand-cocoa focus:outline-none";
const panelClass = "rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-8";

export default function CheckoutPreparation() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [useSaved, setUseSaved] = useState(false);
  const [addressId, setAddressId] = useState("");
  const [shipping, setShipping] = useState<ShippingAddress>(emptyShipping);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("VISA");
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const currentCart = await apiRequest<CartResponse>("/api/cart");
        if (!active) return;
        setCart(currentCart);
        try {
          const profile = await getCurrentCustomer();
          if (!active) return;
          setSignedIn(true);
          const fullName = [profile.user.firstName, profile.user.lastName].filter(Boolean).join(" ");
          setCustomerName(fullName);
          setCustomerEmail(profile.user.email);
          setCustomerPhone(profile.user.phone ?? "");
          const result = await authenticatedRequest<{ addresses: SavedAddress[] }>("/api/customer/addresses");
          if (!active) return;
          const list = Array.isArray(result.addresses) ? result.addresses : [];
          setAddresses(list);
          if (list.length) {
            setAddressId((list.find((address) => address.isDefault) ?? list[0]).id);
            setUseSaved(true);
          }
        } catch (cause) {
          if (!active) return;
          if (!isAuthenticationError(cause)) {
            setError(cause instanceof Error ? cause.message : "Could not load saved addresses.");
          }
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load shopping bag.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function updateShipping<Key extends keyof ShippingAddress>(key: Key, value: ShippingAddress[Key]) {
    setShipping((current) => ({ ...current, [key]: value }));
    setPreview(null);
  }

  function checkoutPayload(): CheckoutPayload {
    return {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      ...(useSaved
        ? { addressId }
        : {
            shippingAddress: {
              ...shipping,
              recipientName: shipping.recipientName.trim(),
              phone: shipping.phone.trim(),
              city: shipping.city.trim(),
              area: shipping.area.trim(),
            },
          }),
    };
  }

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setPreview(null);
    if (!cart?.summary.itemCount) {
      setError("Add at least one creation to your bag before checking out.");
      return;
    }
    if (useSaved && !addressId) {
      setError("Choose a saved delivery address.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiJson<CheckoutPreview>("/api/checkout/preview", "POST", checkoutPayload());
      setPreview(result);
      if (!result.paymentMethods.includes(paymentMethod)) {
        setPaymentMethod(result.paymentMethods[0] ?? "VISA");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Checkout could not be previewed.");
    } finally {
      setBusy(false);
    }
  }

  const ready = !loading && Boolean(cart?.summary.itemCount);
  const deliveryFields: Array<{ key: "recipientName" | "phone" | "city" | "area" | "street" | "building" | "apartmentOrVilla" | "landmark" | "deliveryInstructions"; title: string; required: boolean }> = [
    { key: "recipientName", title: "Recipient name", required: true },
    { key: "phone", title: "Recipient phone", required: true },
    { key: "city", title: "City", required: true },
    { key: "area", title: "Area", required: true },
    { key: "street", title: "Street", required: false },
    { key: "building", title: "Building", required: false },
    { key: "apartmentOrVilla", title: "Apartment or villa", required: false },
    { key: "landmark", title: "Landmark", required: false },
    { key: "deliveryInstructions", title: "Delivery instructions", required: false },
  ];

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7B72]">Thoughtfully delivered</p>
        <h1 className="mt-3 font-serif text-4xl text-brand-cocoa sm:text-5xl">Checkout</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">
          Enter your contact and UAE delivery details, then review the current checkout estimate calculated by the backend.
        </p>
        {loading && <p role="status" className="mt-8">Preparing your bag…</p>}
        {error && <p role="alert" className="mt-6 rounded-2xl bg-white p-5 text-sm text-red-700">{error}</p>}
        {!loading && !cart?.summary.itemCount && (
          <div className={`${panelClass} mt-8`}>
            <p>Your bag is empty. Add a handmade creation before starting checkout.</p>
            <Link href="/shop" className="mt-5 inline-block text-sm font-semibold underline">Browse creations</Link>
          </div>
        )}
        {ready && (
          <form onSubmit={(event) => void review(event)} className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_350px]">
            <div className="space-y-6">
              <section className={panelClass}>
                <h2 className="font-serif text-2xl">Your details</h2>
                {!signedIn && <p className="mt-3 text-sm text-[#6B5A50]">Checkout as a guest, or <Link href="/login" className="underline">sign in</Link> to use saved addresses.</p>}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {([
                    ["Full name", customerName, setCustomerName, "name"],
                    ["Email address", customerEmail, setCustomerEmail, "email"],
                    ["Phone number", customerPhone, setCustomerPhone, "tel"],
                  ] as const).map(([title, value, setter, inputType]) => (
                    <label key={title} className="text-sm font-medium">
                      {title}
                      <input
                        className={fieldClass}
                        type={inputType}
                        required
                        value={value}
                        onChange={(event) => { setter(event.target.value); setPreview(null); }}
                      />
                    </label>
                  ))}
                </div>
              </section>
              <section className={panelClass}>
                <h2 className="font-serif text-2xl">UAE delivery</h2>
                {signedIn && addresses.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-5 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={useSaved} onChange={() => { setUseSaved(true); setPreview(null); }} />
                      Saved address
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={!useSaved} onChange={() => { setUseSaved(false); setPreview(null); }} />
                      Another delivery address
                    </label>
                  </div>
                )}
                {useSaved ? (
                  <div className="mt-5 space-y-3">
                    <label className="block text-sm font-medium">Choose delivery address
                      <select className={fieldClass} value={addressId} required onChange={(event) => { setAddressId(event.target.value); setPreview(null); }}>
                        {addresses.map((address) => (
                          <option key={address.id} value={address.id}>
                            {address.recipientName} · {address.area}, {address.city} ({label(address.emirate)})
                          </option>
                        ))}
                      </select>
                    </label>
                    <Link href="/account/addresses" className="inline-block text-sm underline">Manage saved addresses</Link>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium">Emirate
                      <select className={fieldClass} value={shipping.emirate} onChange={(event) => updateShipping("emirate", event.target.value as Emirate)}>
                        {emirates.map((emirate) => <option value={emirate.value} key={emirate.value}>{emirate.label}</option>)}
                      </select>
                    </label>
                    {deliveryFields.map((field) => (
                      <label key={field.key} className="text-sm font-medium">{field.title}
                        <input
                          className={fieldClass}
                          type={field.key === "phone" ? "tel" : "text"}
                          required={field.required}
                          value={shipping[field.key] ?? ""}
                          onChange={(event) => updateShipping(field.key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </section>
              <section className={panelClass}>
                <h2 className="font-serif text-2xl">Payment preference</h2>
                <p className="mt-3 text-sm leading-7 text-[#6B5A50]">
                  Choose your preferred method for review. Cards are not charged here, and no payment credentials are requested.
                </p>
                <div className="mt-5 flex flex-wrap gap-4">
                  {([
                    ["VISA", "Visa"], ["MASTERCARD", "Mastercard"], ["APPLE_PAY", "Apple Pay"],
                  ] as const).map(([value, title]) => (
                    <label key={value} className="flex cursor-pointer items-center gap-2 rounded-full border border-[#EADFD8] px-5 py-3 text-sm">
                      <input type="radio" checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
                      {title}
                    </label>
                  ))}
                </div>
              </section>
            </div>
            <aside className={`${panelClass} h-fit lg:sticky lg:top-6`}>
              <h2 className="font-serif text-2xl">Order summary</h2>
              <div className="mt-5 flex justify-between text-sm"><span>Items in bag</span><span>{cart?.summary.itemCount}</span></div>
              <div className="mt-4 flex justify-between text-sm"><span>Cart estimate</span><span>{money(cart?.summary.total)}</span></div>
              <Link href="/cart" className="mt-4 inline-block text-xs underline">Edit bag or coupon</Link>
              <button type="submit" disabled={busy} className="mt-7 min-h-12 w-full rounded-full bg-brand-cocoa px-6 font-medium text-white disabled:opacity-50">
                {busy ? "Calculating…" : "Calculate checkout estimate"}
              </button>
              {preview && (
                <div aria-live="polite" className="mt-7 border-t border-[#EADFD8] pt-6">
                  <h3 className="font-serif text-xl">Current checkout estimate</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    {preview.items.map((item) => (
                      <div key={item.cartItemId} className="flex justify-between gap-3">
                        <span>{item.productName} × {item.quantity}</span><span>{money(item.subtotal)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between"><span>Subtotal</span><span>{money(preview.summary.subtotal)}</span></div>
                    <div className="flex justify-between"><span>Coupon discount</span><span>−{money(preview.summary.discountAmount)}</span></div>
                    <div className="flex justify-between"><span>Store credit</span><span>−{money(preview.summary.storeCreditAmount)}</span></div>
                    <div className="flex justify-between"><span>Gift wrap</span><span>{money(preview.summary.giftWrapAmount)}</span></div>
                    <div className="flex justify-between"><span>Delivery fee</span><span>{money(preview.summary.deliveryFee)}</span></div>
                    <div className="flex justify-between"><span>Tax</span><span>{money(preview.summary.taxAmount)}</span></div>
                    <div className="flex justify-between border-t border-[#EADFD8] pt-4 text-lg font-semibold"><span>Total</span><span>{money(preview.summary.total)}</span></div>
                    <p className="pt-2 text-xs text-[#6B5A50]">Estimated delivery: {dateLabel(preview.estimatedDeliveryAt)}</p>
                    {preview.couponCode && <p className="text-xs">Coupon: {preview.couponCode}</p>}
                  </div>
                  <p className="mt-6 rounded-2xl bg-brand-blush p-4 text-sm leading-6">
                    Online payment is not connected to a verified payment provider. Order submission is disabled to avoid creating unpaid orders or reserving stock without a payment path. Delivery, tax and gift-wrap charges currently default to zero in the backend and are not finalized pricing.
                  </p>
                  <button type="button" disabled className="mt-4 min-h-12 w-full cursor-not-allowed rounded-full bg-[#AB9D94] text-sm font-medium text-white" aria-label="Place order, unavailable until payment integration">
                    Place order · Coming soon
                  </button>
                  <Link href="/track-order" className="mt-5 block text-center text-sm underline">Already placed an order? Track it</Link>
                </div>
              )}
              {!preview && <p className="mt-5 text-xs leading-6 text-[#8A7B72]">The backend validates your bag and address for this estimate. Delivery, tax and gift-wrap fees are not yet configured; zero values should not be interpreted as free service. This page cannot place an order.</p>}
            </aside>
          </form>
        )}
      </div>
    </section>
  );
}
