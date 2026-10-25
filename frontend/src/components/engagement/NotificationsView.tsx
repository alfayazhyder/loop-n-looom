'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Mail, MessageCircle } from 'lucide-react';
import { authenticatedRequest, isAuthenticationError } from '@/lib/session';
import { eventLabel, formattedStatus, notificationBase, readNotifications, type CustomerNotification, type Pagination } from '@/lib/engagement';

const card = 'rounded-3xl border border-[#EADFD8] bg-white p-6 sm:p-8';

export default function NotificationsView() {
  const [items, setItems] = useState<CustomerNotification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const [unread, setUnread] = useState<number | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const url = `${notificationBase}?page=${page}&limit=12${unreadOnly ? '&unreadOnly=true' : ''}`;
      const [result, counts] = await Promise.all([
        authenticatedRequest<CustomerNotification[] | { notifications: CustomerNotification[]; pagination?: Pagination }>(url, { signal }),
        authenticatedRequest<{ unreadCount?: number; count?: number; unread?: number }>(`${notificationBase}/unread-count`, { signal }),
      ]);
      if (signal?.aborted) return;
      const list = readNotifications(result);
      setItems(list.notifications);
      setTotalPages(Math.max(1, list.pagination?.totalPages ?? 1));
      const count = counts.unreadCount ?? counts.count ?? counts.unread;
      setUnread(typeof count === 'number' ? count : null);
      setSignedOut(false);
    } catch (cause) {
      if (signal?.aborted) return;
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not load notifications.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page, unreadOnly]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void load(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load, refresh]);

  async function markOne(id: string) {
    setBusyId(id);
    setError('');
    try {
      await authenticatedRequest(`${notificationBase}/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
      setUnread((count) => count === null ? null : Math.max(0, count - 1));
      if (unreadOnly) setRefresh((value) => value + 1);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not update notification.');
    } finally { setBusyId(null); }
  }

  async function markAll() {
    setBusyId('all');
    setError('');
    try {
      await authenticatedRequest(`${notificationBase}/read-all`, { method: 'PATCH' });
      setUnread(0);
      setNotice('All notifications marked as read.');
      setRefresh((value) => value + 1);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not mark notifications as read.');
    } finally { setBusyId(null); }
  }

  return (
    <section className="min-h-[75vh] bg-[#FCF9F5] py-12 text-[#4A3B32] sm:py-16">
      <div className="page-container">
        <div className="flex flex-wrap justify-between gap-4 text-sm"><Link href="/account" className="underline underline-offset-4">← My account</Link><Link href="/reminders" className="rounded-full border border-[#EADFD8] bg-white px-5 py-3">Occasion reminders →</Link></div>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[.23em] text-[#927A70]">Your LOOP_N_LOOOM updates</p><h1 className="mt-3 font-serif text-4xl sm:text-5xl">Notification inbox</h1><p className="mt-4 text-sm leading-7 text-[#6B5A50]">A quiet place for messages and updates connected to your account.</p></div>
          {unread !== null && !signedOut && <div className="rounded-2xl border border-[#EADFD8] bg-white px-5 py-4 text-sm"><span className="font-semibold text-lg">{unread}</span> unread</div>}
        </div>
        {signedOut ? <div className={`${card} mt-10`}><p>Sign in to view your private notifications.</p><Link href="/login" className="mt-5 inline-flex rounded-full bg-[#4A3B32] px-6 py-3 text-sm text-white">Sign in</Link></div> : <>
          <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
            <label className="inline-flex items-center gap-3 text-sm"><input type="checkbox" checked={unreadOnly} onChange={(event) => { setUnreadOnly(event.target.checked); setPage(1); }} className="accent-[#4A3B32]" />Show unread only</label>
            <button type="button" disabled={busyId !== null || unread === 0} onClick={() => void markAll()} className="inline-flex items-center gap-2 rounded-full border border-[#EADFD8] bg-white px-5 py-3 text-sm font-medium disabled:opacity-50"><CheckCheck size={17} />{busyId === 'all' ? 'Updating…' : 'Mark all read'}</button>
          </div>
          {notice && <p role="status" className="mt-5 rounded-2xl border border-[#BBD9C1] bg-[#F2FBF3] p-4 text-sm">{notice}</p>}
          {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button className="ml-3 underline" onClick={() => setRefresh((value) => value + 1)}>Retry</button></div>}
          {loading && <p role="status" className="mt-8 text-sm">Loading notifications…</p>}
          {!loading && !error && items.length === 0 && <div className={`${card} mt-6 text-center`}><Bell size={29} className="mx-auto text-[#927A70]" /><h2 className="mt-4 font-serif text-2xl">All caught up</h2><p className="mt-3 text-sm text-[#6B5A50]">{unreadOnly ? 'You have no unread notifications.' : 'Your inbox is empty for now.'}</p></div>}
          {!loading && items.length > 0 && <div className="mt-6 space-y-4">{items.map((item) => <article key={item.id} className={`${card} ${!item.readAt ? 'border-[#D4A9A2]' : ''}`}>
            <div className="flex items-start gap-4"><span className="rounded-full bg-[#F7EBE8] p-3">{item.channel === 'WHATSAPP' ? <MessageCircle size={19} /> : <Mail size={19} />}</span><div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-serif text-xl">{item.subject?.trim() || formattedStatus(item.templateKey)}</h2>{!item.readAt && <span className="rounded-full bg-[#F7EBE8] px-3 py-1 text-xs font-semibold">Unread</span>}</div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#6B5A50]">{item.body?.trim() || 'You have a new account update.'}</p>
              <p className="mt-4 text-xs text-[#88776F]">{eventLabel(item.createdAt)} · {item.channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'} · {formattedStatus(item.status)}</p>
              {!item.readAt && <button type="button" disabled={busyId !== null} onClick={() => void markOne(item.id)} className="mt-4 text-sm font-semibold underline underline-offset-4 disabled:opacity-50">Mark as read</button>}
            </div></div>
          </article>)}</div>}
          {!loading && totalPages > 1 && <nav className="mt-7 flex items-center justify-center gap-4 text-sm" aria-label="Notification pages"><button disabled={page <= 1} className="rounded-full border border-[#EADFD8] bg-white px-4 py-2 disabled:opacity-40" onClick={() => setPage((value) => value - 1)}>Previous</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} className="rounded-full border border-[#EADFD8] bg-white px-4 py-2 disabled:opacity-40" onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
        </>}
      </div>
    </section>
  );
}
