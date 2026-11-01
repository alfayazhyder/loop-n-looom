"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle, Search } from "lucide-react";
import { GateScreen, Issue, Note, Pages, WorkArea, btn, field, mainBtn, panel, useEngagementAdmin } from "@/components/admin/EngagementCommon";
import { assignSupport, dateAE, getSupport, listSupport, nameOf, safeHttps, sendSupportReply, setSupportStatus, type ConversationDetail, type PageInfo, type SupportConversation, type SupportStatus } from "@/lib/adminEngagement";

export default function AdminSupport({ conversationId }: { conversationId?: string }) {
  const auth = useEngagementAdmin();
  const [rows, setRows] = useState<SupportConversation[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [details, setDetails] = useState<ConversationDetail | null>(null);
  const [page, setPage] = useState(1);
  const [messagesPage, setMessagesPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issue, setIssue] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (auth.gate !== "ready") return;
    let live = true;
    async function load() {
      setBusy(true); setIssue("");
      try {
        if (conversationId) {
          const result = await getSupport(conversationId, messagesPage);
          if (live) setDetails(result);
        } else {
          const result = await listSupport({ page, status, search });
          if (live) { setRows(result.conversations); setPageInfo(result.pagination); }
        }
      } catch (error) {
        if (live && !auth.guard(error)) setIssue(error instanceof Error ? error.message : "Could not load support conversations.");
      } finally { if (live) setBusy(false); }
    }
    void load();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.gate, conversationId, messagesPage, page, status, search, revision]);

  async function action(run: () => Promise<unknown>, done: string) {
    if (saving || !conversationId) return;
    setSaving(true); setIssue(""); setNotice("");
    try { await run(); setNotice(done); setRevision(value => value + 1); }
    catch (error) { if (!auth.guard(error)) setIssue(error instanceof Error ? error.message : "Support action failed."); }
    finally { setSaving(false); }
  }
  function find(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPage(1); setSearch(searchDraft.trim()); }
  function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details || !conversationId) return;
    if (!message.trim()) { setIssue("Enter a message before sending."); return; }
    if (attachmentUrl.trim() && !safeHttps(attachmentUrl.trim())) { setIssue("Attachment URL must be HTTPS."); return; }
    if (!window.confirm("Send this reply to the customer in the private support conversation?")) return;
    void action(async () => {
      await sendSupportReply(conversationId, message.trim(), attachmentUrl.trim() || undefined);
      setMessage(""); setAttachmentUrl(""); setMessagesPage(Math.max(1, details.messagePagination.totalPages));
    }, "Reply added to the customer support thread. External delivery is not implied.");
  }
  function flipStatus(next: SupportStatus) {
    if (!conversationId) return;
    if (!window.confirm(`${next === "CLOSED" ? "Close" : "Reopen"} this customer support conversation?`)) return;
    void action(() => setSupportStatus(conversationId, next), `Conversation status updated to ${next}.`);
  }
  if (auth.gate !== "ready") return <GateScreen gate={auth.gate} error={auth.gateError} />;
  const conversation = details?.conversation;
  return <WorkArea title={conversationId ? "Support conversation" : "Customer support"} eyebrow="Thoughtful care · Private messages" detail="Review, reply, assign and close support conversations. Messages are stored in the protected backend; refresh to see new replies.">
    <Issue value={issue} />{notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#E8F2EA] p-4 text-sm text-[#557A61]"><CheckCircle2 size={18} />{notice}</p>}
    {conversationId ? <>
      <div className="flex flex-wrap justify-between gap-3"><Link href="/admin/support" className={btn}>← Support inbox</Link><button className={btn} disabled={busy || saving} onClick={() => setRevision(value => value + 1)}>Refresh messages</button></div>
      {busy && !conversation && <p role="status">Loading conversation…</p>}
      {conversation && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">{conversation.subject || "Customer inquiry"}</h2><p className="mt-2 text-xs text-[#8A7B72]">Opened {dateAE(conversation.createdAt)} · Updated {dateAE(conversation.lastMessageAt)}</p></div><span className="rounded-full bg-[#F7EBE8] px-4 py-2 text-xs font-semibold">{conversation.status}</span></div>
            <div className="mt-6 space-y-4">{details?.messages.length === 0 ? <Note>No messages yet.</Note> : details?.messages.map(item => <article key={item.id} className={`rounded-xl border p-4 ${item.senderType === "ADMIN" ? "border-[#EADFD8] bg-[#F7EBE8]" : "border-[#EFE8E2] bg-[#FCF9F5]"}`}>
              <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs"><span className="font-semibold">{item.senderType === "ADMIN" ? "Studio team" : "Customer"}</span><span className="text-[#8A7B72]">{dateAE(item.createdAt)}</span></div>
              <p className="whitespace-pre-wrap break-words text-sm leading-7">{item.body}</p>
              {safeHttps(item.attachmentUrl) && <a className="mt-3 block break-all text-xs underline underline-offset-4" href={item.attachmentUrl!} target="_blank" rel="noopener noreferrer">View attached reference ↗</a>}
            </article>)}</div>
            {details && <Pages page={details.messagePagination.page} total={details.messagePagination.total} totalPages={details.messagePagination.totalPages} disabled={busy || saving} onChange={setMessagesPage} />}
          </section>
          <section className={panel}><h3 className="font-serif text-2xl">Send a thoughtful reply</h3><p className="mt-2 text-sm text-[#8A7B72]">Visible only to authorized staff and the customer in this conversation.</p>
            {conversation.status === "CLOSED" ? <div className="mt-5"><Note>This conversation is closed. Reopen it before replying.</Note></div> : <form className="mt-5 space-y-4" onSubmit={reply}>
              <label className="block text-xs font-semibold">Message<textarea className={field} rows={5} required maxLength={5000} value={message} onChange={event => setMessage(event.target.value)} placeholder="Write a helpful reply…" /></label>
              <label className="block text-xs font-semibold">Optional HTTPS attachment URL<input className={field} type="url" maxLength={2000} value={attachmentUrl} onChange={event => setAttachmentUrl(event.target.value)} placeholder="https://…" /></label>
              <button type="submit" disabled={saving || !message.trim()} className={mainBtn}>Send support reply</button>
            </form>}
          </section>
        </div>
        <aside className={`${panel} h-fit`}><h3 className="font-serif text-xl">Conversation details</h3>
          <dl className="mt-5 space-y-3 text-sm"><div><dt className="text-[#8A7B72]">Customer</dt><dd className="mt-1 font-medium">{conversation.customer ? nameOf(conversation.customer) : conversation.guestName || "Guest"}</dd></div><div><dt className="text-[#8A7B72]">Contact</dt><dd className="mt-1 break-all">{conversation.customer?.email || conversation.guestEmail || "Not supplied"}</dd></div><div><dt className="text-[#8A7B72]">Assigned to</dt><dd className="mt-1">{conversation.assignedAdmin ? nameOf(conversation.assignedAdmin) : "Unassigned"}</dd></div></dl>
          <div className="mt-5 space-y-2 border-t border-[#EADFD8] pt-5">
            {conversation.customer?.id && <Link href={`/admin/customers/${encodeURIComponent(conversation.customer.id)}`} className={btn}>View customer profile</Link>}
            {conversation.order?.id && <Link href={`/admin/orders/${encodeURIComponent(conversation.order.id)}`} className={btn}>Order {conversation.order.orderNumber}</Link>}
          </div>
          <h4 className="mt-6 text-xs font-semibold uppercase tracking-[.13em]">Manage thread</h4><div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={saving || busy || conversation.assignedAdminId === auth.adminId} onClick={() => void action(() => assignSupport(conversationId, auth.adminId), "Conversation assigned to your admin account.")}>Assign to me</button>
            <button type="button" className={btn} disabled={saving || busy || !conversation.assignedAdminId} onClick={() => void action(() => assignSupport(conversationId, null), "Conversation unassigned.")}>Unassign</button>
            <button type="button" className={mainBtn} disabled={saving || busy} onClick={() => flipStatus(conversation.status === "OPEN" ? "CLOSED" : "OPEN")}>{conversation.status === "OPEN" ? "Close conversation" : "Reopen conversation"}</button>
          </div><p className="mt-4 text-xs leading-6 text-[#8A7B72]">No new attachment-upload API or automated WhatsApp/Email send is implied.</p>
        </aside>
      </div>}
    </> : <section className={panel}>
      <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_auto] md:items-end" onSubmit={find}>
        <label className="text-xs font-semibold">Search subject or guest contact<input aria-label="Search conversations" className={field} maxLength={200} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Find a conversation" /></label>
        <label className="text-xs font-semibold">Status<select className={field} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label>
        <button className={mainBtn} type="submit"><Search size={16} /> Search</button>
      </form>
      {busy && <p role="status" className="mt-5 text-sm">Loading support conversations…</p>}
      {!busy && rows.length === 0 && <div className="mt-6"><Note>No support threads match these filters.</Note></div>}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">{rows.map(item => <Link key={item.id} href={`/admin/support/${encodeURIComponent(item.id)}`} className="rounded-2xl border border-[#EADFD8] p-5 hover:bg-[#F7EBE8]">
        <div className="flex justify-between gap-3"><p className="flex items-center gap-2 font-semibold"><MessageCircle size={16} />{item.subject || "Customer inquiry"}</p><span className="shrink-0 text-xs text-[#8A7B72]">{item.status}</span></div>
        <p className="mt-3 break-all text-sm text-[#6B5A50]">{item.customer?.email || item.guestEmail || nameOf(item.customer) || item.guestName || "Guest"}</p>
        <p className="mt-2 line-clamp-2 text-xs text-[#8A7B72]">{item.messages?.[0]?.body || "No messages yet"}</p>
        <p className="mt-4 text-xs text-[#927D70]">{item.assignedAdmin ? `Assigned: ${nameOf(item.assignedAdmin)}` : "Unassigned"} · {dateAE(item.lastMessageAt || item.createdAt)}</p>
      </Link>)}</div><Pages {...pageInfo} disabled={busy} onChange={setPage} />
    </section>}
  </WorkArea>;
}
