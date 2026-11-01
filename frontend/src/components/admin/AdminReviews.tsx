"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Search, Star, ShieldCheck } from "lucide-react";
import { GateScreen, Issue, Note, Pages, WorkArea, btn, field, mainBtn, panel, useEngagementAdmin } from "@/components/admin/EngagementCommon";
import { dateAE, getReview, listReviews, nameOf, safeHttps, setReviewStatus, type PageInfo, type Review, type ReviewStatus } from "@/lib/adminEngagement";

export default function AdminReviews({ reviewId }: { reviewId?: string }) {
  const auth = useEngagementAdmin();
  const [rows, setRows] = useState<Review[]>([]);
  const [info, setInfo] = useState<PageInfo>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [detail, setDetail] = useState<Review | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("PENDING");
  const [rating, setRating] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (auth.gate !== "ready") return;
    let live = true;
    async function load() {
      setBusy(true); setIssue("");
      try {
        if (reviewId) {
          const record = await getReview(reviewId);
          if (live) setDetail(record);
        } else {
          const result = await listReviews({ page, search, status, ...(rating ? { rating: Number(rating) } : {}) });
          if (live) { setRows(result.reviews); setInfo(result.pagination); }
        }
      } catch (error) {
        if (live && !auth.guard(error)) setIssue(error instanceof Error ? error.message : "Reviews unavailable.");
      } finally { if (live) setBusy(false); }
    }
    void load();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.gate, page, status, rating, search, reviewId, revision]);

  async function moderate(next: ReviewStatus) {
    if (!detail || busy || detail.status === next) return;
    if (!window.confirm(`Change this review from ${detail.status} to ${next}? This changes public storefront visibility.`)) return;
    setBusy(true); setIssue(""); setNotice("");
    try {
      const updated = await setReviewStatus(detail.id, next);
      setDetail(updated); setNotice(`Moderation status is now ${next}. Purchase verification was not modified.`);
    } catch (error) {
      if (!auth.guard(error)) setIssue(error instanceof Error ? error.message : "Moderation failed.");
    } finally { setBusy(false); }
  }
  function find(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPage(1); setSearch(searchDraft.trim()); }
  if (auth.gate !== "ready") return <GateScreen gate={auth.gate} error={auth.gateError} />;
  return <WorkArea title={reviewId ? "Review moderation" : "Customer reviews"} eyebrow="Community trust · Verified feedback" detail="Review real customer feedback and supporting media before approving it for public display. Verified-purchase flags are maintained by the backend.">
    <Issue value={issue} />{notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#E8F2EA] p-4 text-sm text-[#557A61]"><CheckCircle2 size={18} />{notice}</p>}
    {reviewId ? <>
      <Link href="/admin/reviews" className={btn}>← Reviews queue</Link>
      {busy && !detail && <p role="status">Loading review…</p>}
      {detail && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className={`${panel} min-w-0`}>
          <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#9A8073]">{detail.product?.nameEn || "Product"}</p><h2 className="mt-2 font-serif text-2xl">{detail.title || "Customer feedback"}</h2></div><span className="rounded-full bg-[#F7EBE8] px-4 py-2 text-xs font-semibold">{detail.status}</span></div>
          <p className="mt-4 flex items-center gap-2 text-sm"><Star size={18} fill="currentColor" className="text-[#B88A54]" />{detail.rating}/5 · {detail.verifiedPurchase ? "Verified purchase" : "Unverified purchase"}</p>
          <p className="mt-2 text-xs text-[#8A7B72]">Submitted by {detail.displayName || nameOf(detail.user)} · {dateAE(detail.createdAt)}</p>
          <p className="mt-6 whitespace-pre-wrap break-words rounded-xl bg-[#FCF9F5] p-5 text-sm leading-8">{detail.content || "No written description supplied."}</p>
          <h3 className="mt-8 font-serif text-xl">Photo & video references</h3>
          {detail.media?.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{detail.media.map(media => <div className="min-w-0 rounded-xl border border-[#EADFD8] p-4" key={media.id}>
            <p className="text-xs font-semibold">{media.type}</p>
            {safeHttps(media.url) ? <a href={media.url} rel="noopener noreferrer" target="_blank" className="mt-3 block break-all text-sm underline underline-offset-4">Open media securely ↗</a> : <p className="mt-2 text-xs text-[#A95757]">Media link is unavailable or not HTTPS.</p>}
            {(media.caption || media.altText) && <p className="mt-3 text-xs leading-6 text-[#8A7B72]">{media.caption || media.altText}</p>}
          </div>)}</div> : <p className="mt-4 text-sm text-[#8A7B72]">No photos or videos attached.</p>}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-[#EADFD8] pt-6">{detail.product?.slug && <Link className={btn} href={`/products/${encodeURIComponent(detail.product.slug)}`}>View storefront product</Link>}{detail.user?.id && <Link className={btn} href={`/admin/customers/${encodeURIComponent(detail.user.id)}`}>Customer profile</Link>}</div>
        </article>
        <aside className={`${panel} h-fit`}><h3 className="flex items-center gap-2 font-serif text-xl"><ShieldCheck size={21} />Moderation controls</h3><p className="mt-3 text-sm leading-7 text-[#6B5A50]">Approval makes a review eligible for public display. Rejection hides it. Use the actual submitted evidence and do not alter verification.</p>
          <div className="mt-6 flex flex-col gap-3">{(["APPROVED", "REJECTED", "PENDING"] as const).map(next => <button key={next} type="button" className={next === detail.status ? btn : mainBtn} disabled={busy || detail.status === next} onClick={() => void moderate(next)}>{next === detail.status ? `Current: ${next}` : `${next === "APPROVED" ? "Approve" : next === "REJECTED" ? "Reject" : "Return to pending"} review`}</button>)}</div>
          <p className="mt-4 text-xs leading-6 text-[#8A7B72]">Review moderation is supported by the existing API, but the backend does not yet write an immutable per-admin moderation audit record. This remains a required hardening task.</p>
        </aside>
      </div>}
    </> : <section className={panel}>
      <form onSubmit={find} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_140px_auto] md:items-end">
        <label className="text-xs font-semibold">Search product, customer or review<input className={field} aria-label="Search reviews" value={searchDraft} maxLength={120} onChange={event => setSearchDraft(event.target.value)} placeholder="Search reviews" /></label>
        <label className="text-xs font-semibold">Status<select className={field} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
        <label className="text-xs font-semibold">Rating<select className={field} value={rating} onChange={event => { setRating(event.target.value); setPage(1); }}><option value="">Any rating</option>{[1,2,3,4,5].map(n => <option value={n} key={n}>{n} stars</option>)}</select></label>
        <button className={mainBtn} type="submit"><Search size={16} />Search</button>
      </form>
      {busy && <p role="status" className="mt-5 text-sm">Loading reviews…</p>}
      {!busy && rows.length === 0 && <div className="mt-5"><Note>No reviews match the current filters.</Note></div>}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{rows.map(item => <Link href={`/admin/reviews/${encodeURIComponent(item.id)}`} key={item.id} className="rounded-2xl border border-[#EADFD8] p-5 transition-colors hover:bg-[#F7EBE8]">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 font-semibold"><Star size={16} />{item.product?.nameEn || "Product"}</p><span className="rounded-full bg-[#F7EBE8] px-3 py-1.5 text-xs font-medium">{item.status}</span></div>
        <p className="mt-3 text-sm">{item.title || "Customer feedback"} · {item.rating}/5</p>
        <p className="mt-2 line-clamp-2 text-xs leading-6 text-[#6B5A50]">{item.content || "No written review."}</p>
        <p className="mt-3 text-xs text-[#8A7B72]">{item.verifiedPurchase ? "Verified buyer" : "Unverified"} · {item._count?.media ?? 0} media · {dateAE(item.createdAt)}</p>
      </Link>)}</div><Pages {...info} disabled={busy} onChange={setPage} />
    </section>}
  </WorkArea>;
}
