"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft, BadgePercent, BarChart3, BellRing, CheckCircle2, Download,
  FileSpreadsheet, LogOut, RefreshCw, Search, ShieldCheck, UsersRound,
} from "lucide-react";
import Logo from "@/components/Logo";
import { GateScreen, Pages, Note, Issue, btn, mainBtn, panel, field, useEngagementAdmin } from "@/components/admin/EngagementCommon";
import { signOut } from "@/lib/session";
import {
  aed, display, uaeDate, createCoupon, updateCoupon, getCoupon, listCoupons,
  listSubscribers, unsubscribe, overview, ordersReport, productsReport, couponsReport,
  exportCsv,
  type Coupon, type CouponInput, type CouponType, type Subscriber, type Pagination,
  type Overview, type OrdersReport, type ProductsReport, type CouponsReport, type DateQuery,
} from "@/lib/adminMarketing";

export type MarketingSection = "analytics" | "coupons" | "marketing" | "reports";
const views: Array<{ section: MarketingSection; label: string; href: string }> = [
  { section: "analytics", label: "Sales analytics", href: "/admin/analytics" },
  { section: "coupons", label: "Coupons", href: "/admin/coupons" },
  { section: "marketing", label: "Newsletter", href: "/admin/marketing" },
  { section: "reports", label: "Reports & CSV", href: "/admin/reports" },
];
const headings: Record<MarketingSection, { eyebrow: string; title: string; detail: string }> = {
  analytics: {
    eyebrow: "Operations · Business performance", title: "Studio sales insights",
    detail: "Verified paid-order GMV and operational counts, calculated from live database records in UAE time. This is not net revenue.",
  },
  coupons: {
    eyebrow: "Marketing · Discounts", title: "Thoughtful promotions",
    detail: "Manage real coupons with limits, activation controls, date windows and recorded redemptions. Coupon changes are audited by the backend.",
  },
  marketing: {
    eyebrow: "Customer relationships · Consent", title: "Newsletter community",
    detail: "View actual subscriber consent and status. Administrators can unsubscribe, never force opt-in or send bulk email from this workspace.",
  },
  reports: {
    eyebrow: "Analytics · Downloadable records", title: "Business reporting",
    detail: "Orders, paid-product performance and coupon-redemption reports. Downloads contain the currently loaded rows only, not full-history exports.",
  },
};
const mini = "text-[11px] font-semibold uppercase tracking-[.13em] text-[#927C70]";
const errorText = (error: unknown) => error instanceof Error ? error.message : "Unable to complete this request.";
const emptyPage: Pagination = { page: 1, limit: 20, total: 0, totalPages: 0 };

