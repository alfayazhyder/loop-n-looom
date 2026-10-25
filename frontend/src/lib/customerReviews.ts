import { apiRequest } from "@/lib/api";
import { authenticatedRequest } from "@/lib/session";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ReviewSort = "newest" | "oldest" | "rating_high" | "rating_low";

export interface ReviewMedia {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  sortOrder: number;
  createdAt: string;
}

export interface ReviewPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  displayName: string;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
  media: ReviewMedia[];
}

export interface PublicReviewsResult {
  product: { id: string; slug: string; nameEn: string; nameAr: string | null };
  summary: {
    averageRating: number | null;
    totalReviews: number;
    ratingDistribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  };
  reviews: PublicReview[];
  pagination: ReviewPagination;
  filters: { rating: number | null; sort: ReviewSort };
}

export interface MyReview extends Omit<PublicReview, "displayName"> {
  displayName: string | null;
  status: ReviewStatus;
  product: { id: string; slug: string; nameEn: string; nameAr: string | null };
  orderItem: {
    id: string;
    itemType: string;
    productName: string;
    variantName: string | null;
    order: { id: string; orderNumber: string; status: string; deliveredAt: string | null };
  } | null;
}

export interface MyReviewsResult {
  reviews: MyReview[];
  pagination: ReviewPagination;
  filters: { status: ReviewStatus | null };
}

export interface ReviewFormValues {
  rating: number;
  title: string | null;
  content: string | null;
  displayName: string | null;
}

export function readPublicReviews(
  slug: string,
  options: { page: number; rating: number | null; sort: ReviewSort },
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(options.page), pageSize: "5", sort: options.sort });
  if (options.rating !== null) params.set("rating", String(options.rating));
  return apiRequest<PublicReviewsResult>(
    `/api/products/${encodeURIComponent(slug)}/reviews?${params.toString()}`,
    { signal },
  );
}

export function readMyReviews(page: number, status: ReviewStatus | "", signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (status) params.set("status", status);
  return authenticatedRequest<MyReviewsResult>(`/api/customer/reviews?${params.toString()}`, { signal });
}

export function writeReview<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  data?: unknown,
) {
  return authenticatedRequest<T>(path, {
    method,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}

export function reviewDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-AE", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dubai",
  });
}

export function reviewMediaUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
