import { z } from "zod";

const customRequestFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Request title is required")
    .max(200),

  description: z
    .string()
    .trim()
    .min(1, "Request description is required")
    .max(5000),

  colors: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(80),
    )
    .max(20)
    .default([]),

  size: z
    .string()
    .trim()
    .max(100)
    .optional(),

  occasion: z
    .string()
    .trim()
    .max(120)
    .optional(),

  targetDate: z.coerce
    .date()
    .optional(),

  budgetMin: z.coerce
    .number()
    .nonnegative(
      "Minimum budget cannot be negative",
    )
    .optional(),

  budgetMax: z.coerce
    .number()
    .nonnegative(
      "Maximum budget cannot be negative",
    )
    .optional(),
});

export const createCustomerCustomRequestSchema =
  customRequestFieldsSchema.superRefine(
    (data, ctx) => {
      if (
        data.targetDate !== undefined &&
        data.targetDate.getTime() <= Date.now()
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["targetDate"],
          message:
            "Target date must be in the future.",
        });
      }

      if (
        data.budgetMin !== undefined &&
        data.budgetMax !== undefined &&
        data.budgetMin > data.budgetMax
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["budgetMin"],
          message:
            "Minimum budget cannot exceed maximum budget.",
        });
      }
    },
  );

export const customerCustomRequestIdParamSchema =
  z.object({
    requestId: z
      .string()
      .uuid("Enter a valid custom request ID"),
  });

export const customerCustomQuoteParamsSchema =
  z.object({
    requestId: z
      .string()
      .uuid("Enter a valid custom request ID"),

    quoteId: z
      .string()
      .uuid("Enter a valid quote ID"),
  });

export const createCustomerCustomRequestMessageSchema =
  z.object({
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(5000),
  });

export type CreateCustomerCustomRequestInput =
  z.infer<
    typeof createCustomerCustomRequestSchema
  >;

export type CreateCustomerCustomRequestMessageInput =
  z.infer<
    typeof createCustomerCustomRequestMessageSchema
  >;
