export interface CatalogMedia {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface CatalogVariant {
  id: string;
  name: string;
  color: string;
  size: string;
  price: number | null;
  stockQuantity: number;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  description: string;
  categoryName: string;
  categorySlug: string;
  availability: "Ready Stock" | "Made to Order";
  fulfillmentType: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  createdAt: string;
  media: CatalogMedia[];
  variants: CatalogVariant[];
  productionMinDays: number | null;
  productionMaxDays: number | null;
}

type DataRecord = Record<string, unknown>;

function record(value: unknown): DataRecord | null {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
    ? value as DataRecord
    : null;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return num(value);
}

export function safeImageUrl(value: string): string {
  try {
    const parsed = new URL(value);

    return parsed.protocol === "https:" ||
      parsed.protocol === "http:"
      ? parsed.href
      : "";
  } catch {
    return "";
  }
}

export function normalizeProduct(
  input: unknown,
): CatalogProduct | null {
  const root = record(input);

  if (!root) return null;

  const nested = record(root.product);
  const data = record(root.data);

  const product =
    nested ??
    record(data?.product) ??
    data ??
    root;

  const slug = str(product.slug);

  if (!slug) return null;

  const category = record(product.category);

  const name =
    str(product.nameEn) ||
    str(product.name) ||
    "Handmade creation";

  const rawMedia = Array.isArray(product.media)
    ? product.media
    : [];

  const media: CatalogMedia[] = rawMedia
    .map((entry): CatalogMedia | null => {
      const item = record(entry);
      if (!item) return null;

      const url = safeImageUrl(str(item.url));
      if (!url) return null;

      return {
        id: str(item.id),
        url,
        alt: str(item.altTextEn) || name,
        isPrimary: item.isPrimary === true,
        sortOrder: num(item.sortOrder),
      };
    })
    .filter(
      (item): item is CatalogMedia =>
        item !== null,
    )
    .sort(
      (a, b) =>
        Number(b.isPrimary) -
          Number(a.isPrimary) ||
        a.sortOrder - b.sortOrder,
    );

  const rawVariants = Array.isArray(product.variants)
    ? product.variants
    : [];

  const variants: CatalogVariant[] = rawVariants
    .map((entry): CatalogVariant | null => {
      const item = record(entry);

      if (!item || item.isActive === false) {
        return null;
      }

      const color = str(item.colorEn);
      const size = str(item.size);

      return {
        id: str(item.id),
        name:
          str(item.nameEn) ||
          [color, size].filter(Boolean).join(" / ") ||
          str(item.sku) ||
          "Standard",
        color,
        size,
        price: optionalNumber(item.price),
        stockQuantity: num(item.stockQuantity),
      };
    })
    .filter(
      (item): item is CatalogVariant =>
        item !== null,
    );

  const fulfillmentType =
    str(product.fulfillmentType);

  return {
    id: str(product.id),
    slug,
    name,
    price: num(
      product.basePrice ??
      product.price ??
      product.priceFrom,
    ),
    description:
      str(product.descriptionEn) ||
      str(product.description),
    categoryName:
      str(category?.nameEn) ||
      str(product.categoryName),
    categorySlug:
      str(category?.slug) ||
      str(product.categorySlug),
    availability:
      fulfillmentType === "READY_STOCK"
        ? "Ready Stock"
        : "Made to Order",
    fulfillmentType,
    isFeatured: product.isFeatured === true,
    isNewArrival: product.isNewArrival === true,
    createdAt: str(product.createdAt),
    media,
    variants,
    productionMinDays:
      optionalNumber(product.productionMinDays),
    productionMaxDays:
      optionalNumber(product.productionMaxDays),
  };
}

export function normalizeCatalog(
  input: unknown,
): CatalogProduct[] {
  let value: unknown = input;

  for (let depth = 0; depth < 4; depth++) {
    if (Array.isArray(value)) {
      return value
        .map(normalizeProduct)
        .filter(
          (product): product is CatalogProduct =>
            product !== null,
        );
    }

    const current = record(value);

    if (!current) break;

    const next =
      current.products ??
      current.items ??
      current.results ??
      current.data;

    if (next === undefined) break;

    value = next;
  }

  return [];
}