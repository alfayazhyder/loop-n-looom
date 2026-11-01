import { authenticatedRequest } from "@/lib/session";

export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type Period = { from: string; to: string; timezone: string };
export type Overview = {
  period: Period;
  customers: { total: number; newInPeriod: number };
  newsletter: { activeSubscribers: number };
  marketing: { activeCoupons: number; pendingReviews: number };
  orders: {
    paidOrderCount: number; paidOrderGMV: string; averagePaidOrderValue: string;
    currency: string; statusDistribution: Array<{ status: string; count: number }>;
    note: string;
  };
};
export type CouponType = "PERCENTAGE" | "FIXED_AMOUNT";
export type Coupon = {
  id: string; code: string; description: string | null; type: CouponType;
  discountValue: string; minimumOrderAmount: string | null; maximumDiscountAmount: string | null;
  usageLimit: number | null; usageLimitPerUser: number | null; startsAt: string | null;
  endsAt: string | null; isActive: boolean; createdAt: string;
  _count: { redemptions: number };
};
export type CouponInput = {
  code: string; description: string | null; type: CouponType; discountValue: number;
  minimumOrderAmount: number | null; maximumDiscountAmount: number | null;
  usageLimit: number | null; usageLimitPerUser: number | null;
  startsAt: string | null; endsAt: string | null; isActive: boolean;
};
export type Subscriber = {
  id: string; userId: string | null; email: string; preferredLocale: string | null;
  isActive: boolean; consentAt: string | null; unsubscribedAt: string | null; createdAt: string;
};
export type OrdersReport = {
  period: Period; currency: string;
  totals: { orderCount: number; allOrderValue: string; note: string };
  orders: Array<{
    id: string; orderNumber: string; status: string; currency: string;
    subtotal: string; discountAmount: string; totalAmount: string;
    placedAt: string; paidAt: string | null; deliveredAt: string | null;
  }>;
  pagination: Pagination;
};
export type ProductsReport = {
  period: Period; currency: string; note: string;
  products: Array<{
    productId: string | null;
    product: { id: string; slug: string; nameEn: string; status: string } | null;
    orderItemCount: number; unitsSold: number; itemValue: string;
  }>;
};
export type CouponsReport = {
  period: Period; currency: string;
  coupons: Array<{
    couponId: string;
    coupon: { id: string; code: string; type: string; isActive: boolean } | null;
    redemptions: number; discountAmount: string;
  }>;
};

const prefix = "/api/admin";
function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.toString();
}
function write<T>(path: string, method: "POST" | "PATCH", data: unknown) {
  return authenticatedRequest<T>(`${prefix}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
export function listCoupons(params: { page: number; search?: string; active?: string }) {
  return authenticatedRequest<{ coupons: Coupon[]; pagination: Pagination }>(
    `${prefix}/coupons?${queryString({ ...params, limit: 20 })}`,
  );
}
export async function getCoupon(id: string) {
  const result = await authenticatedRequest<{ coupon: Coupon }>(`${prefix}/coupons/${encodeURIComponent(id)}`);
  return result.coupon;
}
export async function createCoupon(data: CouponInput) {
  const result = await write<{ coupon: Coupon }>("/coupons", "POST", data);
  return result.coupon;
}
export async function updateCoupon(id: string, data: Partial<CouponInput>) {
  const result = await write<{ coupon: Coupon }>(`/coupons/${encodeURIComponent(id)}`, "PATCH", data);
  return result.coupon;
}
export function listSubscribers(params: { page: number; search?: string; active?: string }) {
  return authenticatedRequest<{ subscribers: Subscriber[]; pagination: Pagination }>(
    `${prefix}/newsletter-subscribers?${queryString({ ...params, limit: 20 })}`,
  );
}
export function unsubscribe(id: string) {
  return write<{ subscriber: Subscriber }>(`/newsletter-subscribers/${encodeURIComponent(id)}/unsubscribe`, "PATCH", { isActive: false });
}
export type DateQuery = { from?: string; to?: string; page?: number };
export function overview(params: DateQuery) {
  return authenticatedRequest<Overview>(`${prefix}/analytics/overview?${queryString(params)}`);
}
export function ordersReport(params: DateQuery) {
  return authenticatedRequest<OrdersReport>(`${prefix}/reports/orders?${queryString({ ...params, limit: 20 })}`);
}
export function productsReport(params: DateQuery) {
  return authenticatedRequest<ProductsReport>(`${prefix}/reports/products?${queryString(params)}`);
}
export function couponsReport(params: DateQuery) {
  return authenticatedRequest<CouponsReport>(`${prefix}/reports/coupons?${queryString(params)}`);
}

export function uaeDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai", year: "numeric", month: "short", day: "2-digit",
  }).format(date);
}
export function aed(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? new Intl.NumberFormat("en-AE", {
    style: "currency", currency: "AED",
  }).format(number) : "—";
}
export function display(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
// CSV export is limited to the explicitly loaded report page and contains no customer contacts.
// Prefix possible spreadsheet formulas to prevent CSV formula execution in Excel-like apps.
export function exportCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const safe = (value: string | number | null | undefined) => {
    let content = String(value ?? "");
    if (/^[\s]*[=+\-@]/.test(content)) content = `'${content}`;
    return `"${content.replaceAll('"', '""')}"`;
  };
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(safe).join(",")).join("\r\n")}\r\n`;
  const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
