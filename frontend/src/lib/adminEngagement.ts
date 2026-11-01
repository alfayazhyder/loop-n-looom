import { authenticatedRequest } from "@/lib/session";

export type CustomerStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type SupportStatus = "OPEN" | "CLOSED";
export type PageInfo = { page: number; limit: number; total: number; totalPages: number };

export type Customer = {
  id: string; email: string; firstName: string | null; lastName: string | null;
  phone: string | null; status: CustomerStatus; preferredLocale: string | null;
  emailVerifiedAt: string | null; lastLoginAt: string | null; createdAt: string;
  _count: { orders: number; reviews: number; addresses: number };
};
export type CustomerDetail = Customer & {
  storeCreditBalance: string; updatedAt: string;
  orders: Array<{ id: string; orderNumber: string; status: string; totalAmount: number | string; currency: string; placedAt: string }>;
  reviews: Array<{ id: string; rating: number; status: ReviewStatus; createdAt: string; product: { id: string; nameEn: string } }>;
};

export type Contact = { id: string; firstName: string | null; lastName: string | null; email?: string; phone?: string | null };
export type SupportConversation = {
  id: string; status: SupportStatus; subject: string | null; guestName: string | null;
  guestEmail: string | null; lastMessageAt: string | null; createdAt: string;
  customer: Contact | null; assignedAdminId: string | null; assignedAdmin: Contact | null;
  order: { id: string; orderNumber: string; status: string; totalAmount?: string | number } | null;
  messages?: Array<{ id: string; body: string; createdAt: string; senderType: string }>;
};
export type SupportMessage = {
  id: string; senderType: string; body: string; attachmentUrl: string | null;
  createdAt: string; senderUser: (Contact & { role: string }) | null;
};
export type ConversationDetail = {
  conversation: SupportConversation; messages: SupportMessage[]; messagePagination: PageInfo;
};

export type Review = {
  id: string; status: ReviewStatus; rating: number; title: string | null;
  content: string | null; displayName: string | null; verifiedPurchase: boolean;
  createdAt: string; updatedAt: string;
  user: Contact | null; product: { id: string; slug: string; nameEn: string; nameAr?: string | null };
  _count?: { media: number };
  media?: Array<{ id: string; url: string; type: string; thumbnailUrl?: string | null; altText?: string | null; caption?: string | null }>;
};

function qp(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== "" && value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}
const admin = "/api/admin";
const idPath = (id: string) => encodeURIComponent(id);
export async function adminWrite<T>(path: string, method: "POST" | "PATCH", body: unknown): Promise<T> {
  return authenticatedRequest<T>(path, {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

export function listCustomers(query: { page: number; status?: string; search?: string }) {
  return authenticatedRequest<{ customers: Customer[]; pagination: PageInfo }>(`${admin}/customers?${qp({ ...query, limit: 15 })}`);
}
export async function getCustomer(id: string) {
  const result = await authenticatedRequest<{ customer: CustomerDetail }>(`${admin}/customers/${idPath(id)}`);
  return result.customer;
}
export async function setCustomerStatus(id: string, status: CustomerStatus) {
  const result = await adminWrite<{ customer: CustomerDetail }>(`${admin}/customers/${idPath(id)}/status`, "PATCH", { status });
  return result.customer;
}

export function listSupport(query: { page: number; status?: string; search?: string }) {
  return authenticatedRequest<{ conversations: SupportConversation[]; pagination: PageInfo }>(`${admin}/support-conversations?${qp({ ...query, limit: 15 })}`);
}
export function getSupport(id: string, page = 1) {
  return authenticatedRequest<ConversationDetail>(`${admin}/support-conversations/${idPath(id)}?${qp({ page, limit: 30 })}`);
}
export function setSupportStatus(id: string, status: SupportStatus) {
  return adminWrite(`${admin}/support-conversations/${idPath(id)}/status`, "PATCH", { status });
}
export function assignSupport(id: string, assignedAdminId: string | null) {
  return adminWrite(`${admin}/support-conversations/${idPath(id)}/assign`, "PATCH", { assignedAdminId });
}
export function sendSupportReply(id: string, message: string, attachmentUrl?: string) {
  return adminWrite(`${admin}/support-conversations/${idPath(id)}/messages`, "POST", {
    message, ...(attachmentUrl ? { attachmentUrl } : {}),
  });
}

export function listReviews(query: { page: number; status?: string; search?: string; rating?: number }) {
  return authenticatedRequest<{ reviews: Review[]; pagination: PageInfo }>(`${admin}/reviews?${qp({ ...query, limit: 15 })}`);
}
export async function getReview(id: string) {
  const result = await authenticatedRequest<{ review: Review }>(`${admin}/reviews/${idPath(id)}`);
  return result.review;
}
export async function setReviewStatus(id: string, status: ReviewStatus) {
  const result = await adminWrite<{ review: Review }>(`${admin}/reviews/${idPath(id)}/moderation`, "PATCH", { status });
  return result.review;
}

export function nameOf(person: { firstName: string | null; lastName: string | null; email?: string } | null | undefined) {
  if (!person) return "Guest";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email || "Customer";
}
export function dateAE(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(date);
}
export function moneyAE(value: number | string | null | undefined) {
  const valueNumber = Number(value ?? 0);
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(Number.isFinite(valueNumber) ? valueNumber : 0);
}
export function safeHttps(url: string | null | undefined) {
  if (!url) return false;
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}

export type NotificationEvent = {
  id: string; channel: "EMAIL" | "WHATSAPP"; templateKey: string;
  subject: string | null; status: "QUEUED" | "SENT" | "FAILED";
  createdAt: string; sentAt: string | null;
};
export function listNotifications(query: { page: number; status?: string; channel?: string }) {
  return authenticatedRequest<{ notifications: NotificationEvent[]; pagination: PageInfo; note: string }>(
    `${admin}/notifications?${qp(query)}`,
  );
}
