import { z } from "zod";

const customRequestStatusSchema = z.enum([
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHATTING",
  "QUOTE_SENT",
  "QUOTE_ACCEPTED",
  "QUOTE_REJECTED",
  "PAID",
  "CONVERTED_TO_ORDER",
  "REJECTED",
  "CANCELLED",
]);

const adminManagedRequestStatusSchema = z.enum([
  "UNDER_REVIEW",
  "CHATTING",
  "REJECTED",
  "CANCELLED",
]);

export const adminCustomRequestListQuerySchema =
  z.object({
    status: customRequestStatusSchema.optional(),

    assignedAdminId: z
      .string()
      .uuid("Enter a valid admin ID")
      .optional(),

    search: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional(),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),
  });

export const adminCustomRequestIdParamSchema =
  z.object({
    requestId: z
      .string()
      .uuid("Enter a valid custom request ID"),
  });

export const adminCustomQuoteParamsSchema =
  z.object({
    requestId: z
      .string()
      .uuid("Enter a valid custom request ID"),

    quoteId: z
      .string()
      .uuid("Enter a valid quote ID"),
  });

export const assignAdminCustomRequestSchema =
  z.object({
    assignedAdminId: z
      .string()
      .uuid("Enter a valid admin ID")
      .nullable(),
  });

export const updateAdminCustomRequestStatusSchema =
  z.object({
    status: adminManagedRequestStatusSchema,
  });

export const createAdminCustomRequestMessageSchema =
  z.object({
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(5000),

    attachmentUrl: z
      .string()
      .trim()
      .url("Enter a valid attachment URL")
      .optional(),
  });

export const createAdminCustomQuoteSchema = z
  .object({
    amount: z.coerce
      .number()
      .positive(
        "Quote amount must be greater than 0",
      ),

    notes: z
      .string()
      .trim()
      .max(5000)
      .optional(),

    validUntil: z.coerce
      .date()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.validUntil !== undefined &&
      data.validUntil.getTime() <= Date.now()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["validUntil"],
        message:
          "Quote expiry must be in the future.",
      });
    }
  });

export type AdminCustomRequestListQuery =
  z.infer<
    typeof adminCustomRequestListQuerySchema
  >;

export type AssignAdminCustomRequestInput =
  z.infer<
    typeof assignAdminCustomRequestSchema
  >;

export type UpdateAdminCustomRequestStatusInput =
  z.infer<
    typeof updateAdminCustomRequestStatusSchema
  >;

export type CreateAdminCustomRequestMessageInput =
  z.infer<
    typeof createAdminCustomRequestMessageSchema
  >;

export type CreateAdminCustomQuoteInput =
  z.infer<
    typeof createAdminCustomQuoteSchema
  >;