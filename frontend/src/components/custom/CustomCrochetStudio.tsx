'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authenticatedRequest, getCurrentCustomer, isAuthenticationError } from '@/lib/session';
import { requestBase, type CrochetRequestForm, type CrochetRequest } from '@/lib/customRequests';

const fieldStyle = 'mt-2 w-full min-h-12 rounded-2xl border border-[#EADFD8] bg-white px-4 py-3 text-sm outline-offset-2 focus:border-[#4A3B32]';
const panel = 'rounded-3xl border border-[#EADFD8] bg-white p-6 shadow-sm sm:p-8';

export default function CustomCrochetStudio() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [colors, setColors] = useState('');
  const [size, setSize] = useState('');
  const [occasion, setOccasion] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [minDeliveryDate, setMinDeliveryDate] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const tomorrow = new Date(Date.now() + 86400000);
      setMinDeliveryDate(tomorrow.toISOString().slice(0, 10));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function check() {
      try { await getCurrentCustomer(); }
      catch (cause) {
        if (active) {
          if (isAuthenticationError(cause)) setSignedOut(true);
          else setError(cause instanceof Error ? cause.message : 'Could not verify your session.');
        }
      } finally { if (active) setChecking(false); }
    }
    void check();
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || signedOut) return;
    setError('');
    const minimum = budgetMin.trim() === '' ? undefined : Number(budgetMin);
    const maximum = budgetMax.trim() === '' ? undefined : Number(budgetMax);
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      setError('Minimum budget cannot exceed maximum budget.');
      return;
    }
    if (targetDate && new Date(`${targetDate}T23:59:59+04:00`).getTime() <= Date.now()) {
      setError('Choose a future target delivery date.');
      return;
    }
    const payload: CrochetRequestForm = {
      title: title.trim(), description: description.trim(),
      colors: colors.split(',').map((color) => color.trim()).filter(Boolean),
      ...(size.trim() ? { size: size.trim() } : {}),
      ...(occasion.trim() ? { occasion: occasion.trim() } : {}),
      ...(targetDate ? { targetDate: new Date(`${targetDate}T12:00:00+04:00`).toISOString() } : {}),
      ...(minimum !== undefined ? { budgetMin: minimum } : {}),
      ...(maximum !== undefined ? { budgetMax: maximum } : {}),
    };
    if (payload.colors.length > 20 || payload.colors.some((color) => color.length > 80)) {
      setError('Use up to 20 colours, each no longer than 80 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = await authenticatedRequest<CrochetRequest | { request: CrochetRequest }>(requestBase, {
        method: 'POST', body: JSON.stringify(payload),
      });
      const created = 'request' in result ? result.request : result;
      router.push(created?.id ? `/custom-crochet/requests/${encodeURIComponent(created.id)}` : '/custom-crochet/requests');
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      setError(cause instanceof Error ? cause.message : 'Your request could not be submitted.');
    } finally { setBusy(false); }
  }

  return (
    <section className="min-h-[76vh] bg-[#FCF9F5] py-12 text-[#4A3B32] sm:py-16">
      <div className="page-container">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-sm underline underline-offset-4">← Back to boutique</Link>
          <Link href="/custom-crochet/requests" className="rounded-full border border-[#EADFD8] bg-white px-5 py-3 text-sm font-medium">My custom requests →</Link>
        </div>
        <div className="mt-10 grid items-start gap-9 lg:grid-cols-[minmax(0,1.4fr)_minmax(275px,.8fr)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.23em] text-[#89756A]">The bespoke crochet atelier</p>
            <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight sm:text-6xl">Your imagination.<br/>Made by hand.</h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-[#6B5A50] sm:text-base">
              Tell us about the handmade gift you have in mind. Our makers will review your brief, clarify the details and send a personalised quotation.
            </p>
            {checking ? <p role="status" className="mt-8">Checking your account…</p> : null}
            {signedOut ? (
              <div className={`${panel} mt-8`}>
                <h2 className="font-serif text-2xl">Sign in to commission your creation</h2>
                <p className="mt-3 text-sm leading-7 text-[#6B5A50]">A customer account lets you discuss designs, receive quotations and follow the request.</p>
                <Link href="/login" className="mt-5 inline-flex rounded-full bg-[#4A3B32] px-6 py-3 text-sm font-medium text-white">Sign in</Link>
                <Link href="/register" className="ml-4 text-sm underline">Create an account</Link>
              </div>
            ) : (
              <form onSubmit={(event) => void submit(event)} className={`${panel} mt-8 space-y-7`}>
                <div>
                  <h2 className="font-serif text-2xl">Your design brief</h2>
                  <p className="mt-2 text-sm text-[#6B5A50]">The more detail you share, the closer we can get to your vision.</p>
                </div>
                <label className="block text-sm font-medium">Creation title <span aria-hidden="true">*</span>
                  <input required maxLength={200} className={fieldStyle} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. A forever bouquet for Mum" />
                </label>
                <label className="block text-sm font-medium">Describe your idea <span aria-hidden="true">*</span>
                  <textarea required rows={6} maxLength={5000} className={fieldStyle} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell us about the style, design details, yarn textures, inspiration and any special meaning…" />
                  <span className="mt-1 block text-right text-xs text-[#88776F]">{description.length} / 5000</span>
                </label>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-medium">Preferred colours
                    <input className={fieldStyle} value={colors} onChange={(event) => setColors(event.target.value)} placeholder="Blush, cream, lavender" maxLength={1600} />
                    <span className="mt-1 block text-xs font-normal text-[#88776F]">Separate multiple colours with commas</span>
                  </label>
                  <label className="block text-sm font-medium">Approximate dimensions
                    <input className={fieldStyle} value={size} onChange={(event) => setSize(event.target.value)} placeholder="e.g. 25 cm tall" maxLength={100} />
                  </label>
                  <label className="block text-sm font-medium">Occasion
                    <input className={fieldStyle} value={occasion} onChange={(event) => setOccasion(event.target.value)} placeholder="Birthday, wedding, just because…" maxLength={120} />
                  </label>
                  <label className="block text-sm font-medium">Preferred delivery date
                    <input type="date" className={fieldStyle} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} min={minDeliveryDate} />
                    <span className="mt-1 block text-xs font-normal text-[#88776F]">Subject to our makers&apos; availability</span>
                  </label>
                  <label className="block text-sm font-medium">Budget from (AED)
                    <input type="number" inputMode="decimal" min="0" step="0.01" className={fieldStyle} value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} placeholder="Optional" />
                  </label>
                  <label className="block text-sm font-medium">Budget up to (AED)
                    <input type="number" inputMode="decimal" min="0" step="0.01" className={fieldStyle} value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} placeholder="Optional" />
                  </label>
                </div>
                <div className="rounded-2xl bg-[#FCF9F5] p-4 text-xs leading-6 text-[#6B5A50]">
                  Inspiration images cannot be uploaded yet because image-upload storage is not connected. Describe your references in the brief; no image is sent or stored by this form.
                </div>
                {error ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
                <button type="submit" disabled={busy || checking || signedOut || Boolean(error && checking)} className="min-h-13 w-full rounded-full bg-[#4A3B32] px-7 py-4 text-sm font-semibold text-white disabled:opacity-50">
                  {busy ? 'Submitting your brief…' : 'Submit custom request →'}
                </button>
                <p className="text-center text-xs text-[#88776F]">Submitting a design brief is free. It does not place an order or collect payment.</p>
              </form>
            )}
          </div>
          <aside className="space-y-5 lg:sticky lg:top-28">
            <div className="rounded-[2rem] bg-[#F7EBE8] p-8 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#89756A]">Made especially for you</p>
              <h2 className="mt-5 font-serif text-3xl">From a little thought to a lasting keepsake.</h2>
              <ol className="mt-7 space-y-5 text-sm leading-6">
                <li><strong>01 · Share your vision</strong><p className="mt-1 text-[#6B5A50]">Colours, shape, occasion and the story behind your gift.</p></li>
                <li><strong>02 · Discuss the details</strong><p className="mt-1 text-[#6B5A50]">Our team clarifies your idea directly through the request conversation.</p></li>
                <li><strong>03 · Receive a quotation</strong><p className="mt-1 text-[#6B5A50]">Review the proposed price and production details before deciding.</p></li>
                <li><strong>04 · Handcrafted with care</strong><p className="mt-1 text-[#6B5A50]">Production and payment arrangements follow only after confirmation.</p></li>
              </ol>
            </div>
            <div className="rounded-3xl border border-[#EADFD8] bg-white p-6">
              <p className="font-serif text-xl">Already shared an idea?</p>
              <Link href="/custom-crochet/requests" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">See my requests →</Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
