export interface CrochetRequestForm {
  title: string;
  description: string;
  colors: string[];
  size?: string;
  occasion?: string;
  targetDate?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export interface CustomRequestMessage {
  id: string;
  message: string;
  senderType?: string | null;
  senderUser?: { firstName?: string | null; lastName?: string | null } | null;
  createdAt: string;
}

export interface CustomQuote {
  id: string;
  amount: number | string;
  currency?: string;
  status: string;
  productionDays?: number | null;
  notes?: string | null;
  validUntil?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface CrochetRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  colors?: string[] | null;
  size?: string | null;
  occasion?: string | null;
  targetDate?: string | null;
  budgetMin?: number | string | null;
  budgetMax?: number | string | null;
  createdAt: string;
  updatedAt?: string;
  messages?: CustomRequestMessage[];
  quotes?: CustomQuote[];
  media?: Array<{ id: string; url: string; altText?: string | null }>;
}

export interface CrochetRequestsResponse {
  requests: CrochetRequest[];
  pagination?: { page: number; totalPages: number; total?: number };
}

export function normalizeRequest(value: CrochetRequest | { request: CrochetRequest }): CrochetRequest {
  return 'request' in value ? value.request : value;
}

export function friendlyStatus(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

export function money(value: number | string, currency = 'AED'): string {
  const amount = Number(value);
  return `${currency} ${Number.isFinite(amount) ? amount.toFixed(2) : '—'}`;
}

export function dateLabel(value?: string | null): string {
  if (!value) return 'Not specified';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not specified' : date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const requestBase = '/api/customer/custom-requests';
export const closedRequestStatuses = new Set(['REJECTED', 'CANCELLED', 'CONVERTED_TO_ORDER']);
