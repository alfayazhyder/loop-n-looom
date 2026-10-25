"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { isAuthenticationError } from "@/lib/session";
import { writeReview } from "@/lib/customerReviews";

const field = "mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-white px-4 py-3 text-sm";

export default function WriteReview({ orderItemId }: { orderItemId: string }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      await writeReview("/api/customer/reviews", "POST", {
        orderItemId,
        rating,
        title: title.trim() || null,
        content: content.trim() || null,
        displayName: displayName.trim() || null,
        media: [],
      });
      setSubmitted(true);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : "Your review could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-h-[70vh] bg-brand-cream py-12 sm:py-16">
      <div className="page-container max-w-4xl">
        <Link href="/orders" className="text-sm underline">← My orders</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">Handmade with care</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Share your experience</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">Thank you for choosing handmade. Reviews are available for products in delivered account orders and appear publicly only after moderation.</p>
        {submitted ? (
          <div role="status" className="mt-10 rounded-3xl bg-white p-8 sm:p-10">
            <h2 className="font-serif text-3xl">Thank you for your review!</h2>
            <p className="mt-4 text-sm leading-7 text-[#6B5A50]">Your feedback has been submitted for moderation. You can view its status in My reviews.</p>
            <Link href="/reviews" className="mt-7 inline-block rounded-full bg-brand-cocoa px-6 py-3 text-sm text-white">Go to my reviews</Link>
          </div>
        ) : !orderItemId ? (
          <div className="mt-10 rounded-3xl bg-white p-8">
            <p>Choose a product from one of your delivered orders to write a review.</p>
            <Link href="/orders" className="mt-5 inline-block rounded-full bg-brand-cocoa px-6 py-3 text-sm text-white">Find delivered orders</Link>
          </div>
        ) : signedOut ? (
          <div className="mt-10 rounded-3xl bg-white p-8">
            <p>Please sign in using the account that placed this order.</p>
            <Link href="/login" className="mt-5 inline-block underline">Sign in</Link>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="mt-10 space-y-7 rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-10">
            <label className="block text-sm font-medium">Your rating
              <select className={field} value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Review title (optional)
              <input className={field} value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="What made this special?" />
            </label>
            <label className="block text-sm font-medium">Your experience (optional)
              <textarea className={`${field} min-h-40`} value={content} maxLength={2000} onChange={(event) => setContent(event.target.value)} placeholder="Tell us about your handmade creation…" />
            </label>
            <label className="block text-sm font-medium">Display name (optional)
              <input className={field} value={displayName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name to show with your review" />
            </label>
            <p className="rounded-2xl bg-brand-cream p-5 text-xs leading-6 text-[#6B5A50]">For your privacy, photo and video uploads are not enabled here until secure media uploads are integrated. You can share text and star ratings now.</p>
            {error && <p role="alert" className="rounded-2xl bg-brand-cream p-5 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="min-h-14 rounded-full bg-brand-cocoa px-9 text-sm font-medium text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit review for moderation"}</button>
          </form>
        )}
      </div>
    </section>
  );
}
