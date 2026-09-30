import { z } from "zod";

export const addCustomerCartItemSchema =
  z.object({
    productId: z
      .string()
      .uuid("Enter a valid product ID"),

    variantId: z
      .string()
      .uuid("Enter a valid variant ID")
      .optional(),

    quantity: z.coerce
      .number()
      .int(
        "Quantity must be a whole number",
      )
      .min(
        1,
        "Quantity must be at least 1",
      )
      .max(
        99,
        "Quantity cannot exceed 99",
      ),
  });

export const customerCartItemIdParamSchema =
  z.object({
    itemId: z
      .string()
      .uuid(
        "Enter a valid cart item ID",
      ),
  });

export const updateCustomerCartItemSchema =
  z.object({
    quantity: z.coerce
      .number()
      .int(
        "Quantity must be a whole number",
      )
      .min(
        1,
        "Quantity must be at least 1",
      )
      .max(
        99,
        "Quantity cannot exceed 99",
      ),
  });

export const updateCustomerCartGiftOptionsSchema =
  z
    .object({
      giftWrapSelected:
        z.boolean().optional(),

      giftMessage: z
        .union([
          z
            .string()
            .trim()
            .max(
              500,
              "Gift message cannot exceed 500 characters",
            ),
          z.null(),
        ])
        .optional(),
    })
    .refine(
      (data) =>
        data.giftWrapSelected !==
          undefined ||
        data.giftMessage !==
          undefined,
      {
        message:
          "Provide at least one gift option to update.",
      },
    );

export const applyCustomerCartCouponSchema =
  z.object({
    code: z
      .string()
      .trim()
      .min(
        1,
        "Coupon code is required",
      )
      .max(
        50,
        "Coupon code is too long",
      )
      .transform((value) =>
        value.toUpperCase(),
      ),
  });

export type AddCustomerCartItemInput =
  z.infer<
    typeof addCustomerCartItemSchema
  >;

export type UpdateCustomerCartItemInput =
  z.infer<
    typeof updateCustomerCartItemSchema
  >;

export type UpdateCustomerCartGiftOptionsInput =
  z.infer<
    typeof updateCustomerCartGiftOptionsSchema
  >;

export type ApplyCustomerCartCouponInput =
  z.infer<
    typeof applyCustomerCartCouponSchema
  >;