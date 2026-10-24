import { z } from "zod";

export const notificationIdParamSchema =
  z.object({
    notificationId:
      z
        .string()
        .uuid(
          "Notification ID must be a valid UUID.",
        ),
  });

export const notificationListQuerySchema =
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
        .max(50)
        .default(20),

    channel:
      z
        .enum([
          "EMAIL",
          "WHATSAPP",
        ])
        .optional(),

    status:
      z
        .enum([
          "QUEUED",
          "SENT",
          "FAILED",
        ])
        .optional(),

    unreadOnly:
      z
        .enum([
          "true",
          "false",
        ])
        .transform(
          (value) =>
            value === "true",
        )
        .optional(),
  });

export type NotificationListQuery =
  z.infer<
    typeof notificationListQuerySchema
  >;
