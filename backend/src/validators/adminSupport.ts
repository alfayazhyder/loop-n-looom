import { z } from "zod";

export const adminSupportConversationIdParamSchema =
  z.object({
    conversationId:
      z
        .string()
        .uuid(
          "Conversation ID must be a valid UUID.",
        ),
  });

export const adminSupportListQuerySchema =
  z.object({
    status:
      z
        .enum([
          "OPEN",
          "CLOSED",
        ])
        .optional(),

    assignedAdminId:
      z
        .string()
        .uuid(
          "Assigned admin ID must be a valid UUID.",
        )
        .optional(),

    search:
      z
        .string()
        .trim()
        .min(1)
        .max(200)
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
        .max(100)
        .default(20),
  });

export const assignSupportConversationSchema =
  z.object({
    assignedAdminId:
      z
        .string()
        .uuid(
          "Assigned admin ID must be a valid UUID.",
        )
        .nullable(),
  });

export const updateSupportConversationStatusSchema =
  z.object({
    status:
      z.enum([
        "OPEN",
        "CLOSED",
      ]),
  });

export const createAdminSupportMessageSchema =
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

export type AdminSupportListQuery =
  z.infer<
    typeof adminSupportListQuerySchema
  >;

export type AssignSupportConversationInput =
  z.infer<
    typeof assignSupportConversationSchema
  >;

export type UpdateSupportConversationStatusInput =
  z.infer<
    typeof updateSupportConversationStatusSchema
  >;

export type CreateAdminSupportMessageInput =
  z.infer<
    typeof createAdminSupportMessageSchema
  >;
