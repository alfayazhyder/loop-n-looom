import { z } from "zod";

const fulfillmentTypeSchema = z.enum([
  "READY_STOCK",
  "MADE_TO_ORDER",
]);

const deliveryScopeSchema = z.enum([
  "UAE_WIDE",
  "ABU_DHABI_ONLY",
]);

const productSortSchema = z.enum([
  "newest",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
]);

const booleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

export const productListQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional(),

    category: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional(),

    color: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .optional(),

    occasion: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .optional(),

    minPrice: z.coerce
      .number()
      .nonnegative()
      .optional(),

    maxPrice: z.coerce
      .number()
      .nonnegative()
      .optional(),

    fulfillmentType:
      fulfillmentTypeSchema.optional(),

    deliveryScope:
      deliveryScopeSchema.optional(),

    featured:
      booleanQuerySchema.optional(),

    newArrival:
      booleanQuerySchema.optional(),

    sort: productSortSchema.default("newest"),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(48)
      .default(12),
  })
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    {
      message:
        "Minimum price cannot be greater than maximum price.",
      path: ["minPrice"],
    },
  );

export const productSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, "Product slug is required")
    .max(200),
});

export type ProductListQuery = z.infer<
  typeof productListQuerySchema
>;

export type ProductSlugParams = z.infer<
  typeof productSlugParamSchema
>;