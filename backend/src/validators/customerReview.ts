import { z } from "zod";

const reviewStatusSchema =
  z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
  ]);

const nullableText = (
  maximumLength: number,
) =>
  z
    .union([
      z
        .string()
        .trim()
        .max(maximumLength)
        .transform(
          (value) =>
            value.length > 0
              ? value
              : null,
        ),

      z.null(),
    ])
    .optional();

const reviewMediaUrlSchema =
  z
    .string()
    .trim()
    .max(2048)
    .refine(
      (value) => {
        try {
          const url =
            new URL(value);

          return (
            url.protocol ===
              "https:" ||
            url.protocol ===
              "http:"
          );
        } catch {
          return false;
        }
      },
      {
        message:
          "Review media URL must be a valid HTTP or HTTPS URL.",
      },
    );

const reviewMediaSchema =
  z.object({
    type: z.enum([
      "IMAGE",
      "VIDEO",
    ]),

    url:
      reviewMediaUrlSchema,
  });

export const customerReviewListQuerySchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10),

    status:
      reviewStatusSchema.optional(),
  });

export const customerReviewIdParamsSchema =
  z.object({
    reviewId: z
      .string()
      .uuid(
        "Enter a valid review ID.",
      ),
  });

export const createCustomerReviewSchema =
  z.object({
    orderItemId: z
      .string()
      .uuid(
        "Enter a valid order item ID.",
      ),

    rating: z.coerce
      .number()
      .int()
      .min(1)
      .max(5),

    title:
      nullableText(120),

    content:
      nullableText(2000),

    displayName:
      nullableText(80),

    media: z
      .array(
        reviewMediaSchema,
      )
      .max(
        5,
        "A review can contain at most 5 media items.",
      )
      .default([]),
  });

export const updateCustomerReviewSchema =
  z
    .object({
      rating: z.coerce
        .number()
        .int()
        .min(1)
        .max(5)
        .optional(),

      title:
        nullableText(120),

      content:
        nullableText(2000),

      displayName:
        nullableText(80),

      media: z
        .array(
          reviewMediaSchema,
        )
        .max(
          5,
          "A review can contain at most 5 media items.",
        )
        .optional(),
    })
    .refine(
      (value) =>
        Object.keys(value)
          .length > 0,
      {
        message:
          "Provide at least one review field to update.",
      },
    );

export const publicProductReviewParamsSchema =
  z.object({
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200),
  });

export const publicProductReviewQuerySchema =
  z.object({
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10),

    rating: z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .optional(),

    sort: z
      .enum([
        "newest",
        "oldest",
        "rating_high",
        "rating_low",
      ])
      .default(
        "newest",
      ),
  });

export type CustomerReviewListQuery =
  z.infer<
    typeof customerReviewListQuerySchema
  >;

export type CreateCustomerReviewInput =
  z.infer<
    typeof createCustomerReviewSchema
  >;

export type UpdateCustomerReviewInput =
  z.infer<
    typeof updateCustomerReviewSchema
  >;

export type PublicProductReviewQuery =
  z.infer<
    typeof publicProductReviewQuerySchema
  >;
