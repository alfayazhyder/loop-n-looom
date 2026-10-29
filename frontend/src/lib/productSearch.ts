/** Public, shareable search filters mapped to the existing product catalogue API. */
export interface ProductSearchFilters {
  q: string;
  category: string;
  occasion: string;
  color: string;
  minPrice: string;
  maxPrice: string;
  fulfillmentType: "" | "READY_STOCK" | "MADE_TO_ORDER";
  sort: "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc";
}

export type SearchParamsInput = Record<string, string | string[] | undefined>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
}

function safeSlug(raw: string): string {
  const value = raw.toLowerCase().trim();
  return value.length <= 100 && slugPattern.test(value) ? value : "";
}

function priceFilter(raw: string): string {
  const value = raw.trim();
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value)) return "";
  const amount = Number(value);
  return Number.isFinite(amount) && amount <= 9999999 ? String(amount) : "";
}

export function parseProductSearch(params: SearchParamsInput): ProductSearchFilters {
  const fulfillmentType = first(params.fulfillmentType);
  const sort = first(params.sort);
  return {
    q: first(params.q).trim().slice(0, 120),
    category: safeSlug(first(params.category)),
    occasion: safeSlug(first(params.occasion)),
    color: first(params.color).trim().slice(0, 60),
    minPrice: priceFilter(first(params.minPrice)),
    maxPrice: priceFilter(first(params.maxPrice)),
    fulfillmentType:
      fulfillmentType === "READY_STOCK" || fulfillmentType === "MADE_TO_ORDER"
        ? fulfillmentType
        : "",
    sort:
      sort === "price_asc" || sort === "price_desc" ||
      sort === "name_asc" || sort === "name_desc"
        ? sort
        : "newest",
  };
}

export function productSearchApiPath(filters: ProductSearchFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), limit: "24", sort: filters.sort });
  if (filters.q) params.set("search", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.occasion) params.set("occasion", filters.occasion);
  if (filters.color) params.set("color", filters.color);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.fulfillmentType) params.set("fulfillmentType", filters.fulfillmentType);
  return `/api/products?${params.toString()}`;
}

export function productSearchKey(filters: ProductSearchFilters): string {
  return JSON.stringify(filters);
}
