"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  ChartNoAxesColumnIncreasing,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  UsersRound,
  X,
} from "lucide-react";

import Logo from "@/components/Logo";
import { ApiError } from "@/lib/api";
import {
  ADMIN_SECTIONS,
  adminDate,
  adminMoney,
  assertAdminAccess,
  displayStatus,
  fetchAdminDashboard,
  type AdminDashboardData,
  type AdminDashboardErrors,
} from "@/lib/adminDashboard";
import { signOut } from "@/lib/session";

type Gate = "checking" | "ready" | "sign-in" | "forbidden" | "error";

const nav = [
  { label: "Overview", href: "#overview", icon: LayoutDashboard },
  { label: "Analytics", href: "/admin/analytics", icon: ChartNoAxesColumnIncreasing },
  { label: "Coupons", href: "/admin/coupons", icon: Tag },
  { label: "Marketing", href: "/admin/marketing", icon: BellRing },
  { label: "Reports", href: "/admin/reports", icon: ChartNoAxesColumnIncreasing },
  { label: "Notifications", href: "/admin/notifications", icon: BellRing },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Custom requests", href: "/admin/custom-requests", icon: Sparkles },
  { label: "Review moderation", href: "/admin/reviews", icon: Star },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Customers", href: "/admin/customers", icon: UsersRound },
  { label: "Support", href: "/admin/support", icon: MessageCircle },
];

const card = "rounded-[1.6rem] border border-[#EADFD8] bg-white shadow-[0_5px_25px_rgba(74,59,50,0.035)]";

function SectionHeading({
  id,
  eyebrow,
  title,
  detail,
  icon: Icon,
}: {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  icon: typeof Package;
}) {
  return (
    <div id={id} className="scroll-mt-28 flex flex-wrap items-center justify-between gap-4 pt-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#947E71]">{eyebrow}</p>
        <h2 className="mt-2 font-serif text-[1.7rem] leading-tight sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#7C6C62]">{detail}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7EBE8] text-[#4A3B32]">
        <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
      </div>
    </div>
  );
}

