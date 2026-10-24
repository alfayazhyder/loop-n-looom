import { z } from "zod";

function isValidDateOnly(
  value: string,
): boolean {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return false;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  const day =
    Number(match[3]);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  return (
    date.getUTCFullYear() ===
      year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() ===
      day
  );
}

const dateOnlySchema =
  z
    .string()
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Event date must use YYYY-MM-DD format.",
    )
    .refine(
      isValidDateOnly,
      "Event date is invalid.",
    );

export const reminderIdParamSchema =
  z.object({
    reminderId:
      z
        .string()
        .uuid(
          "Reminder ID must be a valid UUID.",
        ),
  });

export const reminderListQuerySchema =
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

    active:
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

export const upcomingReminderQuerySchema =
  z.object({
    days:
      z.coerce
        .number()
        .int()
        .min(1)
        .max(730)
        .default(90),
  });

export const createReminderSchema =
  z.object({
    occasionId:
      z
        .string()
        .uuid(
          "Occasion ID must be a valid UUID.",
        )
        .nullable()
        .optional(),

    title:
      z
        .string()
        .trim()
        .min(
          1,
          "Reminder title is required.",
        )
        .max(120),

    recipientName:
      z
        .string()
        .trim()
        .max(120)
        .nullable()
        .optional(),

    occasionLabel:
      z
        .string()
        .trim()
        .max(120)
        .nullable()
        .optional(),

    eventDate:
      dateOnlySchema,

    reminderDaysBefore:
      z
        .number()
        .int()
        .min(0)
        .max(365)
        .default(7),

    recursYearly:
      z
        .boolean()
        .default(true),

    isActive:
      z
        .boolean()
        .default(true),
  });

export const updateReminderSchema =
  createReminderSchema
    .partial()
    .refine(
      (data) =>
        Object.keys(data)
          .length > 0,
      {
        message:
          "At least one reminder field is required.",
      },
    );

export type ReminderListQuery =
  z.infer<
    typeof reminderListQuerySchema
  >;

export type UpcomingReminderQuery =
  z.infer<
    typeof upcomingReminderQuerySchema
  >;

export type CreateReminderInput =
  z.infer<
    typeof createReminderSchema
  >;

export type UpdateReminderInput =
  z.infer<
    typeof updateReminderSchema
  >;
