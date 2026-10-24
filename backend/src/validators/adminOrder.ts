import { z } from "zod";

export const adminOrderStatusSchema =
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

export const adminShipmentStatusSchema =
  z.enum([
    "PENDING",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "FAILED",
    "RETURNED",
  ]);

export const adminOrderIdParamSchema =
  z.object({
    orderId:
      z
        .string()
        .uuid(
          "Order ID must be a valid UUID.",
        ),
  });

export const adminOrderMediaParamsSchema =
  z.object({
    orderId:
      z
        .string()
        .uuid(
          "Order ID must be a valid UUID.",
        ),

    mediaId:
      z
        .string()
        .uuid(
          "Media ID must be a valid UUID.",
        ),
  });

export const adminOrderListQuerySchema =
  z.object({
    status:
      adminOrderStatusSchema
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

export const updateAdminOrderStatusSchema =
  z.object({
    status:
      z.enum([
        "CONFIRMED",
        "IN_PRODUCTION",
        "QUALITY_CHECK",
        "READY_FOR_PACKING",
        "PACKED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ]),

    note:
      z
        .string()
        .trim()
        .min(1)
        .max(1000)
        .optional(),
  });

const qcPhotoSchema =
  z.object({
    url:
      z
        .string()
        .trim()
        .url(
          "QC photo URL must be valid.",
        )
        .max(2000),

    publicId:
      z
        .string()
        .trim()
        .min(1)
        .max(500)
        .optional(),

    caption:
      z
        .string()
        .trim()
        .min(1)
        .max(500)
        .optional(),
  });

export const addAdminOrderQcPhotosSchema =
  z.object({
    photos:
      z
        .array(
          qcPhotoSchema,
        )
        .min(
          1,
          "At least one QC photo is required.",
        )
        .max(
          10,
          "A maximum of 10 QC photos can be added at once.",
        ),
  });

export const updateAdminShipmentSchema =
  z
    .object({
      status:
        adminShipmentStatusSchema
          .optional(),

      courier:
        z
          .string()
          .trim()
          .min(1)
          .max(120)
          .nullable()
          .optional(),

      trackingNumber:
        z
          .string()
          .trim()
          .min(1)
          .max(200)
          .nullable()
          .optional(),

      trackingUrl:
        z
          .string()
          .trim()
          .url(
            "Tracking URL must be valid.",
          )
          .max(2000)
          .nullable()
          .optional(),

      estimatedDeliveryAt:
        z.coerce
          .date()
          .nullable()
          .optional(),
    })
    .refine(
      (data) =>
        Object.values(
          data,
        ).some(
          (value) =>
            value !==
            undefined,
        ),
      {
        message:
          "Provide at least one shipment field to update.",
      },
    );

export type AdminOrderListQuery =
  z.infer<
    typeof adminOrderListQuerySchema
  >;

export type UpdateAdminOrderStatusInput =
  z.infer<
    typeof updateAdminOrderStatusSchema
  >;

export type AddAdminOrderQcPhotosInput =
  z.infer<
    typeof addAdminOrderQcPhotosSchema
  >;

export type UpdateAdminShipmentInput =
  z.infer<
    typeof updateAdminShipmentSchema
  >;
