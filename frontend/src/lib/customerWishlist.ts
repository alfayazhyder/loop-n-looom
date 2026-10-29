import { authenticatedRequest } from "@/lib/session";

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  notifyOnRestock: boolean;
  notifyOnPriceDrop: boolean;
  priceWhenAdded: number | string | null;
  product: unknown;
  wishlistMeta: {
    priceWhenAdded: number | null;
    currentPrice: number;
    priceChanged: boolean;
    priceDropped: boolean;
    availableStock: number;
  };
}

export interface WishlistResponse {
  items: WishlistItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const base = "/api/customer/wishlist";

export async function fetchWishlist(signal?: AbortSignal): Promise<WishlistItem[]> {
  const items: WishlistItem[] = [];
  // The server caps pages at 50 items. Avoid silently treating page one as a full wishlist.
  for (let page = 1; page <= 200; page++) {
    const response = await authenticatedRequest<WishlistResponse>(
      `${base}?page=${page}&limit=50`,
      { signal },
    );
    items.push(...response.items);
    if (page >= response.pagination.totalPages) return items;
  }
  throw new Error("Your wishlist is too large to load in one view. Please try again later.");
}

export function addWishlistItem(productId: string) {
  return authenticatedRequest<{ item: WishlistItem }>(
    `${base}/${encodeURIComponent(productId)}`,
    { method: "POST" },
  );
}

export function removeWishlistItem(productId: string) {
  return authenticatedRequest<{ message: string }>(
    `${base}/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
  );
}

export function updateWishlistAlerts(
  productId: string,
  changes: { notifyOnRestock?: boolean; notifyOnPriceDrop?: boolean },
) {
  return authenticatedRequest<{ item: WishlistItem }>(
    `${base}/${encodeURIComponent(productId)}`,
    { method: "PATCH", body: JSON.stringify(changes), headers: { "Content-Type": "application/json" } },
  );
}
