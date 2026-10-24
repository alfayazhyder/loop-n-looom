import { z } from "zod";

const uuid = z.string().uuid();

const couponType = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);

const pageFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

const activeFilter = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

const amount = z.coerce.number().finite().nonnegative().max(1000000);

const nullableAmount = amount.nullable().optional();

const nullablePositiveInt = z.coerce
  .number()
  .int()
  .positive()
  .max(1000000)
  .nullable()
  .optional();

const nullableDate = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional();

const couponFields = {
  code: z.string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_-]{2,39}$/),

  description: z.string()
    .trim()
    .max(500)
    .nullable()
    .optional(),

  type: couponType,

  discountValue: z.coerce.number()
    .finite()
    .positive()
    .max(1000000),

  minimumOrderAmount: nullableAmount,
  maximumDiscountAmount: nullableAmount,

  usageLimit: nullablePositiveInt,
  usageLimitPerUser: nullablePositiveInt,

  startsAt: nullableDate,
  endsAt: nullableDate,

  isActive: z.boolean().optional(),
};

export const createCouponSchema = z
  .object(couponFields)
  .strict();

export const updateCouponSchema = z
  .object(couponFields)
  .partial()
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field to update.",
  );

export const couponIdSchema = z.object({
  couponId: uuid,
});

export const subscriberIdSchema = z.object({
  subscriberId: uuid,
});

export const couponQuerySchema = z.object({
  ...pageFields,
  search: z.string().trim().max(120).default(""),
  active: activeFilter,
});

export const subscriberQuerySchema = z.object({
  ...pageFields,
  search: z.string().trim().max(120).default(""),
  active: activeFilter,
});

const dateField = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Use YYYY-MM-DD.",
);

export const reportQuerySchema = z.object({
  from: dateField.optional(),
  to: dateField.optional(),
  ...pageFields,
});

export const unsubscribeSchema = z.object({
  isActive: z.literal(false),
}).strict();

export type CreateCouponInput =
  z.infer<typeof createCouponSchema>;

export type UpdateCouponInput =
  z.infer<typeof updateCouponSchema>;

export type CouponQuery =
  z.infer<typeof couponQuerySchema>;

export type SubscriberQuery =
  z.infer<typeof subscriberQuerySchema>;

export type ReportQuery =
  z.infer<typeof reportQuerySchema>;