"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, LockKeyhole, MessageCircle, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api";
import { adminDate, adminMoney, assertAdminAccess } from "@/lib/adminDashboard";
import {
  MANAGED_STATUSES, MANUALLY_EDITABLE_STATUSES, QUOTE_BLOCKED_STATUSES,
  CLOSED_STATUSES, REQUEST_STATUSES, adminLabel, assignAdmin, createAdminQuote,
  getAdminRequest, getAdminRequests, quoteBody, sendAdminMessage, sendAdminQuote,
  updateRequestStatus, validHttpsLink,
  type AdminCustomRequestRecord, type ManagedStatus,
} from "@/lib/adminCustomRequests";

const panel = "rounded-[1.7rem] border border-[#EADFD8] bg-white p-6 shadow-[0_5px_28px_rgba(74,59,50,0.05)] sm:p-8";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#4A3B32] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const outlineButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#EADFD8] bg-white px-5 py-2.5 text-sm font-semibold hover:bg-[#F7EBE8] disabled:cursor-not-allowed disabled:opacity-40";
const field = "mt-2 min-h-11 w-full rounded-xl border border-[#EADFD8] bg-white px-4 py-2.5 text-sm text-[#4A3B32] outline-none focus:border-[#4A3B32]";

type Gate = "checking" | "ready" | "sign-in" | "forbidden" | "error";

function StatusPill({ status }: { status: string }) {
  return <span className="inline-flex rounded-full bg-[#F7EBE8] px-3 py-1.5 text-xs font-semibold text-[#6B5A50]">{adminLabel(status)}</span>;
}

