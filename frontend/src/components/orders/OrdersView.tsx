"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authenticatedRequest, isAuthenticationError } from "@/lib/session";
import { type OrderListItem, type OrderListResponse, orderStatuses, dateLabel, money, label } from "@/lib/checkout";

export default function OrdersView() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: "10" });
        if (status) params.set("status", status);
        const result = await authenticatedRequest<OrderListResponse>(
          `/api/customer/orders?${params.toString()}`, { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setOrders(result.orders);
        setTotalPages(result.pagination.totalPages);
        setTotalItems(result.pagination.totalItems);
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (isAuthenticationError(cause)) setSignedOut(true);
        else setError(cause instanceof Error ? cause.message : "Unable to load orders.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [page, status]);

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <Link href="/account" className="text-sm underline">← My account</Link>
        <h1 className="mt-5 font-serif text-4xl sm:text-5xl">My orders</h1>
        <p className="mt-3 text-sm text-[#6B5A50]">Follow your handmade gifts from order placement to delivery.</p>
        {signedOut ? (
          <div className="mt-10 rounded-3xl bg-white p-8">
            <p>Please sign in to view orders linked to your account.</p>
            <Link href="/login" className="mt-4 inline-block underline">Sign in</Link>
            <p className="mt-4 text-sm">Checked out as a guest? <Link href="/track-order" className="underline">Track with order number and email</Link>.</p>
          </div>
        ) : (
          <>
            <label className="mt-9 block max-w-xs text-sm">Filter by status
              <select className="mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-white px-4" value={status}
                onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                <option value="">All statuses</option>
                {orderStatuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </select>
            </label>
            {loading && <p role="status" className="mt-8">Loading orders…</p>}
            {error && <p role="alert" className="mt-8 rounded-2xl bg-white p-5 text-sm text-red-700">{error}</p>}
            {!loading && !error && (
              <>
                <p className="mt-7 text-sm text-[#6B5A50]">{totalItems} orders found</p>
                {orders.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-[#EADFD8] bg-white p-9">
                    <p>No orders match this filter.</p>
                    <Link href="/shop" className="mt-4 inline-block text-sm underline">Browse creations</Link>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-5">
                    {orders.map((order) => (
                      <article key={order.id} className="rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A7B72]">Order · {dateLabel(order.placedAt)}</p>
                            <h2 className="mt-3 font-serif text-2xl">{order.orderNumber}</h2>
                            <p className="mt-3 text-sm text-[#6B5A50]">{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(" · ")}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block rounded-full bg-brand-blush px-4 py-2 text-xs">{label(order.status)}</span>
                            <p className="mt-3 font-semibold">{money(order.amounts.totalAmount)}</p>
                          </div>
                        </div>
                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#EADFD8] pt-5">
                          <p className="text-xs text-[#6B5A50]">Estimated delivery: {dateLabel(order.estimatedDeliveryAt)}</p>
                          <Link href={`/orders/${encodeURIComponent(order.id)}`} className="rounded-full bg-brand-cocoa px-6 py-3 text-sm font-medium text-white">View order details</Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                {totalPages > 1 && (
                  <div className="mt-9 flex items-center justify-center gap-5 text-sm">
                    <button type="button" className="rounded-full border border-[#EADFD8] bg-white px-5 py-3 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                    <span>Page {page} of {totalPages}</span>
                    <button type="button" className="rounded-full border border-[#EADFD8] bg-white px-5 py-3 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
