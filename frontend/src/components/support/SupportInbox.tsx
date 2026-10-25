'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Headphones, MessageCircle, Plus, Send, Sparkles } from 'lucide-react';
import { authenticatedRequest, isAuthenticationError } from '@/lib/session';
import {
  customerSupportBase,
  formatSupportDate,
  type CreateSupportResponse,
  type SupportConversation,
  type SupportListResponse,
  type SupportConversationStatus,
} from '@/lib/customerSupport';
import { useRouter } from 'next/navigation';

const card = 'rounded-3xl border border-[#EADFD8] bg-white p-6 shadow-sm sm:p-8';
type Filter = 'ALL' | SupportConversationStatus;

export default function SupportInbox() {
  const router = useRouter();
  const [items, setItems] = useState<SupportConversation[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ page: String(page), limit: '8' });
      if (filter !== 'ALL') query.set('status', filter);
      const response = await authenticatedRequest<SupportListResponse>(
        `${customerSupportBase}?${query.toString()}`,
        { signal },
      );
      if (signal?.aborted) return;
      if (!Array.isArray(response.conversations) || !response.pagination) {
        throw new Error('Unexpected support conversation response.');
      }
      setItems(response.conversations);
      setPages(Math.max(1, response.pagination.totalPages));
      setSignedOut(false);
    } catch (cause) {
      if (signal?.aborted) return;
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not load support conversations.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void load(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load, refresh]);

  async function createConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || trimmedSubject.length > 200 || !trimmedMessage || trimmedMessage.length > 5000) {
      setFormError('Enter a subject (up to 200 characters) and message (up to 5,000 characters).');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const response = await authenticatedRequest<CreateSupportResponse>(customerSupportBase, {
        method: 'POST',
        body: JSON.stringify({ subject: trimmedSubject, message: trimmedMessage }),
      });
      if (!response.conversation?.id) throw new Error('Conversation was created but the response has no ID.');
      router.push(`/support/${encodeURIComponent(response.conversation.id)}`);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setFormError(cause instanceof Error ? cause.message : 'Could not create conversation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-h-[76vh] bg-[#FCF9F5] py-12 text-[#4A3B32] sm:py-16">
      <div className="page-container">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link className="underline underline-offset-4" href="/account">← My account</Link>
          <Link className="underline underline-offset-4" href="/custom-crochet/requests">Custom design requests →</Link>
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(270px,.8fr)] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.23em] text-[#927A70]">We&apos;re here to help</p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Your support conversations</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">Questions about your handmade order, custom requests or delivery? Reach our team and revisit every conversation here.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => { setFormOpen((open) => !open); setFormError(''); }}
                className="inline-flex items-center gap-2 rounded-full bg-[#4A3B32] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
              >
                <Plus size={17} /> {formOpen ? 'Hide message form' : 'Start a conversation'}
              </button>
              <button type="button" onClick={() => setRefresh((value) => value + 1)} className="rounded-full border border-[#EADFD8] bg-white px-6 py-3 text-sm font-medium">Refresh conversations</button>
            </div>
          </div>
          <aside className="rounded-3xl border border-[#EADFD8] bg-[#F7EBE8] p-6 sm:p-7">
            <span className="inline-flex rounded-2xl bg-white p-3"><Headphones size={25} strokeWidth={1.5} /></span>
            <h2 className="mt-4 font-serif text-2xl">Made with care. Supported with care.</h2>
            <p className="mt-3 text-sm leading-7 text-[#6B5A50]">Replies appear inside your conversation when the team responds. Refresh to check for new messages.</p>
            <p className="mt-3 text-xs text-[#6B5A50]">Messages are stored securely. This is a support inbox, not instant WebSocket chat.</p>
          </aside>
        </div>
        {signedOut ? (
          <div className={`${card} mt-10`}>
            <h2 className="font-serif text-2xl">Sign in to contact our team</h2>
            <p className="mt-3 text-sm text-[#6B5A50]">Your conversation history is private to your account.</p>
            <Link href="/login" className="mt-5 inline-block rounded-full bg-[#4A3B32] px-6 py-3 text-sm font-semibold text-white">Sign in</Link>
          </div>
        ) : (
          <>
            {formOpen && (
              <form onSubmit={(event) => void createConversation(event)} className={`${card} mt-9`}>
                <h2 className="font-serif text-2xl">Tell us what you need</h2>
                <p className="mt-2 text-sm text-[#6B5A50]">Share your question and the team can reply in your private conversation.</p>
                <div className="mt-6 grid gap-5">
                  <label className="block text-sm font-medium" htmlFor="support-subject">Subject
                    <input id="support-subject" required maxLength={200} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="For example, a question about my bouquet" className="mt-2 w-full rounded-2xl border border-[#D9CDC5] bg-[#FCF9F5] px-4 py-3 outline-offset-2" />
                  </label>
                  <label className="block text-sm font-medium" htmlFor="support-first-message">Your message
                    <textarea id="support-first-message" required maxLength={5000} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="How can we help?" className="mt-2 w-full resize-y rounded-2xl border border-[#D9CDC5] bg-[#FCF9F5] px-4 py-3 outline-offset-2" />
                  </label>
                </div>
                {formError && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800">{formError}</p>}
                <button disabled={busy} type="submit" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#4A3B32] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send size={16} /> {busy ? 'Creating conversation…' : 'Send to support'}</button>
              </form>
            )}
            <div className="mt-11 flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-serif text-2xl sm:text-3xl">Conversation history</h2>
              <div className="flex gap-2" role="group" aria-label="Filter conversations">
                {(['ALL', 'OPEN', 'CLOSED'] as const).map((value) => (
                  <button type="button" key={value} onClick={() => { setFilter(value); setPage(1); }} aria-pressed={filter === value} className={`rounded-full border px-4 py-2 text-xs font-semibold ${filter === value ? 'border-[#4A3B32] bg-[#4A3B32] text-white' : 'border-[#EADFD8] bg-white'}`}>{value === 'ALL' ? 'All' : value === 'OPEN' ? 'Open' : 'Closed'}</button>
                ))}
              </div>
            </div>
            {error && <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button type="button" className="ml-3 underline" onClick={() => setRefresh((value) => value + 1)}>Retry</button></div>}
            {loading && <p role="status" className="mt-6 text-sm text-[#6B5A50]">Loading your support conversations…</p>}
            {!loading && !error && items.length === 0 && <div className={`${card} mt-6 text-center`}><MessageCircle className="mx-auto text-[#927A70]" size={32} /><h3 className="mt-4 font-serif text-2xl">No conversations here yet</h3><p className="mt-3 text-sm text-[#6B5A50]">{filter === 'ALL' ? 'Start a conversation whenever you need a hand.' : `You have no ${filter.toLowerCase()} conversations.`}</p></div>}
            {!loading && items.length > 0 && <div className="mt-6 grid gap-4">{items.map((item) => (
              <Link key={item.id} href={`/support/${encodeURIComponent(item.id)}`} className={`${card} block transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A3B32]`}>
                <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 flex-1 break-words font-serif text-xl sm:text-2xl">{item.subject || 'Support conversation'}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'OPEN' ? 'bg-[#F7EBE8]' : 'bg-[#F1EEE9]'}`}>{item.status === 'OPEN' ? 'Open' : 'Closed'}</span></div>
                <p className="mt-3 line-clamp-2 whitespace-pre-wrap break-words text-sm text-[#6B5A50]">{item.messages?.[0]?.body || 'Open this conversation to view messages.'}</p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#88776F]"><span>Last activity: {formatSupportDate(item.lastMessageAt || item.createdAt)}</span><span className="inline-flex items-center gap-2 font-semibold text-[#4A3B32]">Open conversation <ArrowRight size={15} /></span></div>
              </Link>
            ))}</div>}
            {!loading && !error && pages > 1 && <nav className="mt-7 flex items-center justify-center gap-4 text-sm" aria-label="Support conversation pages"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-full border border-[#EADFD8] bg-white px-4 py-2 disabled:opacity-40">Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-[#EADFD8] bg-white px-4 py-2 disabled:opacity-40">Next</button></nav>}
          </>
        )}
        <div className="mt-10 rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-8"><div className="flex items-center gap-3"><Sparkles size={20} /><h2 className="font-serif text-xl">Planning something handmade?</h2></div><p className="mt-3 text-sm leading-7 text-[#6B5A50]">For custom designs and price quotations, our bespoke crochet studio is the best place to start.</p><Link href="/custom-crochet" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Explore custom crochet <ArrowRight size={16} /></Link></div>
      </div>
    </section>
  );
}
