"use client";

import { useEffect, useState } from "react";
import { Bell, RefreshCcw } from "lucide-react";
import { GateScreen, Issue, Note, Pages, WorkArea, btn, field, panel, useEngagementAdmin } from "@/components/admin/EngagementCommon";
import { dateAE, listNotifications, type NotificationEvent, type PageInfo } from "@/lib/adminEngagement";

export default function AdminNotifications() {
  const auth = useEngagementAdmin();
  const [rows, setRows] = useState<NotificationEvent[]>([]);
  const [info, setInfo] = useState<PageInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState("");
  useEffect(() => {
    if (auth.gate !== "ready") return;
    let live = true;
    async function load() {
      setLoading(true); setIssue("");
      try {
        const result = await listNotifications({ page, status, channel });
        if (live) { setRows(result.notifications); setInfo(result.pagination); setNote(result.note); }
      } catch (error) {
        if (live && !auth.guard(error)) setIssue(error instanceof Error ? error.message : "Notifications unavailable.");
      } finally { if (live) setLoading(false); }
    }
    void load();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.gate, page, status, channel, revision]);
  if (auth.gate !== "ready") return <GateScreen gate={auth.gate} error={auth.gateError} />;
  return <WorkArea title="Notification monitoring" eyebrow="Delivery operations · Read-only" detail="Monitor actual queued, sent and failed notification database records. This interface deliberately avoids revealing recipient details or triggering external sends.">
    <Issue value={issue} />
    <section className={panel}>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="flex items-center gap-2 font-serif text-2xl"><Bell size={22} /> Delivery records</h2><p className="mt-2 text-sm text-[#8A7B72]">{info.total} matching records</p></div><button type="button" disabled={loading} className={btn} onClick={() => setRevision(v => v + 1)}><RefreshCcw size={16} /> Refresh</button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold">Delivery status<select className={field} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All</option><option value="QUEUED">Queued</option><option value="SENT">Sent</option><option value="FAILED">Failed</option></select></label>
        <label className="text-xs font-semibold">Channel<select className={field} value={channel} onChange={event => { setChannel(event.target.value); setPage(1); }}><option value="">All</option><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option></select></label>
      </div>
      {loading && <p role="status" className="mt-5 text-sm text-[#8A7B72]">Loading notification records…</p>}
      {!loading && rows.length === 0 && <div className="mt-6"><Note>No notification records match these filters.</Note></div>}
      <div className="mt-5 divide-y divide-[#EADFD8]">{rows.map(row => <article key={row.id} className="grid gap-2 py-5 text-sm sm:grid-cols-[1fr_130px_130px] sm:items-center">
        <div className="min-w-0"><p className="break-all font-semibold">{row.subject || row.templateKey}</p><p className="mt-2 text-xs text-[#8A7B72]">Template: {row.templateKey} · Queued {dateAE(row.createdAt)}</p></div>
        <p className="text-xs font-semibold">{row.channel}</p><div className="text-xs"><span className="rounded-full bg-[#F7EBE8] px-3 py-1.5 font-semibold">{row.status}</span>{row.sentAt && <p className="mt-2 text-[#8A7B72]">Sent {dateAE(row.sentAt)}</p>}</div>
      </article>)}</div><Pages {...info} disabled={loading} onChange={setPage} />
    </section><Note>{note || "A queued or sent database record does not prove WhatsApp or email delivery. Delivery provider integration, retry controls and preference management require separate implementation and verification."}</Note>
  </WorkArea>;
}
