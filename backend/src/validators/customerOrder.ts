import { z } from "zod";

export const customerOrderStatusSchema =
  z.enum([
    "PENDING_PAYMENT",
    "PAID",
    "CONFIRMED",
    "IN_PRODUCTION",
    "QUALITY_CHECK",
    "READY_FOR_PACKING",
    "PACKED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]);

export const customerOrderListQuerySchema =
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
      customerOrderStatusSchema.optional(),
  });

export const customerOrderIdParamsSchema =
  z.object({
    orderId: z
      .string()
      .uuid(
        "Enter a valid order ID",
      ),
  });

export const publicOrderTrackingQuerySchema =
  z.object({
    orderNumber: z
      .string()
      .trim()
      .regex(
        /^LNL-\d{4}-\d{6}$/i,
        "Enter a valid LOOP_N_LOOOM order number",
      )
      .transform(
        (value) =>
          value.toUpperCase(),
      ),

    customerEmail: z
      .string()
      .trim()
      .email(
        "Enter a valid customer email",
      )
      .transform(
        (value) =>
          value.toLowerCase(),
      )
      .optional(),
  });

export type CustomerOrderListQuery =
  z.infer<
    typeof customerOrderListQuerySchema
  >;

export type PublicOrderTrackingQuery =
  z.infer<
    typeof publicOrderTrackingQuerySchema
  >;
