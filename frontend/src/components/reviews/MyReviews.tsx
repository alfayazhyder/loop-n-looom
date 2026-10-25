"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import ReviewStars from "@/components/reviews/ReviewStars";
import { isAuthenticationError } from "@/lib/session";
import {
  readMyReviews, reviewDate, writeReview,
  type MyReview, type MyReviewsResult, type ReviewStatus,
} from "@/lib/customerReviews";

const inputClass = "mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-white px-4 py-3 text-sm";

export default function MyReviews() {
  const [result, setResult] = useState<MyReviewsResult | null>(null);
  const [status, setStatus] = useState<ReviewStatus | "">("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [editing, setEditing] = useState<MyReview | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await readMyReviews(page, status, controller.signal);
        if (!controller.signal.aborted) {
          setResult(response);
          setSignedOut(false);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setResult(null);
          if (isAuthenticationError(cause)) setSignedOut(true);
          else setError(cause instanceof Error ? cause.message : "Unable to load your reviews.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [page, status, revision]);

  function openEdit(review: MyReview) {
    setEditing(review);
    setRating(review.rating);
    setTitle(review.title ?? "");
    setContent(review.content ?? "");
    setDisplayName(review.displayName ?? "");
    setError("");
    setNotice("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busyId) return;
    setBusyId(editing.id);
    setError("");
    setNotice("");
    try {
      await writeReview(`/api/customer/reviews/${encodeURIComponent(editing.id)}`, "PUT", {
        rating,
        title: title.trim() || null,
        content: content.trim() || null,
        displayName: displayName.trim() || null,
      });
      setEditing(null);
      setNotice("Your updated review has been sent for moderation.");
      setRevision((value) => value + 1);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : "Unable to update this review.");
    } finally {
      setBusyId("");
    }
  }

  async function removeReview(review: MyReview) {
    if (busyId || !window.confirm("Delete this review permanently?")) return;
    setBusyId(review.id);
    setError("");
    setNotice("");
    try {
      await writeReview(`/api/customer/reviews/${encodeURIComponent(review.id)}`, "DELETE");
      setEditing(null);
      setNotice("Your review has been deleted.");
      if (result?.reviews.length === 1 && page > 1) setPage((value) => value - 1);
      else setRevision((value) => value + 1);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : "Unable to delete this review.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container">
        <Link href="/account" className="text-sm underline">← My account</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">Your handmade stories</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">My product reviews</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">Share your experience after delivery. Each review is checked before it appears publicly.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/orders" className="rounded-full bg-brand-cocoa px-6 py-3 text-sm font-medium text-white">View delivered orders</Link>
          <Link href="/shop" className="rounded-full border border-[#EADFD8] bg-white px-6 py-3 text-sm">Browse creations</Link>
        </div>

        {signedOut ? (
          <div className="mt-9 rounded-3xl bg-white p-8">
            <p>Sign in to view, edit or delete reviews connected to your account.</p>
            <Link href="/login" className="mt-4 inline-block underline">Sign in</Link>
          </div>
        ) : (
          <>
            <label className="mt-9 block max-w-xs text-sm">Filter by moderation status
              <select className={inputClass} value={status} onChange={(event) => { setStatus(event.target.value as ReviewStatus | ""); setPage(1); }}>
                <option value="">All reviews</option>
                <option value="PENDING">Awaiting approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Not approved</option>
              </select>
            </label>
            {notice && <p role="status" className="mt-6 rounded-2xl bg-white p-5 text-sm text-brand-cocoa">{notice}</p>}
            {error && <p role="alert" className="mt-6 rounded-2xl bg-white p-5 text-sm text-red-700">{error}</p>}
            {loading && <p role="status" className="mt-8">Loading your reviews…</p>}
            {!loading && !error && result && (
              <>
                <p className="mt-6 text-sm text-[#6B5A50]">{result.pagination.totalItems} {result.pagination.totalItems === 1 ? "review" : "reviews"} found</p>
                {result.reviews.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-[#EADFD8] bg-white p-9">
                    <h2 className="font-serif text-2xl">No reviews here yet</h2>
                    <p className="mt-3 text-sm leading-7 text-[#6B5A50]">Reviews can be submitted for eligible products once an account order has been delivered.</p>
                    <Link href="/orders" className="mt-5 inline-block text-sm underline">My orders</Link>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-5">
                    {result.reviews.map((review) => (
                      <article key={review.id} className="rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-8">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <Link href={`/products/${encodeURIComponent(review.product.slug)}`} className="font-serif text-2xl hover:underline">{review.product.nameEn}</Link>
                            <p className="mt-2 text-xs text-[#8A7B72]">{reviewDate(review.createdAt)}</p>
                          </div>
                          <span className="rounded-full bg-brand-blush px-4 py-2 text-xs font-medium">
                            {review.status === "PENDING" ? "Awaiting moderation" : review.status === "APPROVED" ? "Approved" : "Not approved"}
                          </span>
                        </div>
                        <div className="mt-4"><ReviewStars rating={review.rating} /></div>
                        {review.title && <h3 className="mt-3 font-serif text-xl">{review.title}</h3>}
                        {review.content && <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-[#6B5A50]">{review.content}</p>}
                        {review.orderItem && <p className="mt-3 text-xs text-[#8A7B72]">Verified purchase · {review.orderItem.order.orderNumber}</p>}
                        <div className="mt-6 flex flex-wrap gap-3">
                          <button type="button" onClick={() => openEdit(review)} disabled={!!busyId} className="rounded-full border border-[#EADFD8] px-5 py-3 text-sm disabled:opacity-50">Edit review</button>
                          <button type="button" onClick={() => void removeReview(review)} disabled={!!busyId} className="rounded-full border border-[#EADFD8] px-5 py-3 text-sm text-red-700 disabled:opacity-50">{busyId === review.id ? "Please wait…" : "Delete review"}</button>
                        </div>
                        {editing?.id === review.id && (
                          <form onSubmit={(event) => void saveEdit(event)} className="mt-6 space-y-5 rounded-3xl bg-brand-cream p-5 sm:p-6">
                            <p className="text-sm text-[#6B5A50]">Edits go through moderation again before they appear publicly.</p>
                            <label className="block text-sm">Your rating
                              <select className={inputClass} value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                              </select>
                            </label>
                            <label className="block text-sm">Review title
                              <input className={inputClass} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
                            </label>
                            <label className="block text-sm">Your review
                              <textarea className={`${inputClass} min-h-32`} maxLength={2000} value={content} onChange={(event) => setContent(event.target.value)} />
                            </label>
                            <label className="block text-sm">Display name (optional)
                              <input className={inputClass} maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                            </label>
                            <div className="flex flex-wrap gap-3">
                              <button type="submit" disabled={!!busyId} className="rounded-full bg-brand-cocoa px-6 py-3 text-sm text-white disabled:opacity-50">Save changes</button>
                              <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-[#EADFD8] bg-white px-6 py-3 text-sm">Cancel</button>
                            </div>
                          </form>
                        )}
                      </article>
                    ))}
                  </div>
                )}
                {result.pagination.totalPages > 1 && (
                  <div className="mt-9 flex flex-wrap items-center justify-center gap-4 text-sm">
                    <button type="button" disabled={!result.pagination.hasPreviousPage} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-[#EADFD8] bg-white px-5 py-3 disabled:opacity-40">Previous</button>
                    <span>Page {page} of {result.pagination.totalPages}</span>
                    <button type="button" disabled={!result.pagination.hasNextPage} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-[#EADFD8] bg-white px-5 py-3 disabled:opacity-40">Next</button>
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
