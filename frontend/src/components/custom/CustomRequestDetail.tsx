'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { authenticatedRequest, isAuthenticationError } from '@/lib/session';
import { closedRequestStatuses, dateLabel, friendlyStatus, money, normalizeRequest, requestBase, type CrochetRequest, type CustomQuote } from '@/lib/customRequests';

const panel = 'rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-8';

export default function CustomRequestDetail({ requestId }: { requestId: string }) {
  const [request, setRequest] = useState<CrochetRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingQuote, setProcessingQuote] = useState<string | null>(null);
  const path = `${requestBase}/${encodeURIComponent(requestId)}`;

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await authenticatedRequest<CrochetRequest | { request: CrochetRequest }>(path, { signal });
      if (signal?.aborted) return;
      const record = normalizeRequest(result);
      if (!record || !record.id) throw new Error('Unexpected custom request detail response.');
      setRequest(record);
      setSignedOut(false);
      setError('');
    } catch (cause) {
      if (signal?.aborted) return;
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load your request.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [path]);

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

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !message.trim()) return;
    setBusy(true);
    setError('');
    try {
      await authenticatedRequest(`${path}/messages`, { method: 'POST', body: JSON.stringify({ message: message.trim() }) });
      setMessage('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Message could not be sent.');
    } finally { setBusy(false); }
  }

  async function respondToQuote(quote: CustomQuote, action: 'accept' | 'reject') {
    if (processingQuote) return;
    const intent = action === 'accept'
      ? 'Accept this quote? No card payment will be collected. Any further payment steps require a separate secure integration.'
      : 'Reject this quotation? The team may need to prepare a new one.';
    if (!window.confirm(intent)) return;
    setProcessingQuote(quote.id);
    setError('');
    try {
      await authenticatedRequest(`${path}/quotes/${encodeURIComponent(quote.id)}/${action}`, { method: 'POST' });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update quotation.');
    } finally { setProcessingQuote(null); }
  }

  if (loading) return <section className="min-h-[65vh] bg-[#FCF9F5] py-14"><div className="page-container"><p role="status">Loading your request…</p></div></section>;
  if (signedOut) return <section className="min-h-[65vh] bg-[#FCF9F5] py-14"><div className="page-container"><h1 className="font-serif text-3xl">Sign in to view this request</h1><Link href="/login" className="mt-5 inline-block underline">Sign in →</Link></div></section>;

  return (
    <section className="min-h-[76vh] bg-[#FCF9F5] py-12 text-[#4A3B32] sm:py-16">
      <div className="page-container">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/custom-crochet/requests" className="text-sm underline underline-offset-4">← My custom requests</Link>
          <Link href="/custom-crochet" className="text-sm underline underline-offset-4">Start another design</Link>
        </div>
        {error && <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
        {request && (
          <>
            <p className="mt-10 text-xs font-semibold uppercase tracking-[.22em] text-[#89756A]">Your bespoke crochet request</p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl sm:text-5xl">{request.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="rounded-full bg-[#F7EBE8] px-4 py-2 font-semibold">{friendlyStatus(request.status)}</span>
              <span className="text-[#6B5A50]">Submitted {dateLabel(request.createdAt)}</span>
            </div>
            <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
              <div className="space-y-6">
                <article className={panel}>
                  <h2 className="font-serif text-2xl">The vision</h2>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#6B5A50]">{request.description}</p>
                  <dl className="mt-6 grid gap-4 border-t border-[#EADFD8] pt-5 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs text-[#89756A]">Preferred colours</dt><dd className="mt-1 font-medium">{request.colors?.join(', ') || 'Not specified'}</dd></div>
                    <div><dt className="text-xs text-[#89756A]">Dimensions</dt><dd className="mt-1 font-medium">{request.size || 'Not specified'}</dd></div>
                    <div><dt className="text-xs text-[#89756A]">Occasion</dt><dd className="mt-1 font-medium">{request.occasion || 'Not specified'}</dd></div>
                    <div><dt className="text-xs text-[#89756A]">Target date</dt><dd className="mt-1 font-medium">{dateLabel(request.targetDate)}</dd></div>
                    <div><dt className="text-xs text-[#89756A]">Budget range</dt><dd className="mt-1 font-medium">{request.budgetMin == null && request.budgetMax == null ? 'Not specified' : `${request.budgetMin == null ? 'Flexible' : money(request.budgetMin)} – ${request.budgetMax == null ? 'Flexible' : money(request.budgetMax)}`}</dd></div>
                  </dl>
                </article>
                <section className={panel} aria-labelledby="messages-heading">
                  <h2 id="messages-heading" className="font-serif text-2xl">Conversation with our team</h2>
                  <p className="mt-2 text-sm leading-6 text-[#6B5A50]">Keep every design detail in this conversation.</p>
                  <div className="mt-7 space-y-4">
                    {(request.messages ?? []).length === 0 ? <p className="rounded-2xl bg-[#FCF9F5] p-5 text-sm text-[#6B5A50]">No messages yet. Ask a question to get started.</p> : null}
                    {(request.messages ?? []).map((item) => (
                      <div key={item.id} className={`rounded-2xl p-4 ${item.senderType === 'CUSTOMER' ? 'bg-[#F7EBE8]' : 'bg-[#FCF9F5]'}`}>
                        <div className="flex flex-wrap justify-between gap-2 text-xs text-[#89756A]"><span className="font-semibold">{item.senderType === 'CUSTOMER' ? 'You' : 'LOOP_N_LOOOM team'}</span><time>{dateLabel(item.createdAt)}</time></div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{item.message}</p>
                      </div>
                    ))}
                  </div>
                  {!closedRequestStatuses.has(request.status) && (
                    <form onSubmit={(event) => void send(event)} className="mt-6">
                      <label htmlFor="request-message" className="text-sm font-semibold">Write a message</label>
                      <textarea id="request-message" rows={3} maxLength={5000} required value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#EADFD8] bg-white p-4 text-sm" placeholder="Ask a question or clarify a design detail…" />
                      <button type="submit" disabled={busy || !message.trim()} className="mt-4 rounded-full bg-[#4A3B32] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Sending…' : 'Send message →'}</button>
                    </form>
                  )}
                  {closedRequestStatuses.has(request.status) && <p className="mt-6 text-sm text-[#6B5A50]">Messaging is closed for this request.</p>}
                </section>
              </div>
              <aside className="space-y-6">
                <section className={panel} aria-labelledby="quotes-heading">
                  <h2 id="quotes-heading" className="font-serif text-2xl">Personalised quotations</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6B5A50]">A quote is an offer to consider, not a payment or completed order.</p>
                  {(request.quotes ?? []).length === 0 ? <p className="mt-6 rounded-2xl bg-[#FCF9F5] p-4 text-sm text-[#6B5A50]">Our team has not issued a quotation yet.</p> : null}
                  <div className="mt-5 space-y-4">
                    {(request.quotes ?? []).map((quote) => (
                      <div key={quote.id} className="rounded-2xl border border-[#EADFD8] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-[#89756A]">{friendlyStatus(quote.status)}</span><span className="font-serif text-2xl">{money(quote.amount, quote.currency || 'AED')}</span></div>
                        {quote.productionDays != null && <p className="mt-3 text-sm">Production estimate: {quote.productionDays} days</p>}
                        {quote.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-[#6B5A50]">{quote.notes}</p>}
                        {(quote.expiresAt || quote.validUntil) && <p className="mt-2 text-xs text-[#89756A]">Valid until: {dateLabel(quote.expiresAt ?? quote.validUntil)}</p>}
                        {quote.status === 'SENT' && request.status === 'QUOTE_SENT' && (
                          <div className="mt-5 flex flex-wrap gap-3">
                            <button type="button" disabled={Boolean(processingQuote)} onClick={() => void respondToQuote(quote, 'accept')} className="rounded-full bg-[#4A3B32] px-5 py-3 text-xs font-semibold text-white disabled:opacity-50">Accept quotation</button>
                            <button type="button" disabled={Boolean(processingQuote)} onClick={() => void respondToQuote(quote, 'reject')} className="rounded-full border border-[#EADFD8] px-5 py-3 text-xs font-semibold disabled:opacity-50">Decline</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
                <div className="rounded-3xl bg-[#F7EBE8] p-6 text-sm leading-7 text-[#6B5A50]">
                  <p className="font-serif text-xl text-[#4A3B32]">A note on payments</p>
                  <p className="mt-2">Online payment is not enabled yet. Accepting a quotation never charges your card or marks a payment as complete.</p>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
