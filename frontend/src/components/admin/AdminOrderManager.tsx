"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Camera, CheckCircle2, ClipboardList, ExternalLink,
  LogOut, PackageCheck, RefreshCw, Search, ShieldCheck, Truck, XCircle,
} from "lucide-react";

import Logo from "@/components/Logo";
import { ApiError } from "@/lib/api";
import { assertAdminAccess } from "@/lib/adminDashboard";
import { signOut } from "@/lib/session";
import {
  ORDER_STATUSES, NEXT_ORDER_STATUS, aed, addQcPhoto, getOrder, listOrders,
  removeQcPhoto, statusLabel, uaeDate, updateOrderStatus, updateShipment,
  type AdminOrderDetail, type AdminOrdersPage,
} from "@/lib/adminOrders";

const panel = "rounded-[1.6rem] border border-[#EADFD8] bg-white p-5 shadow-[0_8px_30px_rgba(74,59,50,.035)] sm:p-7";
const input = "mt-2 min-h-11 w-full rounded-xl border border-[#E5D9D1] bg-[#FCF9F5] px-4 py-2 text-sm text-[#4A3B32] focus:border-[#4A3B32] focus:outline-none";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#EADFD8] bg-white px-5 text-sm font-medium hover:bg-[#F7EBE8] disabled:cursor-not-allowed disabled:opacity-50";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#4A3B32] px-6 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
type Gate = "checking" | "ready" | "sign-in" | "forbidden" | "error";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <section className={panel}><h2 className="font-serif text-2xl">{title}</h2><div className="mt-5">{children}</div></section>;
}
function Row({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex flex-wrap justify-between gap-2 border-b border-[#F1E9E4] py-2.5 text-sm last:border-0"><span className="text-[#826F63]">{label}</span><span className="max-w-full text-right font-medium text-[#4A3B32]">{value}</span></div>;
}
function StatusPill({ status }: { status: string }) {
  return <span className="inline-flex rounded-full bg-[#F7EBE8] px-3 py-1.5 text-xs font-semibold text-[#755A4E]">{statusLabel(status)}</span>;
}
const friendlyError = (error: unknown) => error instanceof Error ? error.message : "An unexpected error occurred.";
const isExternalHttps = (url: string) => {
  try { const parsed = new URL(url); return parsed.protocol === "https:"; } catch { return false; }
};
function formatAddress(order: AdminOrderDetail) {
  const address = order.shippingAddress;
  return [address.recipientName, address.building, address.apartmentOrVilla, address.street,
    address.area, address.city, statusLabel(address.emirate), address.landmark].filter(Boolean).join(" · ");
}

export default function AdminOrderManager({ orderId }: { orderId?: string }) {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("checking");
  const [gateIssue, setGateIssue] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<AdminOrdersPage | null>(null);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [issue, setIssue] = useState("");
  const [notice, setNotice] = useState("");
  const [transitionNote, setTransitionNote] = useState("");
  const [qcUrl, setQcUrl] = useState("");
  const [qcCaption, setQcCaption] = useState("");
  const [ackManuallyConfirmed, setAckManuallyConfirmed] = useState(false);
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  useEffect(() => {
    let active = true;
    async function verify() {
      try {
        const result = await assertAdminAccess();
        if (active) { setRole(result.user.role); setGate("ready"); }
      } catch (error) {
        if (!active) return;
        setGateIssue(friendlyError(error));
        setGate(error instanceof ApiError && error.status === 401 ? "sign-in" :
          error instanceof ApiError && error.status === 403 ? "forbidden" : "error");
      }
    }
    void verify();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (gate !== "ready") return;
    let active = true;
    async function load() {
      setLoading(true); setIssue("");
      try {
        if (orderId) {
          const detail = await getOrder(orderId);
          if (!active) return;
          setOrder(detail);
          setCourier(detail.shipment?.courier ?? "");
          setTrackingNumber(detail.shipment?.trackingNumber ?? "");
          setTrackingUrl(detail.shipment?.trackingUrl ?? "");
          setDeliveryDate(detail.shipment?.estimatedDeliveryAt ? detail.shipment.estimatedDeliveryAt.slice(0, 10) : "");
        } else {
          const result = await listOrders({ page, status, search });
          if (active) setList(result);
        }
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setGate(error.status === 401 ? "sign-in" : "forbidden");
          setList(null); setOrder(null);
        } else setIssue(friendlyError(error));
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [gate, orderId, page, status, search, revision]);

  function refresh() { setRevision(value => value + 1); }
  async function mutate(action: () => Promise<unknown>, success: string) {
    if (busy || !orderId) return;
    setBusy(true); setIssue(""); setNotice("");
    try {
      await action();
      const detail = await getOrder(orderId);
      setOrder(detail); setNotice(success); setTransitionNote("");
      setAckManuallyConfirmed(false);
      setCourier(detail.shipment?.courier ?? "");
      setTrackingNumber(detail.shipment?.trackingNumber ?? "");
      setTrackingUrl(detail.shipment?.trackingUrl ?? "");
      setDeliveryDate(detail.shipment?.estimatedDeliveryAt?.slice(0, 10) ?? "");
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        setGate(error.status === 401 ? "sign-in" : "forbidden"); setOrder(null);
      } else setIssue(friendlyError(error));
    } finally { setBusy(false); }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPage(1); setSearch(searchDraft.trim());
  }
  function moveToNext() {
    if (!order) return;
    const next = NEXT_ORDER_STATUS[order.status];
    if (!next) return;
    if (next === "READY_FOR_PACKING" && !ackManuallyConfirmed) {
      setIssue("Before packing, confirm the customer has reviewed the quality-check photos. This manual confirmation is not yet independently recorded in the backend.");
      return;
    }
    if (!window.confirm(`Advance ${order.orderNumber} from ${statusLabel(order.status)} to ${statusLabel(next)}? This updates the customer-visible timeline and queues notifications.`)) return;
    void mutate(() => updateOrderStatus(order.id, next, transitionNote), `Order advanced to ${statusLabel(next)}.`);
  }
  function saveShipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    if (trackingUrl.trim() && !isExternalHttps(trackingUrl.trim())) { setIssue("Tracking link must use HTTPS."); return; }
    if (deliveryDate && Number.isNaN(new Date(`${deliveryDate}T12:00:00Z`).getTime())) { setIssue("Invalid delivery date."); return; }
    const data = {
      courier: courier.trim() || null,
      trackingNumber: trackingNumber.trim() || null,
      trackingUrl: trackingUrl.trim() || null,
      estimatedDeliveryAt: deliveryDate ? `${deliveryDate}T12:00:00.000Z` : null,
    };
    void mutate(() => updateShipment(order.id, data), "Shipment details updated. No delivery-state transition was requested.");
  }
  function submitQc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    if (!isExternalHttps(qcUrl.trim())) { setIssue("Use an HTTPS image URL hosted on an approved storage service."); return; }
    if (order.status !== "QUALITY_CHECK") { setIssue("Quality-check photos can only be added during QUALITY_CHECK."); return; }
    void mutate(() => addQcPhoto(order.id, qcUrl.trim(), qcCaption), "Quality-check photo reference added. Customer can view it in their order details; automatic customer approval is not yet implemented.");
    setQcUrl(""); setQcCaption("");
  }
  async function logout() {
    try { await signOut(); router.replace("/login"); router.refresh(); }
    catch (error) { setIssue(friendlyError(error)); }
  }

  if (gate !== "ready") return <main className="flex min-h-screen items-center justify-center bg-[#FCF9F5] p-6">
    <div className={`${panel} w-full max-w-lg text-center`}>
      <ShieldCheck size={36} className="mx-auto text-[#80695D]" />
      <h1 className="mt-6 font-serif text-3xl">{gate === "checking" ? "Verifying administrator access" : gate === "sign-in" ? "Administrator sign-in" : gate === "forbidden" ? "Access restricted" : "Orders unavailable"}</h1>
      <p role="status" className="mt-5 text-sm leading-7 text-[#6B5A50]">{gate === "checking" ? "Checking your secure session…" : gate === "sign-in" ? "Sign in with an authorized administrator account." : gate === "forbidden" ? "Your account is not permitted to manage orders." : gateIssue}</p>
      <div className="mt-7 flex justify-center gap-3"><Link href="/admin" className={button}>Dashboard</Link>{gate === "sign-in" && <Link href="/login" className={primary}>Sign in</Link>}</div>
    </div>
  </main>;

  return <div className="min-h-screen bg-[#FCF9F5] text-[#4A3B32]">
    <header className="border-b border-[#EADFD8] bg-white">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-4"><Logo size={57} /><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#967E6E]">LOOP_N_LOOOM · Private studio</p><h1 className="font-serif text-xl sm:text-2xl">Orders & fulfillment</h1></div></div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-xs text-[#5E7C64] sm:block"><ShieldCheck size={15} className="inline" /> {statusLabel(role)}</span>
          <Link href="/admin" className={button}><ArrowLeft size={16} /> Dashboard</Link>
          <button type="button" onClick={refresh} disabled={busy || loading} className={button}><RefreshCw size={16} /> Refresh</button>
          <button type="button" onClick={() => void logout()} className={button}><LogOut size={16} /> Sign out</button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[1500px] space-y-7 px-5 pb-20 pt-9 sm:px-8" aria-busy={busy || loading}>
      <div className="rounded-[1.8rem] border border-[#EADFD8] bg-[#F7EBE8] px-6 py-8 sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[.21em] text-[#947E71]">Thoughtful gifts · Seamless fulfillment</p>
        <h2 className="mt-2 font-serif text-3xl sm:text-4xl">{orderId ? order?.orderNumber ?? "Order details" : "Orders at a glance"}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6B5A50]">Manage real orders using the protected admin API. Payment and refund statuses are read-only; only server-approved fulfillment transitions can be requested.</p>
      </div>
      {issue && <div role="alert" className="flex gap-3 rounded-2xl border border-[#EDD1CB] bg-[#FFF6F2] p-4 text-sm text-[#944B45]"><XCircle size={19} className="shrink-0" />{issue}</div>}
      {notice && <div role="status" className="flex gap-3 rounded-2xl border border-[#CEE3D1] bg-[#EFF7EF] p-4 text-sm text-[#44734C]"><CheckCircle2 size={19} className="shrink-0" />{notice}</div>}
      {loading && <p role="status" className="text-sm text-[#806F63]">Loading live order data…</p>}

      {!orderId && <>
        <section className={panel}>
          <form onSubmit={submitSearch} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-end">
            <label className="block text-xs font-semibold text-[#6B5A50]">Search order, customer, email or phone
              <div className="relative"><Search size={17} className="absolute left-3 top-[21px] text-[#967E71]" /><input className={`${input} pl-10`} value={searchDraft} maxLength={200} onChange={e => setSearchDraft(e.target.value)} placeholder="LNL-2026…" /></div>
            </label>
            <label className="block text-xs font-semibold text-[#6B5A50]">Order status
              <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className={input}><option value="">All statuses</option>{ORDER_STATUSES.map(item => <option value={item} key={item}>{statusLabel(item)}</option>)}</select>
            </label>
            <button className={primary} type="submit"><Search size={16} /> Search</button>
          </form>
          {list && <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#806F63]"><span>{list.pagination.total} orders · page {list.pagination.page} of {Math.max(1, list.pagination.totalPages)}</span><span>All dates in UAE time · prices AED</span></div>}
        </section>
        {list && !loading && (list.orders.length === 0 ? <div className={panel}><p className="text-sm text-[#826F63]">No matching orders found.</p></div> : <div className="grid gap-4">
          {list.orders.map(item => <article className={`${panel} flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between`} key={item.id}>
            <div className="min-w-0 space-y-2"><p className="text-xs uppercase tracking-[.14em] text-[#89766A]">{uaeDate(item.placedAt)} · {item.itemCount} item(s)</p>
              <h3 className="font-serif text-2xl">{item.orderNumber}</h3>
              <p className="break-words text-sm text-[#6B5A50]">{item.customer.name || item.customer.email} · {item.destination.city}, {statusLabel(item.destination.emirate)}</p>
              <p className="text-xs text-[#8A7B72]">{item.shipment?.courier ? `Courier: ${item.shipment.courier}` : "Awaiting courier details"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 lg:justify-end"><div className="space-y-2 lg:text-right"><StatusPill status={item.status} /><p className="font-semibold">{aed(item.amounts.totalAmount)}</p></div>
              <Link href={`/admin/orders/${encodeURIComponent(item.id)}`} className={primary}>Manage order <ArrowRight size={16} /></Link>
            </div>
          </article>)}
        </div>)}
        {list && list.pagination.totalPages > 1 && <nav aria-label="Order pagination" className="flex items-center justify-center gap-4 text-sm">
          <button type="button" className={button} disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} / {list.pagination.totalPages}</span>
          <button type="button" className={button} disabled={page >= list.pagination.totalPages || loading} onClick={() => setPage(p => p + 1)}>Next</button>
        </nav>}
      </>}

      {orderId && order && <>
        <Link href="/admin/orders" className="inline-flex items-center gap-2 text-sm font-medium text-[#6B5A50] hover:underline"><ArrowLeft size={16} /> All orders</Link>
        <div className="flex flex-wrap items-center justify-between gap-4"><StatusPill status={order.status} /><p className="text-xs text-[#8A7B72]">Placed {uaeDate(order.placedAt)} · {aed(order.amounts.totalAmount)}</p></div>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,1fr)]">
          <div className="min-w-0 space-y-6">
            <Block title="Handmade order items"><div className="divide-y divide-[#F1E9E4]">
              {order.items.map(item => <div className="flex flex-wrap items-start justify-between gap-4 py-4 first:pt-0 last:pb-0" key={item.id}><div className="min-w-0"><p className="font-semibold">{item.productName}</p><p className="mt-1 text-xs text-[#826F63]">{item.variantName || item.itemType} · Qty {item.quantity} {item.sku ? `· SKU ${item.sku}` : ""}</p>
                <p className="mt-1 text-xs text-[#826F63]">{statusLabel(item.fulfillmentType)}{item.productionMaxDays !== null ? ` · up to ${item.productionMaxDays} production days` : ""}</p>
                {item.customization !== null && item.customization !== undefined && <details className="mt-2 text-xs"><summary className="cursor-pointer underline">Customization details</summary><pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-[#FCF9F5] p-3">{JSON.stringify(item.customization, null, 2)}</pre></details>}
              </div><p className="font-medium">{aed(item.subtotal)}</p></div>)}
            </div></Block>
            <Block title="Production & order timeline">
              <ol className="space-y-3">{order.statusHistory.map(history => <li className="flex gap-3 rounded-xl bg-[#FCF9F5] p-3" key={history.id}><ClipboardList size={18} className="mt-1 shrink-0 text-[#8D7569]" /><div><p className="text-sm font-semibold">{statusLabel(history.status)}</p><p className="mt-1 text-xs text-[#826F63]">{uaeDate(history.createdAt)} {history.updatedBy?.email ? `· ${history.updatedBy.email}` : ""}</p>{history.note && <p className="mt-2 text-sm text-[#6B5A50]">{history.note}</p>}</div></li>)}</ol>
              {NEXT_ORDER_STATUS[order.status] ? <div className="mt-6 rounded-2xl border border-[#EADFD8] bg-[#FDF8F3] p-5"><h3 className="font-serif text-xl">Next production stage</h3><p className="mt-2 text-sm text-[#6B5A50]">{statusLabel(order.status)} → <strong>{statusLabel(NEXT_ORDER_STATUS[order.status] ?? "")}</strong></p>
                <label className="mt-4 block text-xs font-semibold text-[#6B5A50]">Optional status note<textarea className={`${input} min-h-20`} maxLength={1000} value={transitionNote} onChange={event => setTransitionNote(event.target.value)} placeholder="Work completed, handover details…" /></label>
                {order.status === "QUALITY_CHECK" && <div className="mt-4 space-y-3 rounded-xl border border-[#E6CDAE] bg-[#FFFBF2] p-4 text-sm text-[#765A38]">
                  <p><strong>Customer photo confirmation:</strong> Your original specification requires confirmation before packing. The current backend only enforces that a QC photo exists; it does not record the customer&apos;s approval. This step does not add that missing approval workflow.</p>
                  <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" className="mt-1" checked={ackManuallyConfirmed} onChange={e => setAckManuallyConfirmed(e.target.checked)} />I have personally confirmed with the customer outside the app. This checkbox is not stored as verified approval.</label>
                </div>}
                <button type="button" className={`${primary} mt-5`} disabled={busy || (order.status === "QUALITY_CHECK" && (!ackManuallyConfirmed || !order.media.some(media => media.type === "QUALITY_CHECK_PHOTO")))} onClick={moveToNext}><PackageCheck size={17} /> Advance to {statusLabel(NEXT_ORDER_STATUS[order.status] ?? "")}</button>
                {order.status === "QUALITY_CHECK" && !order.media.some(media => media.type === "QUALITY_CHECK_PHOTO") && <p className="mt-3 text-xs text-[#916A47]">Add at least one QC photo before proceeding.</p>}
              </div> : <p className="mt-5 text-sm text-[#826F63]">No additional administrator fulfillment transition is available for this status. Payments and refunds must be handled by the authorized payment workflow.</p>}
            </Block>
            <Block title="Quality-check photographs">
              <p className="text-xs leading-6 text-[#806F63]">Reference links, not a file-upload service. Use only images hosted on your approved secure storage. Customer order details display these images; sending an approval notification and capturing customer consent require separate integration.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">{order.media.filter(media => media.type === "QUALITY_CHECK_PHOTO").map(media => <div key={media.id} className="rounded-xl border border-[#EADFD8] p-4"><Camera size={19} className="text-[#826F63]" />
                <p className="mt-2 break-all text-xs text-[#826F63]">{media.caption || "Quality-check photograph"}</p>
                <a href={media.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold underline">View photo <ExternalLink size={13} /></a>
                {order.status === "QUALITY_CHECK" && <button className="mt-3 block text-xs font-semibold text-[#AA5555] underline disabled:opacity-50" disabled={busy} type="button" onClick={() => { if (window.confirm("Remove this QC image reference from the order?")) void mutate(() => removeQcPhoto(order.id, media.id), "QC reference removed."); }}>Remove reference</button>}
              </div>)}</div>
              {order.media.filter(media => media.type === "QUALITY_CHECK_PHOTO").length === 0 && <p className="mt-4 text-sm text-[#8A7B72]">No quality-check photographs yet.</p>}
              {order.status === "QUALITY_CHECK" && <form onSubmit={submitQc} className="mt-6 space-y-3 rounded-xl bg-[#FCF9F5] p-4"><label className="block text-xs font-semibold text-[#6B5A50]">Approved HTTPS image URL<input type="url" required className={input} maxLength={2000} placeholder="https://…" value={qcUrl} onChange={e => setQcUrl(e.target.value)} /></label>
                <label className="block text-xs font-semibold text-[#6B5A50]">Caption (optional)<input className={input} maxLength={500} value={qcCaption} onChange={e => setQcCaption(e.target.value)} placeholder="Finished bouquet from the workshop" /></label>
                <button type="submit" className={button} disabled={busy}><Camera size={16} /> Add photo reference</button></form>}
            </Block>
          </div>
          <div className="min-w-0 space-y-6">
            <Block title="Customer & delivery"><Row label="Customer" value={order.customer.name} /><Row label="Email" value={<span className="break-all">{order.customer.email}</span>} /><Row label="Phone" value={order.customer.phone} /><p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#826F63]">Delivery address</p><p className="mt-2 text-sm leading-7">{formatAddress(order)}</p>
              {order.shippingAddress.deliveryInstructions && <p className="mt-3 rounded-xl bg-[#FCF9F5] p-3 text-xs leading-6">Instructions: {order.shippingAddress.deliveryInstructions}</p>}
              <Row label="Estimated delivery" value={uaeDate(order.estimatedDeliveryAt)} />
            </Block>
            <Block title="Gift preparation"><Row label="Gift wrapping" value={order.gift.selected ? "Requested" : "Not requested"} /><Row label="Gift wrap fee" value={aed(order.amounts.giftWrapAmount)} /><p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#826F63]">Gift message / packing note</p><p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#FCF9F5] p-4 text-sm">{order.gift.message || "No gift message"}</p></Block>
            <Block title="Shipment details"><div className="flex items-center gap-3"><Truck size={20} /><StatusPill status={order.shipment?.status || "PENDING"} /></div>
              <form onSubmit={saveShipment} className="mt-4 space-y-4"><label className="block text-xs font-semibold text-[#6B5A50]">Courier<input className={input} maxLength={120} value={courier} onChange={e => setCourier(e.target.value)} /></label>
                <label className="block text-xs font-semibold text-[#6B5A50]">Tracking number<input className={input} maxLength={200} value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} /></label>
                <label className="block text-xs font-semibold text-[#6B5A50]">Tracking URL (HTTPS)<input type="url" className={input} maxLength={2000} value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} placeholder="https://…" /></label>
                <label className="block text-xs font-semibold text-[#6B5A50]">Estimated delivery day<input type="date" className={input} value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></label>
                <p className="text-xs leading-6 text-[#826F63]">Saving courier details does not mark an order shipped or delivered. Status transitions are handled separately.</p><button type="submit" className={primary} disabled={busy || ["PENDING_PAYMENT", "CANCELLED", "REFUNDED"].includes(order.status)}>Save shipment details</button>
              </form></Block>
            <Block title="Payment & totals"><Row label="Subtotal" value={aed(order.amounts.subtotal)} /><Row label="Discount" value={`− ${aed(order.amounts.discountAmount)}`} /><Row label="Store credit" value={`− ${aed(order.amounts.storeCreditAmount)}`} /><Row label="Delivery" value={aed(order.amounts.deliveryFee)} /><Row label="Tax" value={aed(order.amounts.taxAmount)} /><Row label="Total" value={<strong className="text-lg">{aed(order.amounts.totalAmount)}</strong>} />
              {order.couponCode && <Row label="Coupon" value={order.couponCode} />}
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#806F63]">Payment records · read only</p>{order.payments.length ? order.payments.map(payment => <p className="mt-3 text-xs text-[#6B5A50]" key={payment.id}>{statusLabel(payment.method)} · {statusLabel(payment.status)} · {aed(payment.amount)}</p>) : <p className="mt-3 text-sm text-[#8A7B72]">No payment records available.</p>}
            </Block>
            <div className="rounded-2xl border border-[#EADFD8] bg-[#F6EEE5] p-5 text-xs leading-6 text-[#6B5A50]"><strong className="text-[#4A3B32]">Outstanding specification requirements:</strong> automatic customer QC approval, secure binary QC uploads, printable PDF invoices and packing slips, and full 10-stage tracking details are not supplied by the existing admin API. No fake approval, payment or PDF action is shown.</div>
          </div>
        </div>
      </>}
    </main>
  </div>;
}
