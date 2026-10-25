export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  description: string;
  categoryName: string;
  categorySlug: string;
  availability: "Ready Stock" | "Made to Order";
  isFeatured: boolean;
  isNewArrival: boolean;
  createdAt: string;
}

type RecordValue = Record<string, unknown>;

function record(
  value: unknown,
): RecordValue | null {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as RecordValue;
  }

  return null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function amount(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export function normalizeProduct(
  input: unknown,
): CatalogProduct | null {
  const root = record(input);

  if (!root) return null;

  const nested =
    record(root.product) ??
    record(root.data)?.product;

  const product =
    record(nested) ??
    root;

  const slug = stringValue(product.slug);

  if (!slug) return null;

  const category = record(product.category);

  const fulfillmentType =
    stringValue(product.fulfillmentType);

  return {
    id: stringValue(product.id),
    slug,

    name:
      stringValue(product.nameEn) ||
      stringValue(product.name) ||
      "Handmade creation",

    price: amount(
      product.basePrice ??
      product.price ??
      product.priceFrom,
    ),

    description:
      stringValue(product.descriptionEn) ||
      stringValue(product.description),

    categoryName:
      stringValue(category?.nameEn) ||
      stringValue(product.categoryName),

    categorySlug:
      stringValue(category?.slug) ||
      stringValue(product.categorySlug),

    availability:
      fulfillmentType === "READY_STOCK"
        ? "Ready Stock"
        : "Made to Order",

    isFeatured: product.isFeatured === true,
    isNewArrival: product.isNewArrival === true,

    createdAt:
      stringValue(product.createdAt),
  };
}

export function normalizeCatalog(
  input: unknown,
): CatalogProduct[] {
  let value: unknown = input;

  for (let level = 0; level < 4; level++) {
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