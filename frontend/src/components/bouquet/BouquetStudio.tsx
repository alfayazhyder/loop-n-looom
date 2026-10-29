"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Flower2, Gift, Heart, Minus, Plus, Sparkles } from "lucide-react";

import BouquetPreview from "@/components/bouquet/BouquetPreview";
import {
  MAX_STEMS,
  describeFlowers,
  flowerOptions,
  initialFlowers,
  makeBouquetRequest,
  occasions,
  palettes,
  ribbons,
  stemCount,
  wraps,
  type BouquetDesign,
  type FlowerId,
} from "@/lib/bouquetBuilder";
import { authenticatedRequest, getCurrentCustomer, isAuthenticationError } from "@/lib/session";
import { requestBase, type CrochetRequest } from "@/lib/customRequests";

const panel = "rounded-[2rem] border border-[#EADFD8] bg-white p-6 shadow-sm sm:p-8";
const field = "mt-2 min-h-12 w-full rounded-2xl border border-[#DED2C9] bg-[#FCF9F5] px-4 py-3 text-sm text-[#4A3B32] outline-offset-2 focus:border-[#4A3B32]";

function tomorrowUtc(): string {
  return new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
}

export default function BouquetStudio() {
  const router = useRouter();
  const [design, setDesign] = useState<BouquetDesign>({
    flowers: { ...initialFlowers },
    palette: palettes[0],
    wrap: wraps[0],
    ribbon: ribbons[1],
    occasion: "Birthday",
    cardMessage: "",
    specialNotes: "",
    targetDate: "",
    budgetMin: "",
    budgetMax: "",
  });
  const [checking, setChecking] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const count = stemCount(design.flowers);
  const flowerDescription = useMemo(() => describeFlowers(design.flowers), [design.flowers]);

  useEffect(() => {
    let active = true;
    async function checkAccount() {
      try {
        await getCurrentCustomer();
        if (active) {
          setSignedOut(false);
          setAuthError("");
        }
      } catch (cause) {
        if (!active) return;
        if (isAuthenticationError(cause)) {
          setSignedOut(true);
        } else {
          setAuthError(cause instanceof Error ? cause.message : "Could not verify your account.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    void checkAccount();
    return () => { active = false; };
  }, []);

  function changeFlower(id: FlowerId, change: number) {
    setError("");
    setDesign((previous) => {
      const next = previous.flowers[id] + change;
      if (next < 0 || next > MAX_STEMS || (change > 0 && stemCount(previous.flowers) >= MAX_STEMS)) {
        return previous;
      }
      return { ...previous, flowers: { ...previous.flowers, [id]: next } };
    });
  }

  function setDetail<Key extends keyof BouquetDesign>(key: Key, value: BouquetDesign[Key]) {
    setError("");
    setDesign((previous) => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || checking || signedOut || authError) return;
    setError("");
    setMessage("");

    try {
      const payload = makeBouquetRequest(design);
      setBusy(true);
      const result = await authenticatedRequest<{ request: CrochetRequest }>(requestBase, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!result?.request?.id) {
        setMessage("Your request was received, but we could not open its detail page. Check My Requests.");
        router.push("/custom-crochet/requests");
        return;
      }
      router.push(`/custom-crochet/requests/${encodeURIComponent(result.request.id)}`);
    } catch (cause) {
      if (isAuthenticationError(cause)) setSignedOut(true);
      setError(cause instanceof Error ? cause.message : "Could not submit your bouquet request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="min-h-[80vh] bg-[#FCF9F5] pb-20 text-[#4A3B32]">
      <div className="border-b border-[#EADFD8] bg-gradient-to-br from-[#F7EBE8] via-[#FCF9F5] to-[#F4E4D4] py-12 sm:py-20">
        <div className="page-container">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="text-sm text-[#6B5A50] underline underline-offset-4">← Back to the boutique</Link>
            <Link href="/custom-crochet/requests" className="rounded-full border border-[#D6C5BB] bg-white/80 px-5 py-3 text-sm font-medium transition-colors hover:bg-white">My design requests →</Link>
          </div>
          <div className="mt-12 max-w-4xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.24em] text-[#8C6D67]"><Sparkles size={16} /> The bouquet atelier</p>
            <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] sm:text-7xl">A little bouquet,<br /><span className="italic text-[#B78088]">a lot of love.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#6B5A50]">Choose your favourite crochet flowers, find the colours that feel like you, and make every finishing touch personal. Share the result with our makers for a tailored quotation.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-[#725E55]">
              <span className="rounded-full bg-white/85 px-4 py-2">01 · Choose flowers</span>
              <span className="rounded-full bg-white/85 px-4 py-2">02 · Style your bouquet</span>
              <span className="rounded-full bg-white/85 px-4 py-2">03 · Share your story</span>
            </div>
          </div>
        </div>
      </div>

      <div className="page-container mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,.82fr)]">
        <form onSubmit={(event) => void submit(event)} className="space-y-7">
          <div className={panel}>
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F7EBE8] text-[#9E6C72]"><Flower2 size={22} /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#957D73]">Step 01</p>
                <h2 className="mt-1 font-serif text-3xl">Gather your flowers</h2>
                <p className="mt-2 text-sm leading-6 text-[#77675E]">Pick up to {MAX_STEMS} stems. These are concept choices; our maker confirms what can be created.</p>
              </div>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {flowerOptions.map((flower) => (
                <div key={flower.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#EADFD8] bg-[#FCF9F5] p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{flower.name}</p>
                    <p className="mt-1 text-xs text-[#8A7B72]">{flower.caption}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => changeFlower(flower.id, -1)} disabled={design.flowers[flower.id] === 0} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCCDC4] bg-white disabled:opacity-35" aria-label={`Remove one ${flower.name}`}><Minus size={15} /></button>
                    <output className="min-w-5 text-center text-sm font-semibold" aria-label={`${flower.name} count`}>{design.flowers[flower.id]}</output>
                    <button type="button" onClick={() => changeFlower(flower.id, 1)} disabled={count >= MAX_STEMS} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCCDC4] bg-white disabled:opacity-35" aria-label={`Add one ${flower.name}`}><Plus size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-[#766258]"><span>{count} of {MAX_STEMS} stems selected</span><span>{count ? "A lovely start!" : "Choose at least one stem"}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F1E4DC]"><div className="h-full rounded-full bg-[#C48E94] transition-[width] duration-300" style={{ width: `${(count / MAX_STEMS) * 100}%` }} /></div>
          </div>

          <div className={panel}>
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F7EBE8] text-[#9E6C72]"><Heart size={22} /></span>
              <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#957D73]">Step 02</p><h2 className="mt-1 font-serif text-3xl">Add your personal style</h2><p className="mt-2 text-sm leading-6 text-[#77675E]">Colour stories, wrapping paper and ribbon details.</p></div>
            </div>
            <fieldset className="mt-8">
              <legend className="text-sm font-semibold">Flower colour palette</legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {palettes.map((palette) => (
                  <button key={palette.id} type="button" aria-pressed={design.palette.id === palette.id} onClick={() => setDetail("palette", palette)} className={`rounded-2xl border p-3 text-left transition-colors ${design.palette.id === palette.id ? "border-[#4A3B32] bg-[#FBF4EF] ring-1 ring-[#4A3B32]" : "border-[#EADFD8] bg-[#FCF9F5] hover:border-[#B8A59A]"}`}>
                    <span className="flex -space-x-2">{palette.colors.map((color) => <span key={color} className="h-8 w-8 rounded-full border-2 border-white" style={{ backgroundColor: color }} />)}</span>
                    <span className="mt-2 block text-xs font-medium">{palette.name}</span>
                    {design.palette.id === palette.id && <span className="mt-1 flex items-center gap-1 text-[11px] text-[#7B5860]"><Check size={12} /> Selected</span>}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-8">
              <legend className="text-sm font-semibold">Wrapping paper</legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {wraps.map((wrap) => (
                  <button key={wrap.id} type="button" onClick={() => setDetail("wrap", wrap)} aria-pressed={design.wrap.id === wrap.id} className={`rounded-2xl border p-3 text-left transition-colors ${design.wrap.id === wrap.id ? "border-[#4A3B32] ring-1 ring-[#4A3B32]" : "border-[#EADFD8] hover:border-[#B8A59A]"}`}>
                    <span className="block h-10 w-full rounded-lg border border-black/5" style={{ backgroundColor: wrap.color }} />
                    <span className="mt-2 block text-xs font-medium">{wrap.name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-8">
              <legend className="text-sm font-semibold">Ribbon finish</legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {ribbons.map((ribbon) => (
                  <button key={ribbon.id} type="button" onClick={() => setDetail("ribbon", ribbon)} aria-pressed={design.ribbon.id === ribbon.id} className={`inline-flex items-center gap-3 rounded-full border px-4 py-3 text-xs font-medium ${design.ribbon.id === ribbon.id ? "border-[#4A3B32] bg-[#F7EBE8]" : "border-[#EADFD8] bg-white"}`}>
                    <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: ribbon.color }} />{ribbon.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className={panel}>
            <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F7EBE8] text-[#9E6C72]"><Gift size={22} /></span><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#957D73]">Step 03</p><h2 className="mt-1 font-serif text-3xl">Make it meaningful</h2><p className="mt-2 text-sm leading-6 text-[#77675E]">Tell us who this is for and any details you would love to include.</p></div></div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium">Occasion
                <select value={design.occasion} onChange={(event) => setDetail("occasion", event.target.value)} className={field}>
                  {occasions.map((occasion) => <option key={occasion} value={occasion}>{occasion}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Preferred delivery date
                <input type="date" min={tomorrowUtc()} value={design.targetDate} onChange={(event) => setDetail("targetDate", event.target.value)} className={field} />
                <span className="mt-1 block text-xs font-normal text-[#87766D]">A preference, not a delivery promise</span>
              </label>
            </div>
            <label className="mt-5 block text-sm font-medium">Message for the gift card
              <textarea rows={3} maxLength={300} value={design.cardMessage} onChange={(event) => setDetail("cardMessage", event.target.value)} placeholder="For all the little moments that mean the world…" className={field} />
              <span className="mt-1 block text-right text-xs font-normal text-[#87766D]">{design.cardMessage.length}/300</span>
            </label>
            <label className="mt-5 block text-sm font-medium">Anything else our maker should know?
              <textarea rows={4} maxLength={1000} value={design.specialNotes} onChange={(event) => setDetail("specialNotes", event.target.value)} placeholder="Your inspiration, preferred arrangement, materials or special requests…" className={field} />
              <span className="mt-1 block text-right text-xs font-normal text-[#87766D]">{design.specialNotes.length}/1000</span>
            </label>
            <div className="mt-6 rounded-2xl bg-[#FCF9F5] p-5">
              <p className="text-sm font-semibold">Your budget, if you have one</p>
              <p className="mt-1 text-xs leading-5 text-[#77675E]">Our makers will send a personalised AED quote. These fields are your preferred budget, not a calculated product price.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-medium">From (AED)<input type="number" min="0" max="1000000" step="0.01" inputMode="decimal" placeholder="Optional" value={design.budgetMin} onChange={(event) => setDetail("budgetMin", event.target.value)} className={field} /></label>
                <label className="block text-xs font-medium">Up to (AED)<input type="number" min="0" max="1000000" step="0.01" inputMode="decimal" placeholder="Optional" value={design.budgetMax} onChange={(event) => setDetail("budgetMax", event.target.value)} className={field} /></label>
              </div>
            </div>
          </div>

          <div className={`${panel} bg-[#F7EBE8]`}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-[#866B66]"><Check size={16} /> Ready to share your concept?</p>
            <h2 className="mt-3 font-serif text-3xl">Let us bring it to life.</h2>
            <p className="mt-3 text-sm leading-7 text-[#6B5A50]">Sending this brief creates a custom crochet request for our team to review. It does not add an item to your cart, reserve materials, charge a card or place an order. Availability and price are confirmed through a quotation.</p>
            {checking && <p role="status" className="mt-5 text-sm">Checking your account…</p>}
            {signedOut && <div className="mt-5 rounded-2xl bg-white p-4 text-sm"><p>Sign in before sending your design. You can still explore the builder here.</p><Link href="/login" className="mt-3 inline-flex font-semibold underline underline-offset-4">Sign in to continue →</Link></div>}
            {authError && <p role="alert" className="mt-5 text-sm text-red-700">{authError}</p>}
            {error && <p role="alert" className="mt-5 rounded-2xl bg-white p-4 text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="mt-5 text-sm">{message}</p>}
            <button type="submit" disabled={busy || checking || signedOut || Boolean(authError) || count === 0} className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#4A3B32] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45">
              {busy ? "Sharing your bouquet concept…" : "Request my personalised quote"}<ArrowRight size={18} />
            </button>
            <p className="mt-3 text-center text-xs text-[#836F67]">No payment is taken. Your maker will review this design.</p>
          </div>
        </form>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <BouquetPreview design={design} />
          <div className="rounded-[2rem] border border-[#EADFD8] bg-white p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#937C71]">Your bouquet notes</p>
            <h2 className="mt-2 font-serif text-2xl">A gift made of little details</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt className="text-xs font-semibold uppercase tracking-[.12em] text-[#94827A]">Flowers</dt><dd className="mt-1 leading-6">{flowerDescription || "None selected yet"}</dd></div>
              <div className="border-t border-[#EFE5DE] pt-4"><dt className="text-xs font-semibold uppercase tracking-[.12em] text-[#94827A]">Colours</dt><dd className="mt-1">{design.palette.name}</dd></div>
              <div className="border-t border-[#EFE5DE] pt-4"><dt className="text-xs font-semibold uppercase tracking-[.12em] text-[#94827A]">Finishing touches</dt><dd className="mt-1">{design.wrap.name} wrap · {design.ribbon.name} ribbon</dd></div>
              <div className="border-t border-[#EFE5DE] pt-4"><dt className="text-xs font-semibold uppercase tracking-[.12em] text-[#94827A]">Occasion</dt><dd className="mt-1">{design.occasion}</dd></div>
            </dl>
            <div className="mt-6 rounded-2xl bg-[#FCF9F5] p-4 text-xs leading-6 text-[#79685E]">Final pricing, availability, dimensions and production time will be confirmed by our team. The preview is a design illustration.</div>
          </div>
          <Link href="/custom-crochet" className="block rounded-2xl border border-[#EADFD8] bg-[#F7EBE8] p-5 text-sm leading-6">Have a different crochet idea? <span className="font-semibold underline underline-offset-4">Visit our custom crochet studio →</span></Link>
        </aside>
      </div>
    </section>
  );
}
