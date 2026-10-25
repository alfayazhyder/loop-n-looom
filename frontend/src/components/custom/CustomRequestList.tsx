'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { authenticatedRequest, isAuthenticationError } from '@/lib/session';
import { dateLabel, friendlyStatus, requestBase, type CrochetRequest, type CrochetRequestsResponse } from '@/lib/customRequests';

const panel = 'rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-8';

export default function CustomRequestList() {
  const [requests, setRequests] = useState<CrochetRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const result = await authenticatedRequest<CrochetRequestsResponse | CrochetRequest[]>(`${requestBase}?page=${page}&limit=10`, { signal });
      if (signal?.aborted) return;
      const items = Array.isArray(result) ? result : result.requests;
      if (!Array.isArray(items)) throw new Error('Unexpected custom request list response.');
      setRequests(items);
      if (!Array.isArray(result)) setTotalPages(Math.max(1, result.pagination?.totalPages ?? 1));
      setSignedOut(false);
    } catch (cause) {
      if (signal?.aborted) return;
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not load custom requests.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      void load(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  return (
    <section className="min-h-[75vh] bg-[#FCF9F5] py-12 text-[#4A3B32] sm:py-16">
      <div className="page-container">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/account" className="text-sm underline underline-offset-4">← My account</Link>
          <Link href="/custom-crochet" className="rounded-full bg-[#4A3B32] px-6 py-3 text-sm font-medium text-white">Start another creation +</Link>
        </div>
        <div className="mt-11 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#89756A]">Your bespoke commissions</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">My custom requests</h1>
          <p className="mt-4 text-sm leading-7 text-[#6B5A50]">A beautiful idea begins a conversation. View every request, message and quotation in one place.</p>
        </div>
        {loading && <p role="status" className="mt-10">Loading your custom requests…</p>}
        {signedOut && <div className={`${panel} mt-10`}><p>Sign in to see your private commission requests.</p><Link href="/login" className="mt-4 inline-block underline">Sign in →</Link></div>}
        {error && <div className={`${panel} mt-10`}><p role="alert" className="text-sm text-red-700">{error}</p><button onClick={() => void load()} type="button" className="mt-4 underline">Try again</button></div>}
        {!loading && !signedOut && !error && (
          requests.length === 0 ? (
            <div className={`${panel} mt-10 text-center`}>
              <p className="font-serif text-2xl">Your first creation starts here.</p>
              <p className="mt-3 text-sm text-[#6B5A50]">No commission requests yet. Tell our makers what you dream of.</p>
              <Link href="/custom-crochet" className="mt-6 inline-flex rounded-full bg-[#4A3B32] px-6 py-3 text-sm text-white">Create something personal →</Link>
            </div>
          ) : (
            <div className="mt-9 grid gap-5 md:grid-cols-2">
              {requests.map((request) => (
                <Link key={request.id} href={`/custom-crochet/requests/${encodeURIComponent(request.id)}`} className={`${panel} block transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-[#F7EBE8] px-4 py-2 text-xs font-semibold">{friendlyStatus(request.status)}</span>
                    <span className="text-xs text-[#89756A]">{dateLabel(request.createdAt)}</span>
                  </div>
                  <h2 className="mt-5 font-serif text-2xl">{request.title}</h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#6B5A50]">{request.description}</p>
                  <span className="mt-7 inline-block text-sm font-semibold underline underline-offset-4">View request and discussion →</span>
                </Link>
              ))}
            </div>
          )
        )}
        {!loading && !signedOut && !error && totalPages > 1 && (
          <nav aria-label="Request pages" className="mt-9 flex items-center justify-center gap-4 text-sm">
            <button className="rounded-full border border-[#EADFD8] bg-white px-5 py-3 disabled:opacity-40" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="rounded-full border border-[#EADFD8] bg-white px-5 py-3 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </nav>
        )}
      </div>
    </section>
  );
}
