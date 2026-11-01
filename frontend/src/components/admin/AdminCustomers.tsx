"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Search, ShieldAlert, UsersRound } from "lucide-react";
import { GateScreen, Issue, Note, Pages, WorkArea, btn, field, mainBtn, panel, useEngagementAdmin } from "@/components/admin/EngagementCommon";
import { dateAE, getCustomer, listCustomers, moneyAE, nameOf, setCustomerStatus, type Customer, type CustomerDetail, type CustomerStatus, type PageInfo } from "@/lib/adminEngagement";

export default function AdminCustomers({ customerId }: { customerId?: string }) {
  const auth = useEngagementAdmin();
  const [rows, setRows] = useState<Customer[]>([]);
  const [info, setInfo] = useState<PageInfo>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (auth.gate !== "ready") return;
    let live = true;
    const run = async () => {
      setBusy(true); setIssue("");
      try {
        if (customerId) {
          const item = await getCustomer(customerId);
          if (live) setDetail(item);
        } else {
          const result = await listCustomers({ page, status, search });
          if (live) { setRows(result.customers); setInfo(result.pagination); }
        }
      } catch (error) {
        if (!live) return;
        if (!auth.guard(error)) setIssue(error instanceof Error ? error.message : "Could not load customers.");
      } finally { if (live) setBusy(false); }
    };
    void run();
    return () => { live = false; };
    // auth.guard is stable in intent; authorization is rechecked by every protected API call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.gate, customerId, page, status, search, revision]);

  async function changeStatus(next: CustomerStatus) {
    if (!detail || busy || detail.status === next) return;
    const check = window.prompt(`Changing ${detail.email} to ${next} affects account access.\nType the customer's email to confirm:`);
    if (check !== detail.email) { setIssue("No changes made: email confirmation did not match."); return; }
    setBusy(true); setIssue(""); setNotice("");
    try {
      const updated = await setCustomerStatus(detail.id, next);
      setDetail(updated); setNotice(`Customer status updated to ${next}. Existing refresh sessions are revoked by the backend.`);
    } catch (error) {
      if (!auth.guard(error)) setIssue(error instanceof Error ? error.message : "Could not update customer status.");
    } finally { setBusy(false); }
  }
  function find(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPage(1); setSearch(searchDraft.trim()); }
  if (auth.gate !== "ready") return <GateScreen gate={auth.gate} error={auth.gateError} />;
  return <WorkArea title={customerId ? "Customer profile" : "Your customer community"} eyebrow="Customer care · Private directory" detail="Live customer records and purchase summaries. Administrative role changes and permanent deletion are not available here.">
    <Issue value={issue} />{notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#E8F2EA] p-4 text-sm text-[#557A61]"><CheckCircle2 size={18} />{notice}</p>}
    {customerId ? <>
      <Link className={btn} href="/admin/customers">← Customer directory</Link>
      {busy && !detail && <p role="status">Loading customer profile…</p>}
      {detail && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">{nameOf(detail)}</h2><p className="mt-2 break-all text-sm text-[#6B5A50]">{detail.email}</p></div><span className="rounded-full bg-[#F7EBE8] px-4 py-2 text-xs font-semibold">{detail.status}</span></div>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-[#8A7B72]">Phone</dt><dd className="mt-1 break-all">{detail.phone || "Not supplied"}</dd></div>
              <div><dt className="text-[#8A7B72]">Preferred language</dt><dd className="mt-1">{detail.preferredLocale || "Not set"}</dd></div>
              <div><dt className="text-[#8A7B72]">Email verified</dt><dd className="mt-1">{detail.emailVerifiedAt ? dateAE(detail.emailVerifiedAt) : "Not verified"}</dd></div>
              <div><dt className="text-[#8A7B72]">Last login</dt><dd className="mt-1">{dateAE(detail.lastLoginAt)}</dd></div>
              <div><dt className="text-[#8A7B72]">Member since</dt><dd className="mt-1">{dateAE(detail.createdAt)}</dd></div>
              <div><dt className="text-[#8A7B72]">Store credit balance</dt><dd className="mt-1">{moneyAE(detail.storeCreditBalance)}</dd></div>
            </dl>
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#EADFD8] pt-5 text-center"><div><p className="font-serif text-2xl">{detail._count.orders}</p><p className="text-xs text-[#8A7B72]">Orders</p></div><div><p className="font-serif text-2xl">{detail._count.reviews}</p><p className="text-xs text-[#8A7B72]">Reviews</p></div><div><p className="font-serif text-2xl">{detail._count.addresses}</p><p className="text-xs text-[#8A7B72]">Addresses</p></div></div>
          </section>
          <section className={panel}><h3 className="font-serif text-2xl">Recent orders</h3><div className="mt-5 divide-y divide-[#EADFD8]">{detail.orders.length === 0 ? <p className="text-sm text-[#8A7B72]">No recent orders.</p> : detail.orders.map(order => <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><Link href={`/admin/orders/${encodeURIComponent(order.id)}`} className="font-semibold underline underline-offset-4">{order.orderNumber}</Link><p className="mt-1 text-xs text-[#8A7B72]">{dateAE(order.placedAt)} · {order.status}</p></div><p>{moneyAE(order.totalAmount)}</p></div>)}</div></section>
          <section className={panel}><h3 className="font-serif text-2xl">Recent reviews</h3><div className="mt-5 divide-y divide-[#EADFD8]">{detail.reviews.length === 0 ? <p className="text-sm text-[#8A7B72]">No recent reviews.</p> : detail.reviews.map(review => <div key={review.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><Link className="underline underline-offset-4" href={`/admin/reviews/${encodeURIComponent(review.id)}`}>{review.product?.nameEn || "Product"}</Link><span>{review.rating}/5 · {review.status}</span></div>)}</div></section>
        </div>
        <aside className={`${panel} h-fit`}><h3 className="flex items-center gap-2 font-serif text-xl"><ShieldAlert size={21} /> Account safeguards</h3><p className="mt-3 text-sm leading-7 text-[#6B5A50]">Suspending or disabling an account prevents normal account access. This backend does not yet record an administrator audit event for customer status changes; coordinate sensitive actions with your team.</p><div className="mt-5 flex flex-col gap-3">
          {(["ACTIVE", "SUSPENDED", "DISABLED"] as const).map(next => <button key={next} className={next === detail.status ? btn : mainBtn} disabled={busy || next === detail.status} type="button" onClick={() => void changeStatus(next)}>{next === detail.status ? `Current: ${next}` : `Set ${next.toLowerCase()}`}</button>)}
        </div><p className="mt-4 text-xs leading-6 text-[#8A7B72]">No account deletion, role escalation, credential access or mass changes are provided.</p></aside>
      </div>}
    </> : <section className={panel}>
      <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end" onSubmit={find}>
        <label className="text-xs font-semibold">Search email, name or phone<input aria-label="Search customers" className={field} maxLength={120} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Find a customer" /></label>
        <label className="text-xs font-semibold">Account status<select className={field} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DISABLED">Disabled</option></select></label>
        <button type="submit" className={mainBtn}><Search size={16} /> Search</button>
      </form>
      {busy && <p role="status" className="mt-5 text-sm text-[#6B5A50]">Loading customers…</p>}
      {!busy && rows.length === 0 && <div className="mt-6"><Note>No customer records match the current search.</Note></div>}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{rows.map(item => <Link className="rounded-2xl border border-[#EADFD8] p-5 transition-colors hover:bg-[#F7EBE8]" key={item.id} href={`/admin/customers/${encodeURIComponent(item.id)}`}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="flex items-center gap-2 font-semibold"><UsersRound size={16} />{nameOf(item)}</p><p className="mt-2 break-all text-sm text-[#6B5A50]">{item.email}</p></div><span className="rounded-full bg-[#F7EBE8] px-3 py-1.5 text-[11px] font-semibold">{item.status}</span></div>
        <p className="mt-4 text-xs text-[#8A7B72]">{item._count.orders} orders · {item._count.reviews} reviews · Joined {dateAE(item.createdAt)}</p>
      </Link>)}</div><Pages {...info} disabled={busy} onChange={setPage} />
    </section>}
  </WorkArea>;
}
