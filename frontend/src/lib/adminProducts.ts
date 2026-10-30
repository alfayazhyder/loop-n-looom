import { authenticatedRequest } from "@/lib/session";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type FulfillmentType = "READY_STOCK" | "MADE_TO_ORDER";
export type DeliveryScope = "UAE_WIDE" | "ABU_DHABI_ONLY";

export interface Category { id: string; nameEn: string; slug: string; }
export interface Occasion { id: string; nameEn: string; slug: string; }
export interface ProductPhoto {
  id: string; url: string; altTextEn: string | null; altTextAr: string | null;
  isPrimary: boolean; sortOrder: number; publicId: string | null;
}
export interface Variant {
  id: string; sku: string; nameEn: string | null; colorEn: string | null;
  size: string | null; price: number | string | null; compareAtPrice: number | string | null;
  stockQuantity: number; isActive: boolean;
}
export interface Product {
  id: string; nameEn: string; nameAr: string | null; slug: string;
  descriptionEn: string | null; descriptionAr: string | null;
  basePrice: number | string; categoryId: string; category: Category;
  status: ProductStatus; fulfillmentType: FulfillmentType; deliveryScope: DeliveryScope;
  productionMinDays: number | null; productionMaxDays: number | null;
  isFeatured: boolean; isNewArrival: boolean; isGiftWrappable: boolean;
  media: ProductPhoto[]; variants: Variant[];
  occasionLinks: Array<{ occasionId: string; occasion: Occasion }>;
}
export interface ProductForm {
  categoryId: string; nameEn: string; nameAr: string; slug: string;
  descriptionEn: string; descriptionAr: string; basePrice: string;
  status: ProductStatus; fulfillmentType: FulfillmentType; deliveryScope: DeliveryScope;
  productionMinDays: string; productionMaxDays: string;
  isFeatured: boolean; isNewArrival: boolean; isGiftWrappable: boolean;
}
export interface VariantForm {
  sku: string; nameEn: string; colorEn: string; size: string; price: string;
  compareAtPrice: string; stockQuantity: string; isActive: boolean;
}
export const blankProduct: ProductForm = {
  categoryId: "", nameEn: "", nameAr: "", slug: "", descriptionEn: "", descriptionAr: "",
  basePrice: "", status: "DRAFT", fulfillmentType: "READY_STOCK", deliveryScope: "UAE_WIDE",
  productionMinDays: "", productionMaxDays: "", isFeatured: false, isNewArrival: false, isGiftWrappable: true,
};
export const blankVariant: VariantForm = {
  sku: "", nameEn: "", colorEn: "", size: "", price: "", compareAtPrice: "", stockQuantity: "0", isActive: true,
};
export function toProductForm(product: Product): ProductForm {
  return {
    categoryId: product.categoryId, nameEn: product.nameEn, nameAr: product.nameAr ?? "", slug: product.slug,
    descriptionEn: product.descriptionEn ?? "", descriptionAr: product.descriptionAr ?? "",
    basePrice: String(product.basePrice), status: product.status, fulfillmentType: product.fulfillmentType,
    deliveryScope: product.deliveryScope, productionMinDays: product.productionMinDays?.toString() ?? "",
    productionMaxDays: product.productionMaxDays?.toString() ?? "", isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival, isGiftWrappable: product.isGiftWrappable,
  };
}
export function toVariantForm(variant: Variant): VariantForm {
  return {
    sku: variant.sku, nameEn: variant.nameEn ?? "", colorEn: variant.colorEn ?? "", size: variant.size ?? "",
    price: variant.price == null ? "" : String(variant.price),
    compareAtPrice: variant.compareAtPrice == null ? "" : String(variant.compareAtPrice),
    stockQuantity: String(variant.stockQuantity), isActive: variant.isActive,
  };
}
export function productPayload(form: ProductForm) {
  const price = Number(form.basePrice);
  if (!form.nameEn.trim() || !form.categoryId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) ||
      !Number.isFinite(price) || price <= 0) {
    throw new Error("Enter a name, category, valid lowercase slug and positive AED price.");
  }
  const min = form.productionMinDays === "" ? undefined : Number(form.productionMinDays);
  const max = form.productionMaxDays === "" ? undefined : Number(form.productionMaxDays);
  if ([min, max].some(value => value !== undefined && (!Number.isInteger(value) || value < 0 || value > 365)) ||
      (min !== undefined && max !== undefined && min > max)) throw new Error("Check the production day range.");
  return {
    ...form, categoryId: form.categoryId, nameEn: form.nameEn.trim(), slug: form.slug.trim(),
    basePrice: price, productionMinDays: min, productionMaxDays: max,
  };
}
export function variantPayload(form: VariantForm, creating: boolean) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(form.sku)) throw new Error("SKU may contain letters, numbers, - and _ only.");
  const price = form.price.trim() === "" ? undefined : Number(form.price);
  const compareAtPrice = form.compareAtPrice.trim() === "" ? undefined : Number(form.compareAtPrice);
  if ([price, compareAtPrice].some(v => v !== undefined && (!Number.isFinite(v) || v < 0)) ||
      (price !== undefined && compareAtPrice !== undefined && compareAtPrice < price)) throw new Error("Check variant prices.");
  const stock = Number(form.stockQuantity);
  if (creating && (!Number.isInteger(stock) || stock < 0)) throw new Error("Initial stock must be a nonnegative whole number.");
  return {
    sku: form.sku.trim(), nameEn: form.nameEn.trim(), colorEn: form.colorEn.trim(), size: form.size.trim(),
    ...(price !== undefined ? { price } : {}), ...(compareAtPrice !== undefined ? { compareAtPrice } : {}),
    ...(creating ? { stockQuantity: stock } : {}), isActive: form.isActive,
  };
}
export function adminJson<T>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", data?: unknown): Promise<T> {
  return authenticatedRequest<T>(path, {
    method, ...(data === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
  });
}
export async function listProducts(): Promise<Product[]> {
  const data = await authenticatedRequest<{ products: Product[] }>("/api/admin/products");
  return data.products;
}
export async function getProduct(id: string): Promise<Product> {
  const data = await authenticatedRequest<{ product: Product }>(`/api/admin/products/${id}`);
  return data.product;
}
export async function getTaxonomies() {
  const [categories, occasions] = await Promise.all([
    authenticatedRequest<{ categories: Category[] }>("/api/catalog/categories"),
    authenticatedRequest<{ occasions: Occasion[] }>("/api/catalog/occasions"),
  ]);
  return { categories: categories.categories, occasions: occasions.occasions };
}
export async function uploadPhoto(productId: string, file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024 || file.size === 0) {
    throw new Error("Select a JPEG, PNG or WebP image under 8 MB.");
  }
  return authenticatedRequest<{ photo: ProductPhoto }>(`/api/admin/products/${productId}/media`, {
    method: "POST", headers: { "Content-Type": file.type }, body: file,
  });
}