function Banner({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <div role={success ? "status" : "alert"} className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${success ? "border-[#CDDFD2] bg-[#EFF7F0] text-[#43664A]" : "border-[#F1D8D8] bg-[#FFF6F5] text-[#9A4C4C]"}`}>
    {success ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
    <span>{children}</span>
  </div>;
}

function AccessMessage({ gate, message }: { gate: Gate; message: string }) {
  return <main className="min-h-screen bg-[#FCF9F5] px-5 py-20 text-[#4A3B32]">
    <div className={`${panel} mx-auto max-w-xl text-center`}>
      <LockKeyhole className="mx-auto text-[#6B5A50]" size={32} />
      <h1 className="mt-5 font-serif text-3xl">{gate === "checking" ? "Checking administrator access" : gate === "sign-in" ? "Administrator sign-in required" : gate === "forbidden" ? "Administrator access restricted" : "Unable to open this workspace"}</h1>
      <p role={gate === "checking" ? "status" : "alert"} className="mt-4 text-sm leading-7 text-[#6B5A50]">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {gate === "sign-in" && <Link href="/login" className={button}>Sign in</Link>}
        <Link href="/admin" className={outlineButton}>Admin overview</Link>
      </div>
    </div>
  </main>;
}

function WorkspaceHeader({ title, intro, back = "/admin" }: { title: string; intro: string; back?: string }) {
  return <div>
    <nav aria-label="Admin breadcrumb" className="mb-8 flex flex-wrap items-center gap-3 text-sm text-[#6B5A50]">
      <Link href={back} className="inline-flex items-center gap-1 underline-offset-4 hover:underline"><ArrowLeft size={16} /> {back === "/admin" ? "Admin dashboard" : "All custom requests"}</Link>
      <span aria-hidden="true">/</span><span>Private studio workspace</span>
    </nav>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#947E71]">LOOP_N_LOOOM · Made especially</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">{intro}</p>
      </div>
      <Link href="/admin/products" className={outlineButton}>Product catalogue <ArrowRight size={15} /></Link>
    </div>
  </div>;
}

function nameOrEmail(value: { firstName?: string | null; lastName?: string | null; email?: string } | null | undefined): string {
  if (!value) return "Not assigned";
  return [value.firstName, value.lastName].filter(Boolean).join(" ") || value.email || "Administrator";
}

export function AdminCustomRequestList() {
  const [gate, setGate] = useState<Gate>("checking");
  const [gateMessage, setGateMessage] = useState("Verifying your protected administrator session.");
  const [adminId, setAdminId] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState<AdminCustomRequestRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function verify() {
      try {
        const access = await assertAdminAccess();
        if (!active) return;
        setAdminId(access.user.id);
        setGate("ready");
      } catch (cause) {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) setGate("sign-in");
        else if (cause instanceof ApiError && cause.status === 403) setGate("forbidden");
        else { setGate("error"); setGateMessage(cause instanceof Error ? cause.message : "Admin access could not be verified."); }
      }
    }
    void verify();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (gate !== "ready") return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await getAdminRequests({ page, search, status, assignedAdminId: assignedToMe ? adminId : undefined }, controller.signal);
        if (controller.signal.aborted) return;
        if (!Array.isArray(result.requests) || !result.pagination) throw new Error("Unexpected custom-request list response.");
        setRequests(result.requests);
        setTotal(result.pagination.total);
        setTotalPages(Math.max(1, result.pagination.totalPages));
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
          setRequests([]);
          setGate(cause.status === 401 ? "sign-in" : "forbidden");
        } else setError(cause instanceof Error ? cause.message : "Could not retrieve custom requests.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [gate, adminId, page, search, status, assignedToMe, reload]);

  if (gate !== "ready") return <AccessMessage gate={gate} message={gateMessage} />;

  return <main className="min-h-screen bg-[#FCF9F5] px-5 py-10 text-[#4A3B32] sm:px-8 lg:py-14">
    <div className="mx-auto max-w-[1400px] space-y-8">
      <WorkspaceHeader title="Custom requests & quotations" intro="Manage bespoke crochet ideas, assign makers, discuss design details and prepare clear AED quotations. Payments and order conversion are separate, verified processes." />
      <section className={panel} aria-label="Filter custom requests">
        <form className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(170px,1fr)_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(queryInput.trim().slice(0, 200)); }}>
          <label className="block text-sm font-medium">Search customer, email, title or design brief
            <input value={queryInput} maxLength={200} onChange={(event) => setQueryInput(event.target.value)} className={field} placeholder="Search custom requests" />
          </label>
          <label className="block text-sm font-medium">Request status
            <select value={status} className={field} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              {REQUEST_STATUSES.map((item) => <option key={item} value={item}>{adminLabel(item)}</option>)}
            </select>
          </label>
          <button className={button} type="submit">Search <ArrowRight size={16} /></button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#EADFD8] pt-5">
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-[#4A3B32]" checked={assignedToMe} onChange={(event) => { setAssignedToMe(event.target.checked); setPage(1); }} /> Assigned to me</label>
          <button className={outlineButton} type="button" onClick={() => setReload((value) => value + 1)}><RefreshCw size={16} /> Refresh</button>
        </div>
      </section>
      {error && <Banner>{error}</Banner>}
      <section aria-live="polite">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-serif text-2xl">Requests</h2><p className="text-sm text-[#8A7B72]">{loading ? "Updating…" : `${total} matching requests`}</p></div>
        {loading ? <div role="status" className={panel}>Loading live custom-request records…</div> : requests.length === 0 && !error ? <div className={panel}><ClipboardList className="text-[#8A7B72]" /><p className="mt-4 font-serif text-2xl">No requests match your filters.</p><p className="mt-2 text-sm text-[#6B5A50]">Try a different status or search term.</p></div> :
          <div className="grid gap-5 lg:grid-cols-2">
            {requests.map((request) => <Link href={`/admin/custom-requests/${encodeURIComponent(request.id)}`} key={request.id} className={`${panel} block transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2`}>
              <div className="flex flex-wrap items-center justify-between gap-3"><StatusPill status={request.status} /><span className="text-xs text-[#8A7B72]">{adminDate(request.createdAt)}</span></div>
              <h3 className="mt-5 font-serif text-2xl">{request.title}</h3>
              <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-[#6B5A50]">{request.description}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#EADFD8] pt-5 text-xs">
                <div><dt className="text-[#8A7B72]">Customer</dt><dd className="mt-1 break-words font-semibold">{request.customerName || request.customerEmail}</dd></div>
                <div><dt className="text-[#8A7B72]">Assigned maker</dt><dd className="mt-1 break-words font-semibold">{nameOrEmail(request.assignedAdmin)}</dd></div>
                <div><dt className="text-[#8A7B72]">Discussion</dt><dd className="mt-1 font-semibold">{request._count?.messages ?? "—"} messages</dd></div>
                <div><dt className="text-[#8A7B72]">Quotes</dt><dd className="mt-1 font-semibold">{request._count?.quotes ?? "—"} versions</dd></div>
              </dl>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">Open request <ArrowRight size={16} /></span>
            </Link>)}
          </div>}
      </section>
      {!loading && !error && totalPages > 1 && <nav aria-label="Custom request pages" className="flex items-center justify-center gap-4">
        <button className={outlineButton} disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
        <span className="text-sm">Page {page} of {totalPages}</span>
        <button className={outlineButton} disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
      </nav>}
      <p className="text-xs leading-6 text-[#8A7B72]">Request details are private. Server-side administrator permissions are checked for every read and action.</p>
    </div>
  </main>;
}

export function AdminCustomRequestDetail({ requestId }: { requestId: string }) {
  const [gate, setGate] = useState<Gate>("checking");
  const [gateMessage, setGateMessage] = useState("Verifying your administrator permissions.");
  const [adminId, setAdminId] = useState("");
  const [request, setRequest] = useState<AdminCustomRequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [amount, setAmount] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [statusChoice, setStatusChoice] = useState<ManagedStatus>("UNDER_REVIEW");
  const [otherAdminId, setOtherAdminId] = useState("");

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const value = await getAdminRequest(requestId, signal);
    if (!signal?.aborted) setRequest(value);
  }, [requestId]);

  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      try {
        const access = await assertAdminAccess();
        if (controller.signal.aborted) return;
        setAdminId(access.user.id);
        const value = await getAdminRequest(requestId, controller.signal);
        if (controller.signal.aborted) return;
        setRequest(value);
        setGate("ready");
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiError && cause.status === 401) setGate("sign-in");
        else if (cause instanceof ApiError && cause.status === 403) setGate("forbidden");
        else { setGate("error"); setGateMessage(cause instanceof Error ? cause.message : "Unable to load this request."); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void initialize();
    return () => controller.abort();
  }, [requestId]);

  async function act(action: () => Promise<unknown>, success: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    setError(""); setNotice("");
    try {
      await action();
      await refresh();
      setNotice(success);
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
        setRequest(null);
        setGate(cause.status === 401 ? "sign-in" : "forbidden");
      } else setError(cause instanceof Error ? cause.message : "Action could not be completed.");
      return false;
    } finally { setBusy(false); }
  }

  async function postMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || text.length > 5000 || busy) return;
    const attached = attachmentUrl.trim();
    if (attached && !validHttpsLink(attached)) { setError("An attachment must be a valid HTTPS link. File upload is not enabled in this workspace."); return; }
    const sent = await act(() => sendAdminMessage(requestId, text, attached || undefined), "Your message was sent to this request.");
    if (sent) { setMessageText(""); setAttachmentUrl(""); }
  }

  async function postQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    let body: ReturnType<typeof quoteBody>;
    try { body = quoteBody(amount, quoteNotes, expiryDate); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid quotation."); return; }
    if (!window.confirm(`Create a DRAFT quotation for AED ${body.amount.toFixed(2)}? This does not collect payment or send the quote.`)) return;
    const created = await act(() => createAdminQuote(requestId, body), "Quotation draft created. Review the draft and send it separately when ready.");
    if (created) { setAmount(""); setQuoteNotes(""); setExpiryDate(""); }
  }

  const isClosed = request ? CLOSED_STATUSES.has(request.status) : true;
  const mayQuote = request ? !QUOTE_BLOCKED_STATUSES.has(request.status) : false;
  const mayUpdate = request ? MANUALLY_EDITABLE_STATUSES.has(request.status) : false;

  if (gate !== "ready" || loading || !request) return <AccessMessage gate={gate} message={loading ? "Loading private request details…" : gateMessage} />;

  return <main className="min-h-screen bg-[#FCF9F5] px-5 py-10 text-[#4A3B32] sm:px-8 lg:py-14">
    <div className="mx-auto max-w-[1440px] space-y-8">
      <WorkspaceHeader title={request.title} intro="Review the complete customer brief, reference images, secure conversation and versioned quotations." back="/admin/custom-requests" />
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap items-center gap-3"><StatusPill status={request.status} /><span className="text-xs text-[#8A7B72]">Received {adminDate(request.createdAt)}</span></div><button type="button" onClick={() => void act(() => refresh(), "Request refreshed.")} className={outlineButton} disabled={busy}><RefreshCw size={15} /> Refresh</button></div>
      {error && <Banner>{error}</Banner>}
      {notice && <Banner success>{notice}</Banner>}
      {request.order && <Banner success>Linked order {request.order.orderNumber} · {adminLabel(request.order.status)}. No payment or order status is changed from this screen.</Banner>}
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-7">
          <section className={panel} aria-labelledby="brief-heading">
            <h2 id="brief-heading" className="font-serif text-2xl">Customer design brief</h2>
            <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-[#6B5A50]">{request.description}</p>
            <dl className="mt-7 grid gap-5 border-t border-[#EADFD8] pt-6 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-[#8A7B72]">Customer</dt><dd className="mt-1 break-words font-semibold">{request.customerName}</dd><dd className="mt-1 break-all text-[#6B5A50]">{request.customerEmail}</dd>{request.customerPhone && <dd className="mt-1">{request.customerPhone}</dd>}</div>
              <div><dt className="text-xs text-[#8A7B72]">Assigned administrator</dt><dd className="mt-1 font-semibold">{nameOrEmail(request.assignedAdmin)}</dd></div>
              <div><dt className="text-xs text-[#8A7B72]">Colours</dt><dd className="mt-1 font-medium">{request.colors?.join(", ") || "Not specified"}</dd></div>
              <div><dt className="text-xs text-[#8A7B72]">Size / dimensions</dt><dd className="mt-1 font-medium">{request.size || "Not specified"}</dd></div>
              <div><dt className="text-xs text-[#8A7B72]">Occasion</dt><dd className="mt-1 font-medium">{request.occasion || "Not specified"}</dd></div>
              <div><dt className="text-xs text-[#8A7B72]">Requested delivery date</dt><dd className="mt-1 font-medium">{request.targetDate ? adminDate(request.targetDate) : "Not specified"}</dd></div>
              <div><dt className="text-xs text-[#8A7B72]">Preferred budget</dt><dd className="mt-1 font-medium">{request.budgetMin == null && request.budgetMax == null ? "Not specified" : `${request.budgetMin == null ? "Flexible" : adminMoney(request.budgetMin)} – ${request.budgetMax == null ? "Flexible" : adminMoney(request.budgetMax)}`}</dd></div>
              <div><dt className="text-xs text-[#8A7B72]">Request ID</dt><dd className="mt-1 break-all text-xs">{request.id}</dd></div>
            </dl>
          </section>
          <section className={panel} aria-labelledby="media-heading">
            <h2 id="media-heading" className="font-serif text-2xl">Inspiration & attachments</h2>
            <p className="mt-2 text-sm text-[#6B5A50]">Customer-supplied links. Only HTTPS media is opened; uploads are not available in this milestone.</p>
            {!request.media?.length ? <p className="mt-5 rounded-2xl bg-[#FCF9F5] p-5 text-sm text-[#6B5A50]">No reference media attached.</p> : <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {request.media.map((media, index) => {
                const url = validHttpsLink(media.url);
                return <div key={media.id} className="overflow-hidden rounded-2xl border border-[#EADFD8] bg-[#FCF9F5]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- customer-provided HTTPS source has no fixed Next.js image provider */}
                  {url && <img src={url} alt={`Customer inspiration attachment ${index + 1}`} className="aspect-[4/3] w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />}
                  <div className="p-4 text-xs"><span className="font-semibold">Attachment {index + 1}</span><p className="mt-1 text-[#8A7B72]">{adminLabel(media.type)}</p>{url ? <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="mt-2 inline-block font-semibold underline">View original attachment ↗</a> : <p className="mt-2 text-[#9A4C4C]">Insecure or invalid attachment URL not opened.</p>}</div>
                </div>;
              })}
            </div>}
          </section>
          <section className={panel} aria-labelledby="chat-heading">
            <div className="flex items-center gap-3"><MessageCircle size={23} /><h2 id="chat-heading" className="font-serif text-2xl">Design discussion</h2></div>
            <div className="mt-6 max-h-[550px] space-y-3 overflow-y-auto" aria-live="polite">
              {!request.messages?.length && <p className="rounded-2xl bg-[#FCF9F5] p-5 text-sm">No messages yet.</p>}
              {request.messages?.map((item) => <article key={item.id} className={`rounded-2xl p-4 ${item.senderType === "ADMIN" ? "bg-[#F7EBE8]" : "bg-[#FCF9F5]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[#7C6C62]"><span>{item.senderType === "ADMIN" ? "LOOP_N_LOOOM team" : "Customer"}</span><span>{adminDate(item.createdAt)}</span></div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{item.message}</p>
                {item.attachmentUrl && (validHttpsLink(item.attachmentUrl) ? <a className="mt-2 inline-block text-xs font-semibold underline" href={validHttpsLink(item.attachmentUrl) ?? undefined} rel="noopener noreferrer" referrerPolicy="no-referrer" target="_blank">Open attached link ↗</a> : <p className="mt-2 text-xs text-[#9A4C4C]">Insecure attachment URL hidden.</p>)}
              </article>)}
            </div>
            {!isClosed ? <form className="mt-7 border-t border-[#EADFD8] pt-6" onSubmit={(event) => void postMessage(event)}>
              <label className="block text-sm font-semibold">Send a design clarification
                <textarea required rows={4} maxLength={5000} value={messageText} onChange={(event) => setMessageText(event.target.value)} className={`${field} resize-y`} placeholder="Ask about colours, materials, sizing, delivery timing…" />
              </label>
              <label className="mt-4 block text-sm">Optional existing HTTPS attachment link
                <input type="url" value={attachmentUrl} onChange={(event) => setAttachmentUrl(event.target.value)} className={field} placeholder="https://… (no file upload)" />
              </label>
              <button type="submit" className={`${button} mt-5`} disabled={busy || !messageText.trim()}><Send size={16} /> {busy ? "Working…" : "Send message"}</button>
              <p className="mt-3 text-xs leading-5 text-[#8A7B72]">Messages are sent using the protected admin API; no browser-stored access tokens.</p>
            </form> : <p className="mt-5 text-sm text-[#6B5A50]">This request is closed to new messages.</p>}
          </section>
        </div>
        <aside className="space-y-7">
          <section className={panel} aria-labelledby="assign-heading">
            <h2 id="assign-heading" className="font-serif text-2xl">Assignment & workflow</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B5A50]">Current maker: <strong>{nameOrEmail(request.assignedAdmin)}</strong></p>
            {!isClosed ? <div className="mt-5 flex flex-wrap gap-3"><button className={button} type="button" disabled={busy || request.assignedAdminId === adminId} onClick={() => void act(() => assignAdmin(requestId, adminId), "Request assigned to your administrator account.")}>Assign to me</button><button className={outlineButton} type="button" disabled={busy || !request.assignedAdminId} onClick={() => { if (window.confirm("Unassign this request?")) void act(() => assignAdmin(requestId, null), "Assignment removed."); }}>Unassign</button></div> : <p className="mt-4 text-sm text-[#8A7B72]">Closed requests cannot be reassigned.</p>}
            {!isClosed && <form className="mt-5" onSubmit={(event) => { event.preventDefault(); const id = otherAdminId.trim(); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { setError("Enter the other administrator's full UUID."); return; } if (window.confirm("Assign this request to the specified active administrator?")) void act(() => assignAdmin(requestId, id), "Request reassigned successfully."); }}>
              <label className="block text-xs text-[#6B5A50]">Or assign by existing administrator ID
                <input className={field} value={otherAdminId} onChange={(event) => setOtherAdminId(event.target.value)} placeholder="Administrator UUID" maxLength={36} />
              </label>
              <button className={`${outlineButton} mt-3`} type="submit" disabled={busy || !otherAdminId.trim()}>Assign administrator</button>
            </form>}
            <div className="my-6 border-t border-[#EADFD8]" />
            <label className="block text-sm font-semibold">Update request status
              <select value={statusChoice} disabled={!mayUpdate || busy} onChange={(event) => setStatusChoice(event.target.value as ManagedStatus)} className={field}>{MANAGED_STATUSES.map((item) => <option key={item} value={item}>{adminLabel(item)}</option>)}</select>
            </label>
            <button className={`${outlineButton} mt-4`} type="button" disabled={!mayUpdate || busy} onClick={() => { if (window.confirm(`Change request to ${adminLabel(statusChoice)}?${statusChoice === "REJECTED" || statusChoice === "CANCELLED" ? " This closes the request." : ""}`)) void act(() => updateRequestStatus(requestId, statusChoice), "Request status updated."); }}>Save status</button>
            {!mayUpdate && <p className="mt-3 text-xs leading-5 text-[#8A7B72]">This request status cannot be changed manually. Quote acceptance, payment and conversion are never set here.</p>}
          </section>
          <section className={panel} aria-labelledby="quote-heading">
            <h2 id="quote-heading" className="font-serif text-2xl">Quotations</h2>
            <p className="mt-3 text-sm leading-6 text-[#6B5A50]">Draft quotations are private until you explicitly send them. Sending a quotation does not charge the customer or create an order.</p>
            {!request.quotes?.length && <p className="mt-5 rounded-2xl bg-[#FCF9F5] p-4 text-sm text-[#6B5A50]">No quotations prepared yet.</p>}
            <div className="mt-5 space-y-4">
              {request.quotes?.map((quote) => <div key={quote.id} className="rounded-2xl border border-[#EADFD8] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-semibold">Version {quote.version}</span><StatusPill status={quote.status} /></div>
                <p className="mt-4 font-serif text-2xl">{adminMoney(quote.amount)}</p>
                {quote.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#6B5A50]">{quote.notes}</p>}
                {quote.validUntil && <p className="mt-3 text-xs text-[#8A7B72]">Valid through {adminDate(quote.validUntil)}</p>}
                {quote.sentAt && <p className="mt-1 text-xs text-[#8A7B72]">Sent {adminDate(quote.sentAt)}</p>}
                {quote.status === "DRAFT" && mayQuote && <button type="button" disabled={busy} className={`${button} mt-5`} onClick={() => { if (window.confirm(`Send version ${quote.version} for ${adminMoney(quote.amount)} to the customer? Other sent quotes may expire.`)) void act(() => sendAdminQuote(requestId, quote.id), "Quotation sent to the customer. No payment was collected."); }}><Send size={16} /> Send quote</button>}
              </div>)}
            </div>
            {mayQuote ? <form className="mt-7 border-t border-[#EADFD8] pt-6" onSubmit={(event) => void postQuote(event)}>
              <h3 className="font-serif text-xl">Prepare a new draft</h3>
              <label className="mt-5 block text-sm font-medium">Quoted price (AED)
                <input required type="text" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="195.00" className={field} />
              </label>
              <label className="mt-4 block text-sm font-medium">Details and production estimate (optional)
                <textarea maxLength={5000} rows={4} value={quoteNotes} onChange={(event) => setQuoteNotes(event.target.value)} className={field} placeholder="Describe handmade materials, delivery expectations and production days…" />
              </label>
              <label className="mt-4 block text-sm font-medium">Valid until (optional, UAE date)
                <input type="date" className={field} value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
              </label>
              <button type="submit" disabled={busy || !amount.trim()} className={`${button} mt-5`}>Create draft quotation</button>
            </form> : <p className="mt-5 text-sm text-[#8A7B72]">No further quotations can be created in this request state.</p>}
          </section>
          <div className="rounded-3xl border border-[#EADFD8] bg-[#F7EBE8] p-6 text-sm leading-7 text-[#6B5A50]"><ShieldCheck className="mb-3 text-[#4A3B32]" size={24} /><p className="font-serif text-xl text-[#4A3B32]">Payment integrity</p><p className="mt-2">A customer accepting a quotation does not automatically prove payment. Payment confirmation and any handoff to a production order must come from the verified backend payment workflow; no paid/order-conversion controls exist on this screen.</p></div>
        </aside>
      </div>
    </div>
  </main>;
}
