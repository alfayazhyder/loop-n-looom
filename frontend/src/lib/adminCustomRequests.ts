import { authenticatedRequest } from "@/lib/session";

export const ADMIN_CUSTOM_REQUESTS = "/api/admin/custom-requests";

export const REQUEST_STATUSES = [
  "SUBMITTED", "UNDER_REVIEW", "CHATTING", "QUOTE_SENT", "QUOTE_ACCEPTED",
  "QUOTE_REJECTED", "PAID", "CONVERTED_TO_ORDER", "REJECTED", "CANCELLED",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const MANAGED_STATUSES = ["UNDER_REVIEW", "CHATTING", "REJECTED", "CANCELLED"] as const;
export type ManagedStatus = (typeof MANAGED_STATUSES)[number];
export const CLOSED_STATUSES = new Set<string>(["REJECTED", "CANCELLED", "CONVERTED_TO_ORDER"]);
export const QUOTE_BLOCKED_STATUSES = new Set<string>(["QUOTE_ACCEPTED", "PAID", "CONVERTED_TO_ORDER", "REJECTED", "CANCELLED"]);
export const MANUALLY_EDITABLE_STATUSES = new Set<string>(["SUBMITTED", "UNDER_REVIEW", "CHATTING"]);

export interface AdminIdentity {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: string;
  status?: string;
}
export interface AdminRequestMedia {
  id: string;
  type: string;
  url: string;
  sortOrder: number;
  createdAt: string;
}
export interface AdminRequestMessage {
  id: string;
  senderType: string;
  message: string;
  attachmentUrl: string | null;
  createdAt: string;
  senderUser?: AdminIdentity | null;
}
export interface AdminQuote {
  id: string;
  version: number;
  status: string;
  amount: number | string;
  notes: string | null;
  validUntil: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  createdBy?: AdminIdentity | null;
}
export interface AdminCustomRequestRecord {
  id: string;
  userId: string | null;
  assignedAdminId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  title: string;
  description: string;
  status: RequestStatus;
  colors: string[];
  size: string | null;
  occasion: string | null;
  targetDate: string | null;
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  createdAt: string;
  updatedAt: string;
  assignedAdmin?: AdminIdentity | null;
  customer?: AdminIdentity | null;
  media: AdminRequestMedia[];
  messages?: AdminRequestMessage[];
  quotes?: AdminQuote[];
  order?: { id: string; orderNumber: string; status: string; totalAmount: number | string } | null;
  _count?: { messages: number; quotes: number };
}
export interface AdminCustomRequestListResponse {
  requests: AdminCustomRequestRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function adminLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildRequestQuery(filters: { page: number; search?: string; status?: string; assignedAdminId?: string }): string {
  const params = new URLSearchParams({ page: String(Math.max(1, Math.floor(filters.page))), limit: "12" });
  if (filters.search?.trim()) params.set("search", filters.search.trim().slice(0, 200));
  if (filters.status && REQUEST_STATUSES.some((status) => status === filters.status)) params.set("status", filters.status);
  if (filters.assignedAdminId) params.set("assignedAdminId", filters.assignedAdminId);
  return `${ADMIN_CUSTOM_REQUESTS}?${params.toString()}`;
}

export function validHttpsLink(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function quoteBody(amount: string, notes: string, expiryDate: string): { amount: number; notes?: string; validUntil?: string } {
  const normalized = amount.trim();
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Enter a valid AED price with at most two decimal places.");
  }
  const value = Number(normalized);
  if (!(value > 0 && value <= 9999999999.99)) throw new Error("Enter a quote amount greater than zero.");
  const trimmedNotes = notes.trim();
  if (trimmedNotes.length > 5000) throw new Error("Quote notes must contain no more than 5,000 characters.");
  const payload: { amount: number; notes?: string; validUntil?: string } = { amount: value };
  if (trimmedNotes) payload.notes = trimmedNotes;
  if (expiryDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) throw new Error("Choose a valid expiry date.");
    // End of the selected day in UAE time. Never imply a price or date was automatically calculated.
    const expiry = new Date(`${expiryDate}T23:59:59+04:00`);
    if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now() ||
        new Date(expiry.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10) !== expiryDate) {
      throw new Error("Quote expiry must be a valid future date in the UAE.");
    }
    payload.validUntil = expiry.toISOString();
  }
  return payload;
}

async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  return authenticatedRequest<T>(path, options);
}
async function adminPost<T>(path: string, method: "POST" | "PATCH", body: object): Promise<T> {
  return adminRequest<T>(path, { method, body: JSON.stringify(body) });
}

export function getAdminRequests(filters: Parameters<typeof buildRequestQuery>[0], signal?: AbortSignal): Promise<AdminCustomRequestListResponse> {
  return adminRequest<AdminCustomRequestListResponse>(buildRequestQuery(filters), { signal });
}
export async function getAdminRequest(id: string, signal?: AbortSignal): Promise<AdminCustomRequestRecord> {
  const response = await adminRequest<{ request: AdminCustomRequestRecord }>(`${ADMIN_CUSTOM_REQUESTS}/${encodeURIComponent(id)}`, { signal });
  if (!response.request?.id) throw new Error("Unexpected custom request detail response.");
  return response.request;
}
export function assignAdmin(id: string, adminId: string | null) {
  return adminPost(`${ADMIN_CUSTOM_REQUESTS}/${encodeURIComponent(id)}/assign`, "PATCH", { assignedAdminId: adminId });
}
export function updateRequestStatus(id: string, status: ManagedStatus) {
  return adminPost(`${ADMIN_CUSTOM_REQUESTS}/${encodeURIComponent(id)}/status`, "PATCH", { status });
}
export function sendAdminMessage(id: string, message: string, attachmentUrl?: string) {
  return adminPost(`${ADMIN_CUSTOM_REQUESTS}/${encodeURIComponent(id)}/messages`, "POST", {
    message: message.trim(), ...(attachmentUrl ? { attachmentUrl } : {}),
  });
}
export function createAdminQuote(id: string, body: ReturnType<typeof quoteBody>) {
  return adminPost(`${ADMIN_CUSTOM_REQUESTS}/${encodeURIComponent(id)}/quotes`, "POST", body);
}
export function sendAdminQuote(id: string, quoteId: string) {
  return adminPost(`${ADMIN_CUSTOM_REQUESTS}/${encodeURIComponent(id)}/quotes/${encodeURIComponent(quoteId)}/send`, "POST", {});
}
