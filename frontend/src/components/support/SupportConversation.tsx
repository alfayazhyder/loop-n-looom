'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { authenticatedRequest, isAuthenticationError } from '@/lib/session';
import {
  customerSupportBase,
  formatSupportDate,
  safeSupportAttachment,
  type SupportConversation as Conversation,
  type SupportDetailResponse,
  type SupportMessage,
} from '@/lib/customerSupport';

const card = 'rounded-3xl border border-[#EADFD8] bg-white p-6 shadow-sm sm:p-8';
const pageSize = 50;

export default function SupportConversation({ conversationId }: { conversationId: string }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const path = `${customerSupportBase}/${encodeURIComponent(conversationId)}`;

  const loadLatest = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const first = await authenticatedRequest<SupportDetailResponse>(
        `${path}?page=1&limit=${pageSize}`, { signal },
      );
      if (signal?.aborted) return;
      if (!first.conversation?.id || !Array.isArray(first.messages) || !first.messagePagination) {
        throw new Error('Unexpected support conversation details.');
      }
      const newestPage = Math.max(1, first.messagePagination.totalPages);
      const result = newestPage > 1
        ? await authenticatedRequest<SupportDetailResponse>(
            `${path}?page=${newestPage}&limit=${pageSize}`, { signal },
          )
        : first;
      if (signal?.aborted) return;
      if (!Array.isArray(result.messages)) throw new Error('Unexpected support messages response.');
      setConversation(result.conversation);
      setMessages(result.messages);
      setPage(newestPage);
      setSignedOut(false);
    } catch (cause) {
      if (signal?.aborted) return;
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not open your support conversation.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void loadLatest(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [loadLatest, refresh]);

  async function loadOlder() {
    if (loadingOlder || page <= 1) return;
    setLoadingOlder(true);
    setError('');
    try {
      const result = await authenticatedRequest<SupportDetailResponse>(
        `${path}?page=${page - 1}&limit=${pageSize}`,
      );
      if (!Array.isArray(result.messages)) throw new Error('Unexpected older messages response.');
      setMessages((current) => {
        const seen = new Set(result.messages.map((item) => item.id));
        return [...result.messages, ...current.filter((item) => !seen.has(item.id))];
      });
      setPage(page - 1);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not load earlier messages.');
    } finally {
      setLoadingOlder(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draft.trim();
    if (busy || !value || value.length > 5000 || conversation?.status !== 'OPEN') return;
    setBusy(true);
    setError('');
    try {
      await authenticatedRequest(`${path}/messages`, {
        method: 'POST', body: JSON.stringify({ message: value }),
      });
      setDraft('');
      await loadLatest();
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not send your message.');
    } finally {
      setBusy(false);
    }
  }

  async function closeConversation() {
    if (busy || conversation?.status !== 'OPEN') return;
    if (!window.confirm('Close this support conversation? You can open a new conversation if you need more help.')) return;
    setBusy(true);
    setError('');
    try {
      await authenticatedRequest(`${path}/close`, { method: 'PATCH' });
      await loadLatest();
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not close your conversation.');
    } finally {
      setBusy(false);
    }
  }

  if (signedOut) return (
    <section className="min-h-[70vh] bg-[#FCF9F5] py-14 text-[#4A3B32]"><div className="page-container"><h1 className="font-serif text-3xl">Sign in to read support messages</h1><p className="mt-3 text-sm">Your support messages are private.</p><Link href="/login" className="mt-5 inline-block rounded-full bg-[#4A3B32] px-6 py-3 text-white">Sign in</Link></div></section>
  );

  return (
    <section className="min-h-[76vh] bg-[#FCF9F5] py-12 text-[#4A3B32] sm:py-16">
      <div className="page-container max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/support" className="inline-flex items-center gap-2 text-sm underline underline-offset-4"><ArrowLeft size={16} /> All support conversations</Link>
          <button type="button" disabled={loading || busy} onClick={() => setRefresh((value) => value + 1)} className="inline-flex items-center gap-2 rounded-full border border-[#EADFD8] bg-white px-5 py-2.5 text-sm disabled:opacity-50"><RefreshCw size={16} /> Refresh replies</button>
        </div>
        {loading && <p role="status" className="mt-10 text-sm text-[#6B5A50]">Loading conversation…</p>}
        {error && <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button type="button" onClick={() => setRefresh((value) => value + 1)} className="ml-3 underline">Retry</button></div>}
        {!loading && !conversation && !error && <div className={`${card} mt-8`}><h1 className="font-serif text-2xl">Conversation unavailable</h1><p className="mt-3 text-sm">The conversation may no longer exist or may not belong to your account.</p></div>}
        {conversation && (
          <>
            <div className={`${card} mt-8`}>
              <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#927A70]">A conversation with LOOP_N_LOOOM</p>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <h1 className="min-w-0 flex-1 break-words font-serif text-3xl sm:text-4xl">{conversation.subject || 'Support conversation'}</h1>
                <span className={`rounded-full px-4 py-2 text-xs font-semibold ${conversation.status === 'OPEN' ? 'bg-[#F7EBE8]' : 'bg-[#F1EEE9]'}`}>{conversation.status === 'OPEN' ? 'Open' : 'Closed'}</span>
              </div>
              <p className="mt-4 text-sm text-[#6B5A50]">Opened {formatSupportDate(conversation.createdAt)}{conversation.order?.orderNumber ? ` · Order ${conversation.order.orderNumber}` : ''}</p>
              <p className="mt-2 text-sm text-[#6B5A50]">{conversation.assignedAdmin?.firstName ? `Assigned to ${conversation.assignedAdmin.firstName}` : 'Our team will respond here when available.'}</p>
            </div>
            <div className={`${card} mt-6`}>
              <div className="flex items-center gap-3 border-b border-[#EADFD8] pb-5"><MessageCircle size={20} /><h2 className="font-serif text-2xl">Messages</h2></div>
              {page > 1 && <div className="mt-6 text-center"><button type="button" disabled={loadingOlder || busy} onClick={() => void loadOlder()} className="rounded-full border border-[#EADFD8] px-5 py-2.5 text-sm disabled:opacity-50">{loadingOlder ? 'Loading earlier messages…' : 'Load earlier messages'}</button></div>}
              {messages.length === 0 && <p className="mt-6 text-sm text-[#6B5A50]">No messages in this conversation yet.</p>}
              <ol aria-label="Support message history" className="mt-6 space-y-5">
                {messages.map((item) => {
                  const isCustomer = item.senderType === 'CUSTOMER';
                  const attachment = safeSupportAttachment(item.attachmentUrl);
                  return (
                    <li key={item.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                      <article className={`max-w-[92%] min-w-0 rounded-3xl px-5 py-4 sm:max-w-[78%] ${isCustomer ? 'bg-[#F7EBE8]' : 'border border-[#EADFD8] bg-[#FCF9F5]'}`}>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#796960]"><span>{isCustomer ? 'You' : 'LOOP_N_LOOOM team'}</span><time dateTime={item.createdAt}>{formatSupportDate(item.createdAt)}</time></div>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7">{item.body}</p>
                        {attachment && <a href={attachment} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="mt-3 inline-flex items-center gap-2 break-all text-xs font-semibold underline underline-offset-4">View attached link <ExternalLink size={13} /></a>}
                      </article>
                    </li>
                  );
                })}
              </ol>
              {conversation.status === 'OPEN' ? (
                <form onSubmit={(event) => void sendMessage(event)} className="mt-9 border-t border-[#EADFD8] pt-6">
                  <label htmlFor="support-reply" className="text-sm font-semibold">Reply to support</label>
                  <textarea id="support-reply" required rows={4} maxLength={5000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type your message to our team…" className="mt-3 w-full resize-y rounded-2xl border border-[#D9CDC5] bg-[#FCF9F5] px-4 py-3 text-sm outline-offset-2" />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#88776F]">{draft.length} / 5,000 characters</p><button disabled={busy || !draft.trim()} type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#4A3B32] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send size={16} /> {busy ? 'Sending…' : 'Send message'}</button></div>
                </form>
              ) : (
                <div className="mt-8 rounded-2xl bg-[#F7EBE8] p-5 text-sm"><p className="font-semibold">This conversation is closed.</p><p className="mt-2 text-[#6B5A50]">Replies are disabled. If you need more help, you can start a new conversation.</p><Link href="/support" className="mt-3 inline-block underline underline-offset-4">Start another conversation →</Link></div>
              )}
            </div>
            {conversation.status === 'OPEN' && <div className="mt-6 flex justify-end"><button type="button" disabled={busy} onClick={() => void closeConversation()} className="rounded-full border border-[#CFC1B8] bg-white px-6 py-3 text-sm font-medium disabled:opacity-50">Close conversation</button></div>}
          </>
        )}
      </div>
    </section>
  );
}
