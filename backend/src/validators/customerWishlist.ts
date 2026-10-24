import { z } from "zod";

export const wishlistListQuerySchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20),
  });

export const wishlistProductParamSchema =
  z.object({
    productId: z
      .string()
      .uuid(
        "Product ID must be a valid UUID.",
      ),
  });

export const updateWishlistPreferencesSchema =
  z
    .object({
      notifyOnRestock:
        z.boolean().optional(),

      notifyOnPriceDrop:
        z.boolean().optional(),
    })
    .refine(
      (data) =>
        data.notifyOnRestock !==
          undefined ||
        data.notifyOnPriceDrop !==
          undefined,
      {
        message:
          "At least one wishlist notification preference is required.",
      },
    );

export type WishlistListQuery =
  z.infer<
    typeof wishlistListQuerySchema
  >;

export type UpdateWishlistPreferencesInput =
  z.infer<
    typeof updateWishlistPreferencesSchema
  >;
