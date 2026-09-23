import { z } from "zod";

const productStatusSchema = z.enum([
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
]);

const fulfillmentTypeSchema = z.enum([
  "READY_STOCK",
  "MADE_TO_ORDER",
]);

const deliveryScopeSchema = z.enum([
  "UAE_WIDE",
  "ABU_DHABI_ONLY",
]);

const productFieldsSchema = z.object({
  categoryId: z
    .string()
    .uuid("Enter a valid category ID"),

  nameEn: z
    .string()
    .trim()
    .min(1, "English product name is required")
    .max(160),

  nameAr: z
    .string()
    .trim()
    .max(160)
    .optional(),

  slug: z
    .string()
    .trim()
    .min(1, "Product slug is required")
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),

  descriptionEn: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  descriptionAr: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  basePrice: z.coerce
    .number()
    .positive("Base price must be greater than 0"),

  status: productStatusSchema,

  fulfillmentType: fulfillmentTypeSchema,

  deliveryScope: deliveryScopeSchema,

  productionMinDays: z.coerce
    .number()
    .int()
    .min(0)
    .max(365)
    .optional(),

  productionMaxDays: z.coerce
    .number()
    .int()
    .min(0)
    .max(365)
    .optional(),

  isFeatured: z.boolean(),

  isNewArrival: z.boolean(),

  isGiftWrappable: z.boolean(),
});

const createProductFieldsSchema =
  productFieldsSchema.extend({
    status: productStatusSchema.default("DRAFT"),

    deliveryScope:
      deliveryScopeSchema.default("UAE_WIDE"),

    isFeatured: z.boolean().default(false),

    isNewArrival: z.boolean().default(false),

    isGiftWrappable: z.boolean().default(true),
  });

export const createAdminProductSchema =
  createProductFieldsSchema.superRefine(
    (data, ctx) => {
      if (
        data.productionMinDays !== undefined &&
        data.productionMaxDays !== undefined &&
        data.productionMinDays >
          data.productionMaxDays
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["productionMinDays"],
          message:
            "Minimum production days cannot exceed maximum production days.",
        });
      }
    },
  );

export const updateAdminProductSchema =
  productFieldsSchema
    .partial()
    .superRefine((data, ctx) => {
      if (
        data.productionMinDays !== undefined &&
        data.productionMaxDays !== undefined &&
        data.productionMinDays >
          data.productionMaxDays
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["productionMinDays"],
          message:
            "Minimum production days cannot exceed maximum production days.",
        });
      }
    });

export const adminProductIdParamSchema = z.object({
  productId: z
    .string()
    .uuid("Enter a valid product ID"),
});

export type CreateAdminProductInput = z.infer<
  typeof createAdminProductSchema
>;

export type UpdateAdminProductInput = z.infer<
  typeof updateAdminProductSchema
>;