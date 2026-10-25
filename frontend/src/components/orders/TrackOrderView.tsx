"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { type TrackingResult, dateLabel, label, money } from "@/lib/checkout";
import { OrderTimeline, QualityCheckPhotos, ShipmentCard } from "@/components/orders/OrderDetailView";

const panel = "rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-8";

export default function TrackOrderView() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setResult(null);
    const normalized = orderNumber.trim().toUpperCase();
    if (!/^LNL-\d{4}-\d{6}$/.test(normalized)) {
      setError("Enter an order number in the format LNL-2026-123456.");
      return;
    }
    setBusy(true);
    try {
      const params = new URLSearchParams({ orderNumber: normalized });
      if (email.trim()) params.set("customerEmail", email.trim().toLowerCase());
      const data = await apiRequest<TrackingResult>(`/api/orders/track?${params.toString()}`);
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tracking details could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">From our studio to your door</p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Track your order</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">
          Guest orders require the order number and checkout email. Orders placed through a customer account require that customer to be signed in.
        </p>
        <form onSubmit={(event) => void track(event)} className={`${panel} mt-9 grid max-w-3xl gap-5 sm:grid-cols-2`}>
          <label className="text-sm">Order number
            <input required value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="LNL-2026-123456" maxLength={15}
              className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4 uppercase" />
          </label>
          <label className="text-sm">Checkout email (guest orders)
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"
              className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] px-4" />
          </label>
          <div className="sm:col-span-2">
            <button disabled={busy} type="submit" className="min-h-12 rounded-full bg-brand-cocoa px-9 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "Finding your order…" : "Show tracking"}
            </button>
            <Link href="/orders" className="ml-5 inline-block text-sm underline">My account orders</Link>
          </div>
        </form>
        {error && <p role="alert" className="mt-6 max-w-3xl rounded-2xl bg-white p-5 text-sm text-red-700">{error}</p>}
        {result && (
          <div className="mt-9 grid gap-6 lg:grid-cols-2">
            <section className={panel}>
              <h2 className="font-serif text-2xl">{result.orderNumber}</h2>
              <p className="mt-4 rounded-full bg-brand-blush px-4 py-2 text-sm">{label(result.status)}</p>
              <p className="mt-4 text-sm">Placed: {dateLabel(result.placedAt)}</p>
              <p className="mt-2 text-sm">Estimated arrival: {dateLabel(result.estimatedDeliveryAt)}</p>
              <p className="mt-2 font-semibold">Total: {money(result.amounts.totalAmount)}</p>
              <p className="mt-4 text-sm text-[#6B5A50]">Destination: {result.destination.area}, {result.destination.city} · {label(result.destination.emirate)}</p>
              <div className="mt-5 space-y-2 border-t border-[#EADFD8] pt-4 text-sm">
                {result.items.map((item) => <p key={item.id}>{item.productName} × {item.quantity}</p>)}
              </div>
            </section>
            <section className={panel}>
              <h2 className="font-serif text-2xl">Status timeline</h2>
              <OrderTimeline timeline={result.tracking} />
            </section>
            <section className={panel}>
              <h2 className="font-serif text-2xl">Shipment information</h2>
              <ShipmentCard shipment={result.shipment} />
            </section>
            <section className={panel}>
              <h2 className="font-serif text-2xl">Quality-check photographs</h2>
              <QualityCheckPhotos media={result.media} />
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
