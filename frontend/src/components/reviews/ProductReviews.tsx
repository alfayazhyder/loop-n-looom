"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReviewStars from "@/components/reviews/ReviewStars";
import {
  readPublicReviews, reviewDate, reviewMediaUrl,
  type PublicReviewsResult, type ReviewSort,
} from "@/lib/customerReviews";

const selectClass = "min-h-11 rounded-2xl border border-[#EADFD8] bg-white px-4 text-sm text-brand-cocoa";

export default function ProductReviews({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicReviewsResult | null>(null);
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState<number | null>(null);
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await readPublicReviews(slug, { page, rating, sort }, controller.signal);
        if (!controller.signal.aborted) setData(response);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setData(null);
          setError(cause instanceof Error ? cause.message : "Reviews are unavailable right now.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [slug, page, rating, sort]);

  const summary = data?.summary;
  return (
    <section id="customer-reviews" aria-labelledby="customer-reviews-title" className="mt-14 rounded-[2.5rem] border border-[#EADFD8] bg-white p-6 sm:mt-20 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">Words from our community</p>
          <h2 id="customer-reviews-title" className="mt-3 font-serif text-3xl sm:text-4xl">Customer reviews</h2>
          <p className="mt-3 text-sm leading-7 text-[#6B5A50]">Thoughtful feedback from our verified purchases, published after moderation.</p>
        </div>
        <Link href="/reviews" className="rounded-full border border-brand-cocoa px-6 py-3 text-sm font-medium transition-colors hover:bg-brand-cream">My reviews</Link>
      </div>

      {loading && <p role="status" className="mt-8 text-sm">Loading customer reviews…</p>}
      {error && <p role="alert" className="mt-8 rounded-2xl bg-brand-cream p-5 text-sm text-red-700">{error}</p>}

      {!loading && !error && data && (
        <>
          <div className="mt-9 grid gap-8 rounded-3xl bg-brand-cream p-6 md:grid-cols-[220px_1fr] sm:p-8">
            <div>
              <p className="font-serif text-5xl">{summary?.averageRating === null ? "—" : summary?.averageRating?.toFixed(1)}</p>
              {summary?.averageRating !== null && summary?.averageRating !== undefined && <div className="mt-3"><ReviewStars rating={summary.averageRating} size={19} /></div>}
              <p className="mt-2 text-sm text-[#6B5A50]">{summary?.totalReviews ?? 0} approved {summary?.totalReviews === 1 ? "review" : "reviews"}</p>
            </div>
            <div aria-label="Rating distribution" className="space-y-3">
              {[5, 4, 3, 2, 1].map((value) => {
                const count = summary?.ratingDistribution[String(value) as "1" | "2" | "3" | "4" | "5"] ?? 0;
                const total = summary?.totalReviews ?? 0;
                return (
                  <div key={value} className="flex items-center gap-3 text-xs sm:text-sm">
                    <span className="w-12 shrink-0">{value} stars</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EADFD8]">
                      <div className="h-full rounded-full bg-[#AC7851]" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                    </div>
                    <span className="w-7 text-right text-[#6B5A50]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-9 flex flex-wrap gap-4">
            <label className="flex flex-col gap-2 text-xs font-medium text-[#6B5A50]">Rating
              <select className={selectClass} value={rating ?? ""} onChange={(event) => { setRating(event.target.value ? Number(event.target.value) : null); setPage(1); }}>
                <option value="">All ratings</option>
                {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-[#6B5A50]">Sort
              <select className={selectClass} value={sort} onChange={(event) => { setSort(event.target.value as ReviewSort); setPage(1); }}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="rating_high">Highest rated</option>
                <option value="rating_low">Lowest rated</option>
              </select>
            </label>
          </div>

          {data.reviews.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-[#EADFD8] p-8 text-sm text-[#6B5A50]">
              {rating ? "No approved reviews match this star rating yet." : "No approved reviews yet. Once customers share their experiences, you will find them here."}
            </div>
          ) : (
            <div className="mt-8 divide-y divide-[#EADFD8]">
              {data.reviews.map((review) => (
                <article key={review.id} className="py-7 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <ReviewStars rating={review.rating} />
                    <span className="text-xs text-[#8A7B72]">{reviewDate(review.createdAt)}</span>
                  </div>
                  {review.title && <h3 className="mt-3 font-serif text-xl">{review.title}</h3>}
                  {review.content && <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-[#6B5A50]">{review.content}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#6B5A50]">
                    <span>{review.displayName}</span>
                    {review.verifiedPurchase && <span className="rounded-full bg-[#F7EBE8] px-3 py-1 font-semibold text-brand-cocoa">Verified purchase</span>}
                  </div>
                  {review.media.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {review.media.map((media) => {
                        const url = reviewMediaUrl(media.url);
                        if (!url) return null;
                        return media.type === "IMAGE" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={media.id} src={url} alt={`Customer review photo for ${data.product.nameEn}`} loading="lazy" className="h-28 w-28 rounded-2xl border border-[#EADFD8] object-cover" />
                        ) : (
                          <video key={media.id} src={url} controls preload="metadata" aria-label="Customer review video" className="h-32 max-w-full rounded-2xl border border-[#EADFD8]" />
                        );
                      })}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
          {data.pagination.totalPages > 1 && (
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-sm">
              <button type="button" disabled={!data.pagination.hasPreviousPage} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-[#EADFD8] px-5 py-3 disabled:opacity-40">Previous</button>
              <span>Page {page} of {data.pagination.totalPages}</span>
              <button type="button" disabled={!data.pagination.hasNextPage} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-[#EADFD8] px-5 py-3 disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
