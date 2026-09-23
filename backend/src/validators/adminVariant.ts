import { z } from "zod";

const variantFieldsSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required")
    .max(100)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "SKU may contain only letters, numbers, hyphens, and underscores",
    ),

  nameEn: z
    .string()
    .trim()
    .max(160)
    .optional(),

  nameAr: z
    .string()
    .trim()
    .max(160)
    .optional(),

  colorEn: z
    .string()
    .trim()
    .max(80)
    .optional(),

  colorAr: z
    .string()
    .trim()
    .max(80)
    .optional(),

  size: z
    .string()
    .trim()
    .max(80)
    .optional(),

  price: z.coerce
    .number()
    .nonnegative(
      "Variant price cannot be negative",
    )
    .optional(),

  compareAtPrice: z.coerce
    .number()
    .nonnegative(
      "Compare-at price cannot be negative",
    )
    .optional(),

  isActive: z.boolean(),
});

const createVariantFieldsSchema =
  variantFieldsSchema.extend({
    stockQuantity: z.coerce
      .number()
      .int()
      .min(
        0,
        "Initial stock quantity cannot be negative",
      )
      .default(0),

    isActive: z.boolean().default(true),
  });

export const createAdminVariantSchema =
  createVariantFieldsSchema.superRefine(
    (data, ctx) => {
      if (
        data.price !== undefined &&
        data.compareAtPrice !== undefined &&
        data.compareAtPrice < data.price
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["compareAtPrice"],
          message:
            "Compare-at price cannot be lower than the variant price.",
        });
      }
    },
  );

export const updateAdminVariantSchema =
  variantFieldsSchema
    .partial()
    .superRefine((data, ctx) => {
      if (
        data.price !== undefined &&
        data.compareAtPrice !== undefined &&
        data.compareAtPrice < data.price
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["compareAtPrice"],
          message:
            "Compare-at price cannot be lower than the variant price.",
        });
      }
    });

export const adminVariantIdParamSchema = z.object({
  variantId: z
    .string()
    .uuid("Enter a valid variant ID"),
});

export const adminProductVariantParamsSchema =
  z.object({
    productId: z
      .string()
      .uuid("Enter a valid product ID"),

    variantId: z
      .string()
      .uuid("Enter a valid variant ID"),
  });

const inventoryMovementTypeSchema = z.enum([
  "STOCK_IN",
  "STOCK_OUT",
  "ADJUSTMENT",
  "RETURNED",
]);

export const adjustInventorySchema = z
  .object({
    type: inventoryMovementTypeSchema,

    quantity: z.coerce
      .number()
      .int()
      .refine((value) => value !== 0, {
        message: "Quantity cannot be zero.",
      }),

    reason: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.type !== "ADJUSTMENT" &&
      data.quantity < 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["quantity"],
        message:
          "Stock in, stock out, and returned quantities must be greater than zero.",
      });
    }

    if (
      data.type === "ADJUSTMENT" &&
      !data.reason
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message:
          "A reason is required for manual stock adjustments.",
      });
    }
  });

export type CreateAdminVariantInput = z.infer<
  typeof createAdminVariantSchema
>;

export type UpdateAdminVariantInput = z.infer<
  typeof updateAdminVariantSchema
>;

export type AdjustInventoryInput = z.infer<
  typeof adjustInventorySchema
>;