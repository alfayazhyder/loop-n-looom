"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedRequest, isAuthenticationError } from "@/lib/session";
import {
  type OrderDetail, type OrderMedia, type Timeline, type Shipment,
  label, money, dateLabel, safeExternalUrl,
} from "@/lib/checkout";

const panel = "rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-8";

export function OrderTimeline({ timeline }: { timeline: Timeline }) {
  return (
    <div className="mt-5 space-y-4">
      {timeline.events.length === 0 ? <p className="text-sm text-[#6B5A50]">Current status: {label(timeline.currentStatus)}</p> :
        timeline.events.map((event) => (
          <div key={event.id} className="flex items-start gap-4 border-l-2 border-brand-cocoa py-1 pl-4">
            <div>
              <p className="text-sm font-medium">{label(event.status)}</p>
              <p className="mt-1 text-xs text-[#6B5A50]">{dateLabel(event.createdAt)}</p>
            </div>
          </div>
        ))}
    </div>
  );
}

export function QualityCheckPhotos({ media }: { media: OrderMedia[] }) {
  if (!media.length) return <p className="mt-4 text-sm text-[#6B5A50]">Quality-check photographs have not been added yet.</p>;
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {media.map((photo) => {
        const url = safeExternalUrl(photo.url);
        return (
          <figure key={photo.id} className="overflow-hidden rounded-2xl border border-[#EADFD8]">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={photo.caption || "Quality-check photograph"} loading="lazy" className="aspect-square w-full object-cover" />
            ) : <div className="flex aspect-square items-center justify-center p-5 text-center text-sm">Photo unavailable</div>}
            {photo.caption && <figcaption className="p-3 text-xs text-[#6B5A50]">{photo.caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}

export function ShipmentCard({ shipment }: { shipment: Shipment | null }) {
  if (!shipment) return <p className="mt-4 text-sm text-[#6B5A50]">Shipment details will appear when your order is prepared.</p>;
  const trackingUrl = safeExternalUrl(shipment.trackingUrl);
  return (
    <div className="mt-4 space-y-3 text-sm text-[#6B5A50]">
      <p>Status: <strong className="text-brand-cocoa">{label(shipment.status)}</strong></p>
      {shipment.courier && <p>Courier: {shipment.courier}</p>}
      {shipment.trackingNumber && <p>Tracking number: {shipment.trackingNumber}</p>}
      {shipment.estimatedDeliveryAt && <p>Expected delivery: {dateLabel(shipment.estimatedDeliveryAt)}</p>}
      {trackingUrl && <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-block font-semibold text-brand-cocoa underline">Track with courier ↗</a>}
    </div>
  );
}

export default function OrderDetailView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewIssue, setReviewIssue] = useState("");
  const [reviewNotice, setReviewNotice] = useState("");

  async function submitQcReview(decision: "APPROVED" | "CHANGES_REQUESTED") {
    if (!order || reviewBusy || order.status !== "QUALITY_CHECK") return;
    if (decision === "CHANGES_REQUESTED" && reviewNote.trim().length < 10) {
      setReviewIssue("Describe the changes requested in at least 10 characters.");
      return;
    }
    if (!window.confirm(decision === "APPROVED"
      ? "Confirm you have reviewed ALL current QC photos and approve packing this order?"
      : "Send these changes to the studio? Packing will remain blocked.")) return;
    setReviewBusy(true); setReviewIssue(""); setReviewNotice("");
    try {
      await authenticatedRequest(`/api/customer/orders/${encodeURIComponent(order.id)}/qc-review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ...(decision === "CHANGES_REQUESTED" ? { note: reviewNote.trim() } : {}) }),
      });
      const latest = await authenticatedRequest<OrderDetail>(`/api/customer/orders/${encodeURIComponent(order.id)}`);
      setOrder(latest);
      setReviewNote("");
      setReviewNotice(decision === "APPROVED"
        ? "Your approval is recorded. The studio can now prepare packing."
        : "Your change request was recorded. The studio must upload revised photos before you can approve.");
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      setReviewIssue(cause instanceof Error ? cause.message : "Unable to record your review.");
    } finally { setReviewBusy(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await authenticatedRequest<OrderDetail>(
          `/api/customer/orders/${encodeURIComponent(orderId)}`, { signal: controller.signal },
        );
        if (!controller.signal.aborted) setOrder(result);
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (isAuthenticationError(cause)) setSignedOut(true);
        else setError(cause instanceof Error ? cause.message : "Unable to load this order.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [orderId]);

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <Link href="/orders" className="text-sm underline">← Back to my orders</Link>
        {loading && <p role="status" className="mt-8">Loading order details…</p>}
        {signedOut && <div className={`${panel} mt-8`}><p>Please sign in to view your order.</p><Link href="/login" className="mt-4 inline-block underline">Sign in</Link></div>}
        {error && <p role="alert" className={`${panel} mt-8 text-sm text-red-700`}>{error}</p>}
        {order && !loading && (
          <>
            <div className="mt-7 flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">Order · {dateLabel(order.placedAt)}</p>
                <h1 className="mt-3 font-serif text-4xl">{order.orderNumber}</h1>
              </div>
              <span className="rounded-full bg-brand-blush px-5 py-3 text-sm font-medium">{label(order.status)}</span>
            </div>
            <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-6">
                <section className={panel}>
                  <h2 className="font-serif text-2xl">Your handmade creations</h2>
                  <div className="mt-6 divide-y divide-[#EADFD8]">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex flex-wrap justify-between gap-4 py-4 text-sm">
                        <div><p className="font-medium">{item.productName}</p>
                          {item.variantName && <p className="mt-1 text-[#6B5A50]">{item.variantName}</p>}
                          <p className="mt-1 text-[#6B5A50]">Quantity: {item.quantity}</p>
                          {order.status === "DELIVERED" && item.itemType === "PRODUCT" && (
                            <Link href={`/reviews/new?orderItemId=${encodeURIComponent(item.id)}`} className="mt-3 inline-block rounded-full border border-brand-cocoa px-4 py-2 text-xs font-medium text-brand-cocoa hover:bg-brand-cream">Write a review</Link>
                          )}
                        </div>
                        <span>{money(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className={panel}>
                  <h2 className="font-serif text-2xl">Order timeline</h2>
                  <OrderTimeline timeline={order.tracking} />
                </section>
                <section className={panel}>
                  <h2 className="font-serif text-2xl">Quality-check photographs</h2>
                  <QualityCheckPhotos media={order.media} />
                  {order.status === "QUALITY_CHECK" && (
                    <div className="mt-6 rounded-2xl border border-[#E4D5CB] bg-[#FCF9F5] p-5">
                      <h3 className="font-serif text-xl">Your approval before packing</h3>
                      <p className="mt-2 text-sm leading-6 text-[#6B5A50]">Review every quality-check photograph. Only approval from your signed-in account unlocks packing. If something needs adjusting, let our studio know.</p>
                      {order.qcReview.status === "PENDING" && order.media.length > 0 && <>
                        <label className="mt-5 block text-xs font-semibold text-[#6B5A50]">Request changes (describe what needs attention)
                          <textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#E4D5CB] bg-white p-3 text-sm" maxLength={1000} value={reviewNote} onChange={event => setReviewNote(event.target.value)} placeholder="Please change the ribbon colour…" />
                        </label>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button type="button" disabled={reviewBusy} onClick={() => void submitQcReview("APPROVED")} className="rounded-full bg-brand-cocoa px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">Approve photos &amp; packing</button>
                          <button type="button" disabled={reviewBusy || reviewNote.trim().length < 10} onClick={() => void submitQcReview("CHANGES_REQUESTED")} className="rounded-full border border-[#BCA69B] px-6 py-3 text-sm font-semibold disabled:opacity-50">Request changes</button>
                        </div>
                      </>}
                      {order.qcReview.status === "PENDING" && order.media.length === 0 && <p className="mt-4 text-sm text-[#8A7B72]">Waiting for the studio to upload your quality-check photos.</p>}
                      {order.qcReview.status === "APPROVED" && <p role="status" className="mt-4 text-sm font-semibold text-[#557A61]">Approved {dateLabel(order.qcReview.reviewedAt)}. Your studio can proceed to packing.</p>}
                      {order.qcReview.status === "CHANGES_REQUESTED" && <div className="mt-4 text-sm text-[#82583F]"><p className="font-semibold">Changes requested {dateLabel(order.qcReview.reviewedAt)}. Awaiting revised photos.</p>{order.qcReview.note && <p className="mt-2 whitespace-pre-wrap">{order.qcReview.note}</p>}</div>}
                      {reviewIssue && <p role="alert" className="mt-4 text-sm text-red-700">{reviewIssue}</p>}
                      {reviewNotice && <p role="status" className="mt-4 text-sm text-[#557A61]">{reviewNotice}</p>}
                    </div>
                  )}
                  {order.status !== "QUALITY_CHECK" && order.qcReview.status === "APPROVED" && <p className="mt-4 text-xs text-[#557A61]">Quality-check approval recorded {dateLabel(order.qcReview.reviewedAt)}.</p>}
                </section>
              </div>
              <div className="space-y-6">
                <section className={panel}>
                  <h2 className="font-serif text-2xl">Order total</h2>
                  <div className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{money(order.amounts.subtotal)}</span></div>
                    <div className="flex justify-between"><span>Discount</span><span>−{money(order.amounts.discountAmount)}</span></div>
                    <div className="flex justify-between"><span>Store credit</span><span>−{money(order.amounts.storeCreditAmount)}</span></div>
                    <div className="flex justify-between"><span>Gift wrap</span><span>{money(order.amounts.giftWrapAmount)}</span></div>
                    <div className="flex justify-between"><span>Delivery</span><span>{money(order.amounts.deliveryFee)}</span></div>
                    <div className="flex justify-between"><span>Tax</span><span>{money(order.amounts.taxAmount)}</span></div>
                    <div className="flex justify-between border-t border-[#EADFD8] pt-4 text-lg font-semibold"><span>Total</span><span>{money(order.amounts.totalAmount)}</span></div>
                    <p className="pt-2 text-xs text-[#6B5A50]">Estimated delivery: {dateLabel(order.estimatedDeliveryAt)}</p>
                  </div>
                </section>
                <section className={panel}>
                  <h2 className="font-serif text-2xl">Delivery address</h2>
                  <p className="mt-4 text-sm leading-7 text-[#6B5A50]">
                    {order.shippingAddress.recipientName}<br />
                    {order.shippingAddress.area}, {order.shippingAddress.city}<br />
                    {label(order.shippingAddress.emirate)}<br />
                    {order.shippingAddress.phone}
                  </p>
                </section>
                <section className={panel}>
                  <h2 className="font-serif text-2xl">Payment</h2>
                  <div className="mt-4 space-y-2 text-sm text-[#6B5A50]">
                    {order.payments.length ? order.payments.map((payment) => (
                      <p key={payment.id}>{label(payment.method)} · {label(payment.status)} · {money(payment.amount)}</p>
                    )) : <p>No separate payment record is available.</p>}
                    {order.status === "PENDING_PAYMENT" && <p className="pt-2">Payment is pending. Online payment is not yet enabled on the storefront.</p>}
                  </div>
                </section>
                <section className={panel}>
                  <h2 className="font-serif text-2xl">Shipment</h2>
                  <ShipmentCard shipment={order.shipment} />
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
