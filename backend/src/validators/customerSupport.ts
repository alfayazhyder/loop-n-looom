import { z } from "zod";

export const supportConversationIdParamSchema =
  z.object({
    conversationId:
      z
        .string()
        .uuid(
          "Conversation ID must be a valid UUID.",
        ),
  });

export const customerSupportListQuerySchema =
  z.object({
    status:
      z
        .enum([
          "OPEN",
          "CLOSED",
        ])
        .optional(),

    page:
      z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    limit:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20),
  });

export const supportMessageListQuerySchema =
  z.object({
    page:
      z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    limit:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50),
  });

export const createCustomerSupportConversationSchema =
  z.object({
    subject:
      z
        .string()
        .trim()
        .min(
          1,
          "Subject is required.",
        )
        .max(200),

    orderId:
      z
        .string()
        .uuid(
          "Order ID must be a valid UUID.",
        )
        .optional(),

    message:
      z
        .string()
        .trim()
        .min(
          1,
          "Message is required.",
        )
        .max(5000),

    attachmentUrl:
      z
        .string()
        .trim()
        .url(
          "Attachment URL must be valid.",
        )
        .max(2000)
        .optional(),
  });

export const createCustomerSupportMessageSchema =
  z.object({
    message:
      z
        .string()
        .trim()
        .min(
          1,
          "Message is required.",
        )
        .max(5000),

    attachmentUrl:
      z
        .string()
        .trim()
        .url(
          "Attachment URL must be valid.",
        )
        .max(2000)
        .optional(),
  });

export type CustomerSupportListQuery =
  z.infer<
    typeof customerSupportListQuerySchema
  >;

export type SupportMessageListQuery =
  z.infer<
    typeof supportMessageListQuerySchema
  >;

export type CreateCustomerSupportConversationInput =
  z.infer<
    typeof createCustomerSupportConversationSchema
  >;

export type CreateCustomerSupportMessageInput =
  z.infer<
    typeof createCustomerSupportMessageSchema
  >;
