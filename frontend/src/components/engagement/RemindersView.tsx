'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CalendarDays, Gift, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { authenticatedRequest, isAuthenticationError } from '@/lib/session';
import {
  dateInputValue, eventLabel, readReminderList, reminderBase,
  type OccasionReminder, type Pagination, type ReminderFormPayload,
} from '@/lib/engagement';

const card = 'rounded-3xl border border-[#EADFD8] bg-white p-6 shadow-sm sm:p-8';
const field = 'mt-2 min-h-12 w-full rounded-2xl border border-[#EADFD8] bg-[#FCF9F5] px-4 py-3 text-sm text-[#4A3B32] focus:outline-2 focus:outline-offset-1 focus:outline-[#4A3B32]';
const defaultForm = { title: '', recipientName: '', occasionLabel: '', eventDate: '', reminderDaysBefore: '7', recursYearly: true, isActive: true };

export default function RemindersView() {
  const [items, setItems] = useState<OccasionReminder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await authenticatedRequest<OccasionReminder[] | { reminders: OccasionReminder[]; pagination?: Pagination }>(
        `${reminderBase}?page=${page}&limit=12`, { signal },
      );
      if (signal?.aborted) return;
      const result = readReminderList(response);
      setItems(result.reminders);
      setTotalPages(Math.max(1, result.pagination?.totalPages ?? 1));
      setSignedOut(false);
    } catch (cause) {
      if (signal?.aborted) return;
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not load reminders.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();
    // Run network initialization after the effect completes (React purity rule).
    const timer = window.setTimeout(() => { void load(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load, refresh]);

  function resetForm() { setEditingId(null); setForm(defaultForm); setFormError(''); }

  function beginEdit(reminder: OccasionReminder) {
    setEditingId(reminder.id);
    setForm({
      title: reminder.title,
      recipientName: reminder.recipientName ?? '',
      occasionLabel: reminder.occasionLabel ?? '',
      eventDate: dateInputValue(reminder.eventDate),
      reminderDaysBefore: String(reminder.reminderDaysBefore),
      recursYearly: reminder.recursYearly,
      isActive: reminder.isActive,
    });
    setFormError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFormError('');
    setNotice('');
    const days = Number(form.reminderDaysBefore);
    if (!form.title.trim() || !form.eventDate) { setFormError('Enter an occasion title and date.'); return; }
    if (!Number.isInteger(days) || days < 0 || days > 365) { setFormError('Choose a reminder notice period between 0 and 365 days.'); return; }
    const dateOnly = form.eventDate;
    const parsedDate = new Date(`${dateOnly}T00:00:00Z`);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== dateOnly
    ) {
      setFormError('Enter a valid event date.');
      return;
    }
    const payload: ReminderFormPayload = {
      title: form.title.trim(),
      eventDate: dateOnly, reminderDaysBefore: days, recursYearly: form.recursYearly, isActive: form.isActive,
      ...(form.recipientName.trim() ? { recipientName: form.recipientName.trim() } : {}),
      ...(form.occasionLabel.trim() ? { occasionLabel: form.occasionLabel.trim() } : {}),
    };
    setSaving(true);
    try {
      await authenticatedRequest(editingId ? `${reminderBase}/${encodeURIComponent(editingId)}` : reminderBase, {
        method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload),
      });
      setNotice(editingId ? 'Reminder updated.' : 'Reminder saved.');
      resetForm();
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      setFormError(cause instanceof Error ? cause.message : 'Could not save this occasion.');
    } finally { setSaving(false); }
  }

  async function remove(reminder: OccasionReminder) {
    if (!window.confirm(`Remove the reminder "${reminder.title}"?`)) return;
    setError('');
    try {
      await authenticatedRequest(`${reminderBase}/${encodeURIComponent(reminder.id)}`, { method: 'DELETE' });
      setNotice('Reminder removed.');
      if (editingId === reminder.id) resetForm();
      setRefresh((value) => value + 1);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      else setError(cause instanceof Error ? cause.message : 'Could not remove the reminder.');
    }
  }

  return (
    <section className="min-h-[75vh] bg-[#FCF9F5] py-12 text-[#4A3B32] sm:py-16">
      <div className="page-container">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link href="/account" className="underline underline-offset-4">← My account</Link>
          <Link href="/notifications" className="rounded-full border border-[#EADFD8] bg-white px-5 py-3">Notification inbox →</Link>
        </div>
        <div className="mt-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[.23em] text-[#927A70]">Thoughtful gifting, beautifully timed</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Occasion reminders</h1>
          <p className="mt-4 text-sm leading-7 text-[#6B5A50]">Keep special birthdays, anniversaries and celebrations close. Save the occasion here so it stays part of your account.</p>
        </div>
        {signedOut ? (
          <div className={`${card} mt-10`}><h2 className="font-serif text-2xl">Your moments, kept private</h2><p className="mt-3 text-sm">Please sign in to manage reminders.</p><Link href="/login" className="mt-5 inline-flex rounded-full bg-[#4A3B32] px-6 py-3 text-sm text-white">Sign in</Link></div>
        ) : (
          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <div className={card}>
              <div className="flex items-center gap-3"><span className="rounded-full bg-[#F7EBE8] p-3"><Gift size={20} /></span><h2 className="font-serif text-2xl">{editingId ? 'Edit this occasion' : 'Remember a special day'}</h2></div>
              <p className="mt-3 text-sm leading-6 text-[#6B5A50]">Mark the important details, then save your occasion.</p>
              <form className="mt-7 space-y-5" onSubmit={(event) => void save(event)}>
                <label className="block text-sm font-medium">Occasion title *<input required maxLength={200} className={field} placeholder="A birthday to remember" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                <label className="block text-sm font-medium">Recipient name<input maxLength={200} className={field} placeholder="Who is it for?" value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} /></label>
                <label className="block text-sm font-medium">Occasion type<input maxLength={120} className={field} placeholder="Birthday, anniversary, graduation…" value={form.occasionLabel} onChange={(event) => setForm({ ...form, occasionLabel: event.target.value })} /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">Event date *<input required type="date" className={field} value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} /></label>
                  <label className="block text-sm font-medium">Remind me before<input type="number" min="0" max="365" step="1" className={field} value={form.reminderDaysBefore} onChange={(event) => setForm({ ...form, reminderDaysBefore: event.target.value })} /><span className="mt-1 block text-xs font-normal text-[#88776F]">Days before the event</span></label>
                </div>
                <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={form.recursYearly} onChange={(event) => setForm({ ...form, recursYearly: event.target.checked })} className="mt-1 accent-[#4A3B32]" /><span>Repeat this occasion every year</span></label>
                <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="mt-1 accent-[#4A3B32]" /><span>Keep this reminder active</span></label>
                {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
                <div className="flex flex-wrap gap-3"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#4A3B32] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save reminder'}</button>{editingId && <button type="button" onClick={resetForm} className="rounded-full border border-[#EADFD8] px-5 py-3 text-sm">Cancel edit</button>}</div>
              </form>
            </div>
            <div>
              {notice && <p role="status" className="mb-5 rounded-2xl border border-[#BBD9C1] bg-[#F2FBF3] p-4 text-sm">{notice}</p>}
              {error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button onClick={() => setRefresh((value) => value + 1)} className="ml-2 underline">Retry</button></p>}
              <div className="flex items-center justify-between gap-3"><h2 className="font-serif text-2xl">Your saved moments</h2><span className="text-sm text-[#88776F]">{loading ? 'Loading…' : `${items.length} on this page`}</span></div>
              {loading && <p role="status" className="mt-6 text-sm">Loading reminders…</p>}
              {!loading && !error && items.length === 0 && <div className={`${card} mt-5 text-center`}><CalendarDays className="mx-auto text-[#9D8173]" size={30} /><h3 className="mt-4 font-serif text-2xl">Every beautiful moment matters.</h3><p className="mt-3 text-sm text-[#6B5A50]">Add your first occasion with the form.</p></div>}
              {!loading && items.length > 0 && <div className="mt-5 space-y-4">{items.map((reminder) => <article key={reminder.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-serif text-2xl">{reminder.title}</h3><p className="mt-1 text-sm text-[#6B5A50]">{eventLabel(reminder.eventDate)}</p></div><span className={`rounded-full px-3 py-1 text-xs ${reminder.isActive ? 'bg-[#F7EBE8]' : 'bg-gray-100'}`}>{reminder.isActive ? 'Active' : 'Paused'}</span></div>
                {(reminder.recipientName || reminder.occasionLabel) && <p className="mt-4 text-sm text-[#6B5A50]">{[reminder.recipientName, reminder.occasionLabel].filter(Boolean).join(' · ')}</p>}
                <p className="mt-3 flex items-center gap-2 text-xs text-[#88776F]"><RotateCcw size={14} />{reminder.recursYearly ? 'Repeats yearly' : 'One-time event'} · {reminder.reminderDaysBefore} days notice</p>
                <div className="mt-5 flex gap-4 border-t border-[#EADFD8] pt-4 text-sm"><button type="button" onClick={() => beginEdit(reminder)} className="font-semibold underline underline-offset-4">Edit</button><button type="button" onClick={() => void remove(reminder)} className="inline-flex items-center gap-1 text-red-700 underline underline-offset-4"><Trash2 size={14} /> Remove</button></div>
              </article>)}</div>}
              {!loading && totalPages > 1 && <nav aria-label="Reminder pages" className="mt-7 flex items-center justify-center gap-4 text-sm"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-[#EADFD8] bg-white px-4 py-2 disabled:opacity-40">Previous</button><span>{page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-[#EADFD8] bg-white px-4 py-2 disabled:opacity-40">Next</button></nav>}
            </div>
          </div>
        )}
        <p className="mt-10 max-w-3xl text-xs leading-6 text-[#88776F]">Note: Saved reminders are available in your account. Automated email and WhatsApp delivery is not activated yet.</p>
      </div>
    </section>
  );
}
