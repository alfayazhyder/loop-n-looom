import { authenticatedRequest } from "@/lib/session";

export interface AdminAccess {
  message: string;
  user: {
    id: string;
    role: "ADMIN" | "SUPER_ADMIN";
  };
}

export interface AnalyticsOverview {
  period: {
    from: string;
    to: string;
    timezone: string;
  };
  customers: {
    total: number;
    newInPeriod: number;
  };
  newsletter: {
    activeSubscribers: number;
  };
  marketing: {
    activeCoupons: number;
    pendingReviews: number;
  };
  orders: {
    paidOrderCount: number;
    paidOrderGMV: string;
    averagePaidOrderValue: string;
    currency: string;
    statusDistribution: Array<{
      status: string;
      count: number;
    }>;
    note: string;
  };
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  currency: string;
  customer: {
    name: string;
    email: string;
  };
  amounts: {
    totalAmount: number;
  };
  placedAt: string;
}

export interface AdminCustomRequest {
  id: string;
  title: string;
  customerName: string;
  status: string;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  status: string;
  createdAt: string;
  product: {
    nameEn: string;
  };
}

export interface AdminProduct {
  id: string;
  nameEn: string;
  slug: string;
  status: string;
  basePrice: number | string;
  fulfillmentType: string;
}

export interface AdminCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  createdAt: string;
}

export interface AdminSupportConversation {
  id: string;
  status: string;
  subject?: string | null;
  createdAt: string;
}

export interface AdminList<T> {
  pagination: {
    total: number;
  };
  items: T[];
}

export type AdminSection =
  | "analytics"
  | "orders"
  | "customRequests"
  | "reviews"
  | "products"
  | "customers"
  | "support";

export interface AdminDashboardData {
  overview: AnalyticsOverview | null;
  orders: { orders: AdminOrder[]; pagination: { total: number } } | null;
  customRequests: { requests: AdminCustomRequest[]; pagination: { total: number } } | null;
  reviews: { reviews: AdminReview[]; pagination: { total: number } } | null;
  products: { products: AdminProduct[] } | null;
  customers: { customers: AdminCustomer[]; pagination: { total: number } } | null;
  support: { conversations: AdminSupportConversation[]; pagination: { total: number } } | null;
}

export type AdminDashboardErrors = Partial<Record<AdminSection, string>>;

export const ADMIN_SECTIONS = [
  "analytics",
  "orders",
  "customRequests",
  "reviews",
  "products",
  "customers",
  "support",
] as const;

export async function assertAdminAccess(): Promise<AdminAccess> {
  const response = await authenticatedRequest<AdminAccess>(
    "/api/admin/access-check",
  );

  if (
    response.user?.role !== "ADMIN" &&
    response.user?.role !== "SUPER_ADMIN"
  ) {
    throw new Error("Administrator permissions are required.");
  }

  return response;
}

// Every call remains protected by Express requireAuth + requireAdmin.
// This is a read-only foundation; it never performs an admin mutation.
export async function fetchAdminDashboard() {
  const results = await Promise.allSettled([
    authenticatedRequest<AnalyticsOverview>("/api/admin/analytics/overview"),
    authenticatedRequest<NonNullable<AdminDashboardData["orders"]>>(
      "/api/admin/orders?page=1&limit=6",
    ),
    authenticatedRequest<NonNullable<AdminDashboardData["customRequests"]>>(
      "/api/admin/custom-requests?page=1&limit=6",
    ),
    authenticatedRequest<NonNullable<AdminDashboardData["reviews"]>>(
      "/api/admin/reviews?page=1&limit=6&status=PENDING",
    ),
    authenticatedRequest<NonNullable<AdminDashboardData["products"]>>(
      "/api/admin/products",
    ),
    authenticatedRequest<NonNullable<AdminDashboardData["customers"]>>(
      "/api/admin/customers?page=1&limit=6",
    ),
    authenticatedRequest<NonNullable<AdminDashboardData["support"]>>(
      "/api/admin/support-conversations?page=1&limit=6",
    ),
  ] as const);

  const value = <T,>(result: PromiseSettledResult<T>): T | null =>
    result.status === "fulfilled" ? result.value : null;

  const error = (result: PromiseSettledResult<unknown>): string | undefined =>
    result.status === "rejected"
      ? result.reason instanceof Error
        ? result.reason.message
        : "Unable to load this section."
      : undefined;

  const [analytics, orders, customRequests, reviews, products, customers, support] =
    results;

  const data: AdminDashboardData = {
    overview: value(analytics),
    orders: value(orders),
    customRequests: value(customRequests),
    reviews: value(reviews),
    products: value(products),
    customers: value(customers),
    support: value(support),
  };

  const errors: AdminDashboardErrors = {
    analytics: error(analytics),
    orders: error(orders),
    customRequests: error(customRequests),
    reviews: error(reviews),
    products: error(products),
    customers: error(customers),
    support: error(support),
  };

  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason);

  return { data, errors, failures };
}

export function adminMoney(amount: number | string | null | undefined) {
  const parsed = Number(amount ?? 0);
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

export function adminDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dubai",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

export function displayStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