function Note({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-[#EADFD8] bg-[#FCF9F5] px-5 py-6 text-sm leading-7 text-[#7C6C62]">
      {message}
    </div>
  );
}

function SectionIssue({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-[#E7D1C3] bg-[#FFF8F4] px-4 py-3 text-sm text-[#865D47]">
      <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function Pill({ value }: { value: string }) {
  return (
    <span className="inline-flex max-w-full rounded-full bg-[#F6EEE5] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#6B5A50]">
      {displayStatus(value)}
    </span>
  );
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Package;
}) {
  return (
    <div className={`${card} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#816F64]">{label}</p>
        <div className="rounded-xl bg-[#F7EBE8] p-2 text-[#6B5A50]">
          <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 break-words font-serif text-3xl sm:text-[2.15rem]">{value}</p>
      <p className="mt-3 text-xs leading-5 text-[#8A7B72]">{note}</p>
    </div>
  );
}

function AdminNavigation({
  onNavigate,
  role,
}: {
  onNavigate: () => void;
  role: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-3 border-b border-[#EADFD8] px-6 py-6">
        <Logo size={57} />
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A7B72]">LOOP_N_LOOOM</span>
          <span className="mt-1 block font-serif text-xl">Studio Admin</span>
        </span>
      </Link>
      <div className="px-4 py-6">
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#A09084]">Workspace</p>
        <nav aria-label="Admin sections" className="mt-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              onClick={onNavigate}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#6B5A50] transition-colors hover:bg-[#F7EBE8] hover:text-[#4A3B32]"
            >
              <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t border-[#EADFD8] p-5">
        <p className="flex items-center gap-2 text-xs font-semibold text-[#557A61]">
          <ShieldCheck size={17} aria-hidden="true" />
          {displayStatus(role)} session
        </p>
        <Link href="/" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-[#6B5A50] underline-offset-4 hover:underline">
          <ArrowLeft size={15} /> Back to storefront
        </Link>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("checking");
  const [role, setRole] = useState("");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [issues, setIssues] = useState<AdminDashboardErrors>({});
  const [gateMessage, setGateMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const access = await assertAdminAccess();
        if (!active) return;
        setRole(access.user.role);

        const result = await fetchAdminDashboard();
        if (!active) return;

        const revoked = result.failures.find(
          (failure) => failure instanceof ApiError && (failure.status === 401 || failure.status === 403),
        );
        if (revoked instanceof ApiError) {
          setData(null);
          setGate(revoked.status === 401 ? "sign-in" : "forbidden");
          return;
        }

        setData(result.data);
        setIssues(result.errors);
        setGate("ready");
      } catch (error) {
        if (!active) return;
        setData(null);
        if (error instanceof ApiError && error.status === 401) {
          setGate("sign-in");
        } else if (error instanceof ApiError && error.status === 403) {
          setGate("forbidden");
        } else {
          setGateMessage(error instanceof Error ? error.message : "Could not verify admin access.");
          setGate("error");
        }
      }
    }

    void initialize();
    return () => { active = false; };
  }, []);

  async function refresh() {
    if (refreshing || gate !== "ready") return;
    setRefreshing(true);
    try {
      const access = await assertAdminAccess();
      const result = await fetchAdminDashboard();
      const revoked = result.failures.find(
        (failure) => failure instanceof ApiError && (failure.status === 401 || failure.status === 403),
      );
      if (revoked instanceof ApiError) {
        setData(null);
        setGate(revoked.status === 401 ? "sign-in" : "forbidden");
        return;
      }
      setRole(access.user.role);
      setData(result.data);
      setIssues(result.errors);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setData(null);
        setGate(error.status === 401 ? "sign-in" : "forbidden");
      } else {
        setGateMessage(error instanceof Error ? error.message : "Unable to refresh the dashboard.");
        setGate("error");
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      setData(null);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setGateMessage(error instanceof Error ? error.message : "Unable to sign out.");
      setSigningOut(false);
    }
  }

  if (gate !== "ready" || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FCF9F5] px-5 py-16">
        <div className={`${card} w-full max-w-lg p-8 text-center sm:p-12`}>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F7EBE8]">
            <ShieldCheck size={34} strokeWidth={1.45} />
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.21em] text-[#8A7B72]">LOOP_N_LOOOM · Private workspace</p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl">
            {gate === "checking" ? "Checking permissions" :
              gate === "sign-in" ? "Administrator sign-in" :
              gate === "forbidden" ? "Access restricted" : "Dashboard unavailable"}
          </h1>
          <p role={gate === "checking" ? "status" : "alert"} className="mt-5 text-sm leading-7 text-[#6B5A50]">
            {gate === "checking" ? "Verifying your session against the secure admin API…" :
              gate === "sign-in" ? "Sign in with an authorized administrator account, then return to /admin." :
              gate === "forbidden" ? "Your current account does not have administrator permissions. No store operations data was loaded." :
              gateMessage || "The administrator service could not be reached."}
          </p>
          {gate !== "checking" && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {gate === "sign-in" && (
                <Link href="/login" className="rounded-full bg-[#4A3B32] px-7 py-3 text-sm font-medium text-white">Go to sign in</Link>
              )}
              {gate === "error" && (
                <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-[#4A3B32] px-7 py-3 text-sm font-medium text-white">Retry</button>
              )}
              <Link href="/" className="rounded-full border border-[#EADFD8] px-7 py-3 text-sm font-medium">Storefront</Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  const { overview, orders, customRequests, reviews, products, customers, support } = data;
  const statusRows = overview?.orders.statusDistribution ?? [];
  const totalOrderStatuses = statusRows.reduce((sum, entry) => sum + entry.count, 0);

  const summaryStats = [
    { label: "Paid orders", value: overview?.orders.paidOrderCount ?? "—", note: "In reporting period", icon: ShoppingBag },
    { label: "Paid-order GMV", value: overview ? adminMoney(overview.orders.paidOrderGMV) : "—", note: "Not net revenue", icon: ChartNoAxesColumnIncreasing },
    { label: "Customers", value: overview?.customers.total ?? "—", note: "All registered customer accounts", icon: UsersRound },
    { label: "New customers", value: overview?.customers.newInPeriod ?? "—", note: "During reporting period", icon: HeartHandshake },
    { label: "Pending reviews", value: overview?.marketing.pendingReviews ?? "—", note: "Awaiting moderation · all time", icon: Star },
    { label: "Active coupons", value: overview?.marketing.activeCoupons ?? "—", note: "Active marketing offers", icon: Tag },
    { label: "Subscribers", value: overview?.newsletter.activeSubscribers ?? "—", note: "Active newsletter subscribers", icon: BellRing },
    { label: "Average paid order", value: overview ? adminMoney(overview.orders.averagePaidOrderValue) : "—", note: "Paid orders in reporting period", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-[#FCF9F5] lg:pl-[266px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[266px] border-r border-[#EADFD8] bg-white lg:block">
        <AdminNavigation onNavigate={() => setMobileMenu(false)} role={role} />
      </aside>

      {mobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close admin navigation" className="absolute inset-0 bg-[#4A3B32]/30" onClick={() => setMobileMenu(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(85vw,290px)] overflow-y-auto bg-white shadow-xl">
            <div className="absolute right-3 top-3 z-10">
              <button type="button" aria-label="Close menu" onClick={() => setMobileMenu(false)} className="rounded-full bg-[#FCF9F5] p-2"><X size={18} /></button>
            </div>
            <AdminNavigation onNavigate={() => setMobileMenu(false)} role={role} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-[#EADFD8] bg-[#FCF9F5]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setMobileMenu(true)} className="rounded-xl border border-[#EADFD8] p-2.5 lg:hidden" aria-label="Open admin navigation" aria-expanded={mobileMenu}>
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-[#8A7B72]">Private studio workspace</p>
              <p className="mt-1 font-serif text-lg sm:text-xl">Operations overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full bg-[#E8F0E8] px-3 py-2 text-xs font-semibold text-[#557A61] sm:inline-flex">
              <ShieldCheck size={15} /> {displayStatus(role)}
            </span>
            <button type="button" onClick={() => void refresh()} disabled={refreshing} className="flex min-h-10 items-center gap-2 rounded-full border border-[#EADFD8] bg-white px-3 text-xs font-semibold disabled:opacity-50 sm:px-4">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={() => void logout()} disabled={signingOut} className="flex min-h-10 items-center gap-2 rounded-full bg-[#4A3B32] px-3 text-xs font-semibold text-white disabled:opacity-50 sm:px-4">
              <LogOut size={15} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-10 px-5 pb-20 pt-9 sm:px-8 lg:px-10">
        <section id="overview" className="scroll-mt-28">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#947E71]">Handmade business, beautifully managed</p>
              <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">Your studio, at a glance.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">Live operational information from your existing admin API. This foundation is read-only; management actions will follow in dedicated milestones.</p>
            </div>
            <Link href="/shop" className="inline-flex items-center gap-2 rounded-full border border-[#EADFD8] bg-white px-5 py-3 text-sm font-medium hover:bg-[#F7EBE8]">
              View storefront <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className={`${card} mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 bg-[#F7EBE8] px-6 py-4 text-xs text-[#6B5A50]`}>
            <span className="flex items-center gap-2 font-semibold"><ShieldCheck size={17} /> Administrator verified</span>
            <span>Reporting: {overview ? `${overview.period.from} – ${overview.period.to}` : "Unavailable"}</span>
            <span>Timezone: {overview?.period.timezone ?? "Asia/Dubai"}</span>
            <span>Data: live · no demo numbers</span>
          </div>
        </section>

        <section aria-labelledby="overview-cards">
          <h2 id="overview-cards" className="sr-only">Key performance indicators</h2>
          <SectionIssue message={issues.analytics} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryStats.map((metric) => <Metric key={metric.label} {...metric} />)}
          </div>
        </section>

        <section>
          <SectionHeading id="analytics" eyebrow="Business pulse" title="Order activity" detail="Order counts by current status, for orders placed during the reporting period." icon={ChartNoAxesColumnIncreasing} />
          <div className={`${card} mt-5 p-6 sm:p-8`}>
            {!overview ? <Note message="Analytics are temporarily unavailable. Retry to refresh the business overview." /> :
              statusRows.length === 0 ? <Note message="No orders were placed in the selected reporting period." /> : (
                <div className="grid gap-x-10 gap-y-4 lg:grid-cols-2">
                  {statusRows.map((row) => (
                    <div key={row.status}>
                      <div className="mb-2 flex justify-between gap-3 text-sm">
                        <span>{displayStatus(row.status)}</span><span className="font-semibold">{row.count}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#F6EEE5]">
                        <div className="h-full rounded-full bg-[#B99C8C]" style={{ width: `${Math.max(0, Math.min(100, (row.count / Math.max(1, totalOrderStatuses)) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            {overview && <p className="mt-6 border-t border-[#EADFD8] pt-4 text-xs leading-6 text-[#8A7B72]">{overview.orders.note}</p>}
          </div>
        </section>

        <section>
          <SectionHeading id="orders" eyebrow="Fulfilment" title="Recent orders" detail="Six most recently placed orders across all statuses. Read-only preview." icon={ShoppingBag} />
          <div className={`${card} mt-5 overflow-hidden p-5 sm:p-7`}>
            <SectionIssue message={issues.orders} />
            {!orders ? <Note message="Order data is currently unavailable." /> : orders.orders.length === 0 ? <Note message="No orders to display yet." /> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[670px] text-left text-sm">
                <thead className="border-b border-[#EADFD8] text-xs text-[#8A7B72]"><tr><th className="pb-4 font-medium">Order</th><th className="pb-4 font-medium">Customer</th><th className="pb-4 font-medium">Status</th><th className="pb-4 text-right font-medium">Total</th><th className="pb-4 text-right font-medium">Placed</th></tr></thead>
                <tbody>{orders.orders.map((order) => <tr key={order.id} className="border-b border-[#F4ECE7] last:border-0">
                  <td className="py-4 font-semibold">{order.orderNumber}</td>
                  <td className="max-w-[180px] truncate py-4 text-[#6B5A50]" title={order.customer?.email}>{order.customer?.name || order.customer?.email || "—"}</td>
                  <td className="py-4"><Pill value={order.status} /></td>
                  <td className="py-4 text-right font-medium">{adminMoney(order.amounts?.totalAmount)}</td>
                  <td className="py-4 text-right text-[#8A7B72]">{adminDate(order.placedAt)}</td>
                </tr>)}</tbody>
              </table></div>
            )}
            {orders && <p className="mt-5 text-xs text-[#8A7B72]">{orders.pagination.total} total orders · most recent 6 shown</p>}
          </div>
        </section>

        <div className="grid items-start gap-8 xl:grid-cols-2">
          <section>
            <SectionHeading id="custom-requests" eyebrow="Made especially" title="Custom requests" detail="Incoming crochet and bouquet quotation requests." icon={Sparkles} />
            <div className={`${card} mt-5 p-5 sm:p-7`}>
              <SectionIssue message={issues.customRequests} />
              {!customRequests ? <Note message="Custom requests could not be loaded." /> : customRequests.requests.length === 0 ? <Note message="No custom requests yet." /> : (
                <div className="divide-y divide-[#F4ECE7]">
                  {customRequests.requests.map((request) => <div key={request.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{request.title}</p><p className="mt-1 text-xs text-[#8A7B72]">{request.customerName || "Customer"} · {adminDate(request.createdAt)}</p></div>
                    <Pill value={request.status} />
                  </div>)}
                </div>
              )}
              {customRequests && <p className="mt-5 text-xs text-[#8A7B72]">{customRequests.pagination.total} total requests</p>}
            </div>
          </section>

          <section>
            <SectionHeading id="reviews" eyebrow="Community trust" title="Pending reviews" detail="Reviews awaiting publication or rejection." icon={Star} />
            <div className={`${card} mt-5 p-5 sm:p-7`}>
              <SectionIssue message={issues.reviews} />
              {!reviews ? <Note message="Review moderation data could not be loaded." /> : reviews.reviews.length === 0 ? <Note message="No reviews are awaiting moderation." /> : (
                <div className="divide-y divide-[#F4ECE7]">
                  {reviews.reviews.map((review) => <div key={review.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{review.title || review.product?.nameEn || "Customer review"}</p><p className="mt-1 text-xs text-[#8A7B72]">{review.product?.nameEn || "Product"} · {adminDate(review.createdAt)}</p></div>
                    <span className="shrink-0 rounded-full bg-[#F7EBE8] px-3 py-2 text-xs font-semibold">{review.rating} / 5 ★</span>
                  </div>)}
                </div>
              )}
              {reviews && <p className="mt-5 text-xs text-[#8A7B72]">{reviews.pagination.total} pending reviews</p>}
            </div>
          </section>
        </div>

        <div className="grid items-start gap-8 xl:grid-cols-2">
          <section>
            <SectionHeading id="products" eyebrow="Catalogue" title="Product inventory" detail="A snapshot of active, draft and archived product records." icon={Package} />
            <div className={`${card} mt-5 p-5 sm:p-7`}>
              <SectionIssue message={issues.products} />
              {!products ? <Note message="Product data could not be loaded." /> : products.products.length === 0 ? <Note message="No products have been added yet." /> : (
                <div className="divide-y divide-[#F4ECE7]">
                  {products.products.slice(0, 6).map((product) => <div key={product.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{product.nameEn}</p><p className="mt-1 text-xs text-[#8A7B72]">{adminMoney(product.basePrice)} · {displayStatus(product.fulfillmentType)}</p></div>
                    <Pill value={product.status} />
                  </div>)}
                </div>
              )}
              {products && <p className="mt-5 text-xs text-[#8A7B72]">{products.products.length} products · latest six displayed</p>}
            </div>
          </section>

          <section>
            <SectionHeading id="customers" eyebrow="Our community" title="Recent customers" detail="Newly registered customer profiles, visible to administrators only." icon={UsersRound} />
            <div className={`${card} mt-5 p-5 sm:p-7`}>
              <SectionIssue message={issues.customers} />
              {!customers ? <Note message="Customer data could not be loaded." /> : customers.customers.length === 0 ? <Note message="No customer accounts yet." /> : (
                <div className="divide-y divide-[#F4ECE7]">
                  {customers.customers.map((customer) => <div key={customer.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Customer"}</p><p className="mt-1 break-all text-xs text-[#8A7B72]">{customer.email} · {adminDate(customer.createdAt)}</p></div>
                    <Pill value={customer.status} />
                  </div>)}
                </div>
              )}
              {customers && <p className="mt-5 text-xs text-[#8A7B72]">{customers.pagination.total} customer accounts</p>}
            </div>
          </section>
        </div>

        <section>
          <SectionHeading id="support" eyebrow="Thoughtful service" title="Customer support" detail="Recent conversations from the secure admin support queue." icon={MessageCircle} />
          <div className={`${card} mt-5 p-5 sm:p-7`}>
            <SectionIssue message={issues.support} />
            {!support ? <Note message="The support queue is temporarily unavailable." /> : !Array.isArray(support.conversations) || support.conversations.length === 0 ? <Note message="No support conversations to display." /> : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {support.conversations.map((conversation) => <div key={conversation.id} className="rounded-2xl border border-[#EADFD8] bg-[#FCF9F5] p-4">
                  <p className="truncate text-sm font-semibold">{conversation.subject || `Conversation ${conversation.id.slice(0, 8)}`}</p>
                  <p className="mt-2 text-xs text-[#8A7B72]">Created {adminDate(conversation.createdAt)}</p>
                  <div className="mt-4"><Pill value={conversation.status} /></div>
                </div>)}
              </div>
            )}
            {support && <p className="mt-5 text-xs text-[#8A7B72]">{support.pagination?.total ?? "—"} support conversations</p>}
          </div>
        </section>

        <footer className="border-t border-[#EADFD8] pt-6 text-xs leading-6 text-[#8A7B72]">
          <p><strong className="font-medium text-[#6B5A50]">LOOP_N_LOOOM · Admin foundation</strong> — Read-only operational preview. All data requests are checked against the live, role-restricted Express admin API. No management actions are enabled in this milestone.</p>
          <p className="mt-2">Paid-order GMV is a reporting metric, not recognized net revenue. Dates use Asia/Dubai (UAE time). The dashboard uses live data and intentionally displays unavailable sections rather than fabricated values.</p>
          {gateMessage && <p role="alert" className="mt-3 text-[#A95757]">{gateMessage}</p>}
          <p className="sr-only">Admin sections: {ADMIN_SECTIONS.join(", ")}</p>
        </footer>
      </main>
    </div>
  );
}