function Card({ title, value, note, icon: Icon }: { title: string; value: string | number; note: string; icon: typeof BarChart3 }) {
  return <article className={panel}>
    <div className="flex items-center justify-between gap-3"><p className={mini}>{title}</p><Icon size={21} className="text-[#947E71]" /></div>
    <p className="mt-5 font-serif text-3xl">{value}</p>
    <p className="mt-3 text-xs leading-6 text-[#826F63]">{note}</p>
  </article>;
}
function DateRange({ from, to, onFrom, onTo, onApply, busy }: {
  from: string; to: string; onFrom: (value: string) => void; onTo: (value: string) => void;
  onApply: (event: FormEvent<HTMLFormElement>) => void; busy: boolean;
}) {
  return <form className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={onApply}>
    <label className="text-xs font-semibold">From (UAE date)<input className={field} type="date" value={from} onChange={event => onFrom(event.target.value)} /></label>
    <label className="text-xs font-semibold">To (UAE date)<input className={field} type="date" value={to} onChange={event => onTo(event.target.value)} /></label>
    <button type="submit" className={mainBtn} disabled={busy}><RefreshCw size={16} /> Apply range</button>
  </form>;
}
function useDateInputs() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<DateQuery>({});
  const [dateIssue, setDateIssue] = useState("");
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (from && to && from > to) { setDateIssue("The start date must be on or before the end date."); return; }
    if (from && to) {
      const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
      if (!Number.isFinite(days) || days < 0 || days > 365) { setDateIssue("Choose up to 366 days, inclusive."); return; }
    }
    setDateIssue(""); setApplied({ ...(from ? { from } : {}), ...(to ? { to } : {}) });
  }
  return { from, to, setFrom, setTo, applied, dateIssue, apply };
}
function MarketingHeader({ section, children }: { section: MarketingSection; children: ReactNode }) {
  const meta = headings[section];
  return <div className="min-h-screen bg-[#FCF9F5] text-[#4A3B32]">
    <header className="border-b border-[#EADFD8] bg-white"><div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-9">
      <Link href="/admin" className="flex items-center gap-3"><Logo size={54} /><span><span className="block text-[10px] font-bold uppercase tracking-[.19em] text-[#947E71]">LOOP_N_LOOOM · Private studio</span><span className="mt-1 block font-serif text-xl">Marketing & performance</span></span></Link>
      <Link href="/admin" className={btn}><ArrowLeft size={16} /> Dashboard</Link>
    </div></header>
    <main className="mx-auto max-w-[1480px] space-y-7 px-5 pb-24 pt-9 sm:px-9">
      <section className="rounded-[1.8rem] border border-[#EADFD8] bg-[#F7EBE8] px-6 py-8 sm:px-10">
        <p className={mini}>{meta.eyebrow}</p><h1 className="mt-3 font-serif text-3xl sm:text-5xl">{meta.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#6B5A50]">{meta.detail}</p>
      </section>
      <nav aria-label="Marketing sections" className="flex flex-wrap gap-2">{views.map(view => <Link key={view.section} href={view.href} aria-current={view.section === section ? "page" : undefined}
        className={`inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-medium ${view.section === section ? "border-[#4A3B32] bg-[#4A3B32] text-white" : "border-[#EADFD8] bg-white text-[#4A3B32] hover:bg-[#F7EBE8]"}`}>{view.label}</Link>)}</nav>
      {children}
    </main>
  </div>;
}

function AnalyticsView({ gate, guard }: { gate: string; guard: (error: unknown) => boolean }) {
  const dates = useDateInputs();
  const [data, setData] = useState<Overview | null>(null);
  const [products, setProducts] = useState<ProductsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (gate !== "ready") return;
    let live = true;
    async function load() {
      setLoading(true); setIssue("");
      try {
        const [results, top] = await Promise.all([overview(dates.applied), productsReport(dates.applied)]);
        if (live) { setData(results); setProducts(top); }
      } catch (error) {
        if (live && !guard(error)) setIssue(errorText(error));
      } finally { if (live) setLoading(false); }
    }
    void load(); return () => { live = false; };
    // Admin permissions are also checked by each backend endpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, dates.applied, revision]);
  return <div className="space-y-7">
    <section className={panel}><h2 className="font-serif text-2xl">Reporting period</h2><p className="mt-2 mb-5 text-sm text-[#826F63]">Blank dates use the server default: the last 30 calendar days in Asia/Dubai.</p>
      <DateRange from={dates.from} to={dates.to} onFrom={dates.setFrom} onTo={dates.setTo} onApply={dates.apply} busy={loading} />
      <Issue value={dates.dateIssue} />
    </section>
    <Issue value={issue} />{loading && <p role="status" className="text-sm text-[#826F63]">Loading verified statistics…</p>}
    {data && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card title="Paid orders" value={data.orders.paidOrderCount} note="Paid orders in the period, excluding currently refunded or cancelled orders." icon={BarChart3} />
      <Card title="Paid-order GMV" value={aed(data.orders.paidOrderGMV)} note="Gross paid-order value. Not profit or recognized net revenue." icon={BarChart3} />
      <Card title="Average paid order" value={aed(data.orders.averagePaidOrderValue)} note="Average paid-order value; period basis is payment date." icon={BarChart3} />
      <Card title="New customers" value={data.customers.newInPeriod} note={`${data.customers.total} registered customers overall.`} icon={UsersRound} />
      <Card title="Active subscribers" value={data.newsletter.activeSubscribers} note="Current opt-in subscriber records." icon={BellRing} />
      <Card title="Active coupons" value={data.marketing.activeCoupons} note="Coupons enabled for redemption, subject to their rules." icon={BadgePercent} />
    </div>
    <section className={panel}><h2 className="font-serif text-2xl">Orders by status</h2><p className="mt-2 text-sm text-[#826F63]">Orders placed in the selected period, including unpaid orders. Period: {data.period.from} – {data.period.to} · {data.period.timezone}</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">{data.orders.statusDistribution.length === 0 ? <Note>No orders in this period.</Note> : data.orders.statusDistribution.map(row => {
        const maximum = Math.max(1, ...data.orders.statusDistribution.map(entry => entry.count));
        return <div key={row.status}><div className="mb-2 flex justify-between text-sm"><span>{display(row.status)}</span><span>{row.count}</span></div><div className="h-2.5 rounded-full bg-[#F3E9E3]"><div className="h-full rounded-full bg-[#B89B8D]" style={{ width: `${Math.min(100, 100 * row.count / maximum)}%` }} /></div></div>;
      })}</div><p className="mt-6 text-xs text-[#826F63]">{data.orders.note}</p>
    </section></>}
    <section className={panel}><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-serif text-2xl">Top purchased products</h2><p className="mt-2 text-xs text-[#826F63]">Top 20 by paid-order item value. Historical order values, not live product pricing.</p></div><button className={btn} type="button" disabled={loading} onClick={() => setRevision(v => v + 1)}><RefreshCw size={15} /> Refresh</button></div>
      {products && (products.products.length === 0 ? <div className="mt-5"><Note>No paid-product data in this period.</Note></div> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="text-xs text-[#826F63]"><tr><th className="py-3">Product</th><th>Units</th><th className="text-right">Item value</th></tr></thead><tbody>{products.products.map(row => <tr key={row.productId || "unknown"} className="border-t border-[#EFE4DE]"><td className="py-3">{row.product?.nameEn ?? "Historical product"}</td><td>{row.unitsSold}</td><td className="text-right">{aed(row.itemValue)}</td></tr>)}</tbody></table></div>)}
    </section>
  </div>;
}

const emptyCoupon: CouponInput = {
  code: "", description: null, type: "PERCENTAGE", discountValue: 10,
  minimumOrderAmount: null, maximumDiscountAmount: null,
  usageLimit: null, usageLimitPerUser: null, startsAt: null, endsAt: null, isActive: false,
};
function CouponView({ gate, guard }: { gate: string; guard: (error: unknown) => boolean }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPage);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponInput>({ ...emptyCoupon });
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [issue, setIssue] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (gate !== "ready") return;
    let live = true;
    async function load() {
      setBusy(true); setIssue("");
      try {
        const result = await listCoupons({ page, search, active });
        if (live) { setCoupons(result.coupons); setPagination(result.pagination); }
      } catch (error) { if (live && !guard(error)) setIssue(errorText(error)); }
      finally { if (live) setBusy(false); }
    }
    void load(); return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, page, search, active, revision]);
  function edit(coupon: Coupon) {
    setEditingId(coupon.id); setIssue(""); setNotice("");
    setForm({
      code: coupon.code, description: coupon.description, type: coupon.type,
      discountValue: Number(coupon.discountValue),
      minimumOrderAmount: coupon.minimumOrderAmount === null ? null : Number(coupon.minimumOrderAmount),
      maximumDiscountAmount: coupon.maximumDiscountAmount === null ? null : Number(coupon.maximumDiscountAmount),
      usageLimit: coupon.usageLimit, usageLimitPerUser: coupon.usageLimitPerUser,
      startsAt: coupon.startsAt, endsAt: coupon.endsAt, isActive: coupon.isActive,
    });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) { setIssue("Code must contain 3–40 uppercase letters, digits, hyphens or underscores."); return; }
    if (!Number.isFinite(form.discountValue) || form.discountValue <= 0 || (form.type === "PERCENTAGE" && form.discountValue > 100)) { setIssue("Enter a valid positive discount (at most 100% for percentages)."); return; }
    if (form.startsAt && form.endsAt && Date.parse(form.endsAt) <= Date.parse(form.startsAt)) { setIssue("End date must follow start date."); return; }
    if (form.isActive && !window.confirm("Activate this coupon? Customers may be able to redeem it immediately, subject to its rules.")) return;
    setBusy(true); setIssue(""); setNotice("");
    try {
      const payload = { ...form, code, description: form.description?.trim() || null };
      const saved = editingId ? await updateCoupon(editingId, payload) : await createCoupon(payload);
      setEditingId(saved.id); setNotice(`Coupon ${saved.code} saved. All changes are audited by the backend.`);
      setRevision(v => v + 1);
    } catch (error) { if (!guard(error)) setIssue(errorText(error)); }
    finally { setBusy(false); }
  }
  async function loadCurrent() {
    if (!editingId || busy) return;
    setBusy(true); setIssue("");
    try { const current = await getCoupon(editingId); edit(current); setNotice("Latest saved coupon loaded."); }
    catch (error) { if (!guard(error)) setIssue(errorText(error)); }
    finally { setBusy(false); }
  }
  const num = (value: string) => value.trim() ? Number(value) : null;
  const put = <K extends keyof CouponInput>(key: K, value: CouponInput[K]) => setForm(old => ({ ...old, [key]: value }));
  return <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <section className={`${panel} h-fit`}><h2 className="font-serif text-2xl">Coupon directory</h2><form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setSearch(searchDraft.trim()); setPage(1); }}>
      <label className="min-w-[190px] flex-1 text-xs font-semibold">Find by code or description<input className={field} maxLength={120} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} /></label>
      <label className="text-xs font-semibold">Status<select className={field} value={active} onChange={event => { setActive(event.target.value); setPage(1); }}><option value="">All</option><option value="true">Active</option><option value="false">Inactive</option></select></label>
      <button className={btn} type="submit" disabled={busy}><Search size={16} /> Search</button>
    </form><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#826F63]">{pagination.total} coupon(s) found</p><button type="button" className={btn} disabled={busy} onClick={() => { setForm({ ...emptyCoupon }); setEditingId(null); setIssue(""); setNotice(""); }}>New coupon</button></div>
      {busy && <p role="status" className="mt-4 text-sm">Loading or saving…</p>}
      <div className="mt-5 divide-y divide-[#EADFD8]">{coupons.map(coupon => <button key={coupon.id} type="button" disabled={busy} onClick={() => edit(coupon)} className={`w-full py-4 text-left hover:bg-[#FCF9F5] ${editingId === coupon.id ? "bg-[#F7EBE8]" : ""}`}>
        <span className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold tracking-wide">{coupon.code}</span><span className="text-xs text-[#866C5D]">{coupon.isActive ? "Active" : "Inactive"}</span></span>
        <span className="mt-2 block text-sm text-[#7A675D]">{coupon.type === "PERCENTAGE" ? `${coupon.discountValue}%` : aed(coupon.discountValue)} · {coupon._count.redemptions} redemption(s)</span>
      </button>)}</div>
      {!busy && coupons.length === 0 && <Note>No coupons match this filter.</Note>}
      <Pages {...pagination} onChange={setPage} disabled={busy} />
    </section>
    <section className={`${panel} h-fit`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-2xl">{editingId ? "Edit coupon" : "Create coupon"}</h2>{editingId && <button type="button" className={btn} onClick={() => void loadCurrent()} disabled={busy}><RefreshCw size={15} /> Reload</button>}</div>
      <div className="mt-5"><Issue value={issue} />{notice && <p role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-[#E8F1E8] p-4 text-sm text-[#496E50]"><CheckCircle2 size={17} /> {notice}</p>}</div>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={event => void save(event)}>
        <label className="text-xs font-semibold">Code *<input required className={field} maxLength={40} value={form.code} onChange={event => put("code", event.target.value.toUpperCase())} placeholder="WELCOME10" /></label>
        <label className="text-xs font-semibold">Discount type<select className={field} value={form.type} onChange={event => put("type", event.target.value as CouponType)}><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed AED</option></select></label>
        <label className="text-xs font-semibold">Discount value *<input required className={field} type="number" min="0.01" max={form.type === "PERCENTAGE" ? "100" : "1000000"} step="0.01" value={form.discountValue} onChange={event => put("discountValue", Number(event.target.value))} /></label>
        <label className="text-xs font-semibold">Minimum order (AED)<input className={field} type="number" min="0" max="1000000" step="0.01" value={form.minimumOrderAmount ?? ""} onChange={event => put("minimumOrderAmount", num(event.target.value))} /></label>
        <label className="text-xs font-semibold">Maximum discount (AED)<input className={field} type="number" min="0" max="1000000" step="0.01" value={form.maximumDiscountAmount ?? ""} onChange={event => put("maximumDiscountAmount", num(event.target.value))} /></label>
        <label className="text-xs font-semibold">Total use limit<input className={field} type="number" min="1" max="1000000" step="1" value={form.usageLimit ?? ""} onChange={event => put("usageLimit", num(event.target.value))} /></label>
        <label className="text-xs font-semibold">Per-customer use limit<input className={field} type="number" min="1" max="1000000" step="1" value={form.usageLimitPerUser ?? ""} onChange={event => put("usageLimitPerUser", num(event.target.value))} /></label>
        <label className="text-xs font-semibold">Start (UAE date)<input className={field} type="date" value={form.startsAt?.slice(0, 10) ?? ""} onChange={event => put("startsAt", event.target.value ? `${event.target.value}T00:00:00+04:00` : null)} /></label>
        <label className="text-xs font-semibold">End (UAE date)<input className={field} type="date" value={form.endsAt?.slice(0, 10) ?? ""} onChange={event => put("endsAt", event.target.value ? `${event.target.value}T23:59:59+04:00` : null)} /></label>
        <label className="text-xs font-semibold sm:col-span-2">Description<textarea className={`${field} min-h-20`} maxLength={500} value={form.description ?? ""} onChange={event => put("description", event.target.value || null)} /></label>
        <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-[#4A3B32]" checked={form.isActive} onChange={event => put("isActive", event.target.checked)} />Coupon enabled for redemption</label>
        <p className="text-xs leading-6 text-[#826F63] sm:col-span-2">New coupons start inactive. Limits, date windows, uniqueness and redemption constraints are validated by the backend. Updates are recorded in the audit log.</p>
        <button type="submit" className={`${mainBtn} sm:col-span-2`} disabled={busy}><BadgePercent size={17} /> {editingId ? "Save coupon changes" : "Create coupon"}</button>
      </form>
    </section>
  </div>;
}

function NewsletterView({ gate, guard }: { gate: string; guard: (error: unknown) => boolean }) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPage);
  const [page, setPage] = useState(1);
  const [active, setActive] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [issue, setIssue] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (gate !== "ready") return;
    let live = true;
    async function load() {
      setBusy(true); setIssue("");
      try { const result = await listSubscribers({ page, active, search }); if (live) { setSubscribers(result.subscribers); setPagination(result.pagination); } }
      catch (error) { if (live && !guard(error)) setIssue(errorText(error)); }
      finally { if (live) setBusy(false); }
    }
    void load(); return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, page, active, search, revision]);
  async function remove(subscriber: Subscriber) {
    if (!subscriber.isActive || busy) return;
    const check = window.prompt(`Unsubscribe ${subscriber.email}? This prevents future newsletter sends.\nType the subscriber email to confirm:`);
    if (check !== subscriber.email) { setIssue("Email confirmation did not match. No changes made."); return; }
    setBusy(true); setIssue(""); setNotice("");
    try { await unsubscribe(subscriber.id); setRevision(v => v + 1); setNotice("Subscriber opted out by an administrator. The change is audited."); }
    catch (error) { if (!guard(error)) setIssue(errorText(error)); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6"><section className={panel}>
    <h2 className="font-serif text-2xl">Subscriber consent registry</h2><p className="mt-2 text-sm text-[#826F63]">Only existing opt-ins are listed. This feature cannot subscribe someone or send a campaign.</p>
    <form className="mt-6 grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_210px_auto]" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(draft.trim()); }}>
      <label className="text-xs font-semibold">Search subscriber email<input className={field} maxLength={120} value={draft} onChange={event => setDraft(event.target.value)} placeholder="name@example.com" /></label>
      <label className="text-xs font-semibold">Status<select className={field} value={active} onChange={event => { setPage(1); setActive(event.target.value); }}><option value="">All</option><option value="true">Subscribed</option><option value="false">Unsubscribed</option></select></label>
      <button type="submit" className={mainBtn} disabled={busy}><Search size={16} /> Search</button>
    </form><div className="mt-5"><Issue value={issue} />{notice && <p role="status" className="rounded-xl bg-[#E8F1E8] p-4 text-sm text-[#496E50]">{notice}</p>}</div>
    {busy && <p role="status" className="mt-4 text-sm">Loading subscribers…</p>}
    {!busy && subscribers.length === 0 && <div className="mt-5"><Note>No matching subscriber records.</Note></div>}
    <div className="mt-5 divide-y divide-[#EADFD8]">{subscribers.map(subscriber => <article key={subscriber.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
      <div className="min-w-0"><p className="break-all text-sm font-semibold">{subscriber.email}</p><p className="mt-2 text-xs text-[#826F63]">{subscriber.isActive ? "Subscribed" : "Unsubscribed"} · Consent: {uaeDate(subscriber.consentAt)} · Language: {subscriber.preferredLocale || "Not supplied"}</p></div>
      {subscriber.isActive && <button type="button" className={btn} disabled={busy} onClick={() => void remove(subscriber)}>Unsubscribe</button>}
    </article>)}</div><Pages {...pagination} onChange={setPage} disabled={busy} />
  </section><Note>Subscriber privacy: no export of personal email addresses, no bulk sending, no re-subscribe action and no bypass of marketing preferences.</Note></div>;
}

function ReportsView({ gate, guard }: { gate: string; guard: (error: unknown) => boolean }) {
  const dates = useDateInputs();
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrdersReport | null>(null);
  const [products, setProducts] = useState<ProductsReport | null>(null);
  const [coupons, setCoupons] = useState<CouponsReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");
  useEffect(() => {
    if (gate !== "ready") return;
    let live = true;
    async function load() {
      setBusy(true); setIssue("");
      try {
        const [ordersResult, productResult, couponResult] = await Promise.all([
          ordersReport({ ...dates.applied, page }), productsReport(dates.applied), couponsReport(dates.applied),
        ]);
        if (live) { setOrders(ordersResult); setProducts(productResult); setCoupons(couponResult); }
      } catch (error) { if (live && !guard(error)) setIssue(errorText(error)); }
      finally { if (live) setBusy(false); }
    }
    void load(); return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, dates.applied, page]);
  const from = orders?.period.from ?? "";
  const to = orders?.period.to ?? "";
  return <div className="space-y-6">
    <section className={panel}><h2 className="font-serif text-2xl">Report dates</h2><p className="mt-2 mb-5 text-sm text-[#826F63]">Selected dates are inclusive and interpreted in Asia/Dubai. Maximum range: 366 days.</p>
      <DateRange from={dates.from} to={dates.to} onFrom={dates.setFrom} onTo={dates.setTo} onApply={event => { dates.apply(event); setPage(1); }} busy={busy} /><Issue value={dates.dateIssue} />
    </section><Issue value={issue} />{busy && <p role="status" className="text-sm">Loading reports…</p>}
    {orders && <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Order value report</h2><p className="mt-2 text-xs text-[#826F63]">{from} – {to} · {orders.totals.orderCount} placed orders</p></div>
        <button type="button" className={btn} disabled={busy || !orders.orders.length} onClick={() => exportCsv(`loop-orders-${from}-${to}-page-${page}.csv`, ["Order", "Status", "Currency", "Subtotal", "Discount", "Total", "Placed at", "Paid at", "Delivered at"], orders.orders.map(o => [o.orderNumber, o.status, o.currency, o.subtotal, o.discountAmount, o.totalAmount, o.placedAt, o.paidAt, o.deliveredAt]))}><Download size={17} /> CSV (current page)</button></div>
      <div className="mt-5 grid gap-3 rounded-xl bg-[#F7EBE8] p-5 sm:grid-cols-2"><div><p className={mini}>All order value (not revenue)</p><p className="mt-2 font-serif text-3xl">{aed(orders.totals.allOrderValue)}</p></div><p className="text-sm leading-6 text-[#6B5A50]">{orders.totals.note}</p></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs text-[#826F63]"><tr><th className="py-3">Order</th><th>Status</th><th>Placed (UAE)</th><th className="text-right">Total value</th></tr></thead><tbody>{orders.orders.map(o => <tr key={o.id} className="border-t border-[#EFE4DE]"><td className="py-3"><Link href={`/admin/orders/${encodeURIComponent(o.id)}`} className="font-semibold underline underline-offset-4">{o.orderNumber}</Link></td><td>{display(o.status)}</td><td>{uaeDate(o.placedAt)}</td><td className="text-right">{aed(o.totalAmount)}</td></tr>)}</tbody></table></div>
      {orders.orders.length === 0 && <Note>No orders for this period.</Note>}
      <Pages {...orders.pagination} disabled={busy} onChange={setPage} />
    </section>}
    {products && <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Paid-product performance</h2><p className="mt-2 text-xs text-[#826F63]">Top 20 products. Excludes currently refunded and cancelled orders.</p></div>
        <button type="button" className={btn} disabled={busy || !products.products.length} onClick={() => exportCsv(`loop-products-${from}-${to}-top20.csv`, ["Product", "SKU slug", "Units", "Item count", "Item value AED"], products.products.map(row => [row.product?.nameEn, row.product?.slug, row.unitsSold, row.orderItemCount, row.itemValue]))}><FileSpreadsheet size={17} /> CSV (top 20)</button></div>
      {products.products.length === 0 ? <div className="mt-5"><Note>No paid-product transactions in this period.</Note></div> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs text-[#826F63]"><tr><th className="py-3">Product</th><th>Units</th><th className="text-right">Item value</th></tr></thead><tbody>{products.products.map(row => <tr key={row.productId || "historical"} className="border-t border-[#EFE4DE]"><td className="py-3">{row.product?.nameEn ?? "Historical product"}</td><td>{row.unitsSold}</td><td className="text-right">{aed(row.itemValue)}</td></tr>)}</tbody></table></div>}
    </section>}
    {coupons && <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Coupon redemptions</h2><p className="mt-2 text-xs text-[#826F63]">Top 20 by redemption count during this period.</p></div>
        <button type="button" className={btn} disabled={busy || !coupons.coupons.length} onClick={() => exportCsv(`loop-coupons-${from}-${to}-top20.csv`, ["Coupon", "Redemptions", "Discount value AED"], coupons.coupons.map(row => [row.coupon?.code ?? row.couponId, row.redemptions, row.discountAmount]))}><Download size={17} /> CSV (top 20)</button></div>
      {coupons.coupons.length === 0 ? <div className="mt-5"><Note>No coupon redemptions in this period.</Note></div> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="text-xs text-[#826F63]"><tr><th className="py-3">Coupon</th><th>Redemptions</th><th className="text-right">Discount amount</th></tr></thead><tbody>{coupons.coupons.map(row => <tr key={row.couponId} className="border-t border-[#EFE4DE]"><td className="py-3">{row.coupon?.code ?? "Historical coupon"}</td><td>{row.redemptions}</td><td className="text-right">{aed(row.discountAmount)}</td></tr>)}</tbody></table></div>}
    </section>}
    <Note>Exports contain only the records displayed by the existing reporting APIs, not a complete financial ledger. There is no PDF generator or refund-adjusted net revenue report in this milestone.</Note>
  </div>;
}

export default function MarketingCenter({ section }: { section: MarketingSection }) {
  const auth = useEngagementAdmin();
  if (auth.gate !== "ready") return <GateScreen gate={auth.gate} error={auth.gateError} />;
  return <MarketingHeader section={section}>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-6 py-4 text-xs text-[#6B5A50]"><span className="flex items-center gap-2"><ShieldCheck size={17} /> Protected {display(auth.role)} admin session</span><button type="button" className={btn} onClick={() => { void signOut().then(() => { window.location.href = "/login"; }).catch(() => { window.location.href = "/login"; }); }}><LogOut size={15} /> Sign out</button></div>
    {section === "analytics" && <AnalyticsView gate={auth.gate} guard={auth.guard} />}
    {section === "coupons" && <CouponView gate={auth.gate} guard={auth.guard} />}
    {section === "marketing" && <NewsletterView gate={auth.gate} guard={auth.guard} />}
    {section === "reports" && <ReportsView gate={auth.gate} guard={auth.guard} />}
  </MarketingHeader>;
}
