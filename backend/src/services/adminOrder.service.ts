import type {
  Prisma,
} from "../generated/prisma/client";

import { prisma } from "../lib/prisma";

import type {
  AddAdminOrderQcPhotosInput,
  AdminOrderListQuery,
  UpdateAdminOrderStatusInput,
  UpdateAdminShipmentInput,
} from "../validators/adminOrder";

export class AdminOrderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "AdminOrderError";
  }
}

function numberValue(
  value: {
    toString(): string;
  },
) {
  return Number(
    value.toString(),
  );
}

const listOrderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  currency: true,

  customerName: true,
  customerEmail: true,
  customerPhone: true,

  shippingEmirate: true,
  shippingCity: true,

  subtotal: true,
  discountAmount: true,
  storeCreditAmount: true,
  giftWrapAmount: true,
  deliveryFee: true,
  taxAmount: true,
  totalAmount: true,

  giftWrapSelected: true,

  placedAt: true,
  paidAt: true,
  estimatedDeliveryAt: true,
  cancelledAt: true,
  deliveredAt: true,

  shipment: {
    select: {
      id: true,
      status: true,
      courier: true,
      trackingNumber: true,
      trackingUrl: true,
      estimatedDeliveryAt: true,
      outForDeliveryAt: true,
      deliveredAt: true,
    },
  },

  _count: {
    select: {
      items: true,
    },
  },
} satisfies Prisma.OrderSelect;

const detailOrderInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
    },
  },

  items: {
    orderBy: {
      createdAt:
        "asc",
    },

    include: {
      product: {
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          slug: true,
        },
      },

      variant: {
        select: {
          id: true,
          sku: true,
          nameEn: true,
          nameAr: true,
          colorEn: true,
          colorAr: true,
          size: true,
        },
      },
    },
  },

  statusHistory: {
    orderBy: {
      createdAt:
        "asc",
    },

    include: {
      updatedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  },

  media: {
    orderBy: {
      createdAt:
        "asc",
    },
  },

  shipment: true,

  payments: {
    orderBy: {
      createdAt:
        "desc",
    },
  },
} satisfies Prisma.OrderInclude;

const legalFulfillmentTransitions:
  Record<string, string> =
  {
    PAID:
      "CONFIRMED",

    CONFIRMED:
      "IN_PRODUCTION",

    IN_PRODUCTION:
      "QUALITY_CHECK",

    QUALITY_CHECK:
      "READY_FOR_PACKING",

    READY_FOR_PACKING:
      "PACKED",

    PACKED:
      "OUT_FOR_DELIVERY",

    OUT_FOR_DELIVERY:
      "DELIVERED",
  };

const orderStatusLabels:
  Record<string, string> =
  {
    CONFIRMED:
      "Confirmed",

    IN_PRODUCTION:
      "In Production",

    QUALITY_CHECK:
      "Quality Check",

    READY_FOR_PACKING:
      "Ready for Packing",

    PACKED:
      "Packed",

    OUT_FOR_DELIVERY:
      "Out for Delivery",

    DELIVERED:
      "Delivered",
  };

type FulfillmentOrder =
  {
    id: string;
    orderNumber: string;
    status: string;
    userId: string | null;
    customerEmail: string;
    customerPhone: string;
  };

async function getFulfillmentOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<FulfillmentOrder> {
  const order =
    await tx.order.findUnique(
      {
        where: {
          id:
            orderId,
        },

        select: {
          id: true,
          orderNumber: true,
          status: true,
          userId: true,
          customerEmail: true,
          customerPhone: true,
        },
      },
    );

  if (!order) {
    throw new AdminOrderError(
      "Order not found.",
      404,
    );
  }

  return order;
}

function assertLegalTransition(
  currentStatus: string,
  targetStatus: string,
) {
  if (
    currentStatus ===
    targetStatus
  ) {
    throw new AdminOrderError(
      `Order is already ${targetStatus}.`,
      409,
    );
  }

  const expected =
    legalFulfillmentTransitions[
      currentStatus
    ];

  if (
    expected !==
    targetStatus
  ) {
    throw new AdminOrderError(
      `Order cannot move directly from ${currentStatus} to ${targetStatus}.`,
      409,
    );
  }
}

async function queueOrderStatusNotifications(
  tx: Prisma.TransactionClient,
  order: FulfillmentOrder,
  status: string,
) {
  const label =
    orderStatusLabels[
      status
    ] ??
    status;

  const body =
    `Order ${order.orderNumber} status updated to ${label}.`;

  await tx.notification.createMany(
    {
      data: [
        {
          userId:
            order.userId,

          orderId:
            order.id,

          channel:
            "EMAIL",

          recipient:
            order.customerEmail,

          templateKey:
            `ORDER_STATUS_${status}`,

          subject:
            `Order ${order.orderNumber}: ${label}`,

          body,

          status:
            "QUEUED",
        },

        {
          userId:
            order.userId,

          orderId:
            order.id,

          channel:
            "WHATSAPP",

          recipient:
            order.customerPhone,

          templateKey:
            `ORDER_STATUS_${status}`,

          body,

          status:
            "QUEUED",
        },
      ],
    },
  );
}

async function applyOrderStatusTransition(
  tx: Prisma.TransactionClient,
  adminId: string,
  order: FulfillmentOrder,
  targetStatus: string,
  note?: string,
) {
  assertLegalTransition(
    order.status,
    targetStatus,
  );

  if (
    order.status ===
      "QUALITY_CHECK" &&
    targetStatus ===
      "READY_FOR_PACKING"
  ) {
    const qcPhotoCount =
      await tx.orderMedia.count(
        {
          where: {
            orderId:
              order.id,

            type:
              "QUALITY_CHECK_PHOTO",
          },
        },
      );

    if (
      qcPhotoCount <
      1
    ) {
      throw new AdminOrderError(
        "At least one quality-check photo is required before the order can move to ready for packing.",
        409,
      );
    }
  }

  const now =
    new Date();

  await tx.order.update(
    {
      where: {
        id:
          order.id,
      },

      data: {
        status:
          targetStatus as
            | "CONFIRMED"
            | "IN_PRODUCTION"
            | "QUALITY_CHECK"
            | "READY_FOR_PACKING"
            | "PACKED"
            | "OUT_FOR_DELIVERY"
            | "DELIVERED",

        ...(targetStatus ===
        "DELIVERED"
          ? {
              deliveredAt:
                now,
            }
          : {}),
      },
    },
  );

  await tx.orderStatusHistory.create(
    {
      data: {
        orderId:
          order.id,

        status:
          targetStatus as
            | "CONFIRMED"
            | "IN_PRODUCTION"
            | "QUALITY_CHECK"
            | "READY_FOR_PACKING"
            | "PACKED"
            | "OUT_FOR_DELIVERY"
            | "DELIVERED",

        note:
          note ??
          null,

        createdByUserId:
          adminId,
      },
    },
  );

  if (
    targetStatus ===
    "PACKED"
  ) {
    await tx.shipment.upsert(
      {
        where: {
          orderId:
            order.id,
        },

        create: {
          orderId:
            order.id,

          status:
            "READY_FOR_PICKUP",
        },

        update: {
          status:
            "READY_FOR_PICKUP",
        },
      },
    );
  }

  if (
    targetStatus ===
    "OUT_FOR_DELIVERY"
  ) {
    await tx.shipment.upsert(
      {
        where: {
          orderId:
            order.id,
        },

        create: {
          orderId:
            order.id,

          status:
            "OUT_FOR_DELIVERY",

          outForDeliveryAt:
            now,
        },

        update: {
          status:
            "OUT_FOR_DELIVERY",

          outForDeliveryAt:
            now,
        },
      },
    );
  }

  if (
    targetStatus ===
    "DELIVERED"
  ) {
    await tx.shipment.upsert(
      {
        where: {
          orderId:
            order.id,
        },

        create: {
          orderId:
            order.id,

          status:
            "DELIVERED",

          deliveredAt:
            now,
        },

        update: {
          status:
            "DELIVERED",

          deliveredAt:
            now,
        },
      },
    );
  }

  await queueOrderStatusNotifications(
    tx,
    order,
    targetStatus,
  );
}

export async function listAdminOrders(
  query: AdminOrderListQuery,
) {
  const filters:
    Prisma.OrderWhereInput[] =
    [];

  if (query.status) {
    filters.push({
      status:
        query.status,
    });
  }

  if (query.search) {
    filters.push({
      OR: [
        {
          orderNumber: {
            contains:
              query.search,

            mode:
              "insensitive",
          },
        },
        {
          customerName: {
            contains:
              query.search,

            mode:
              "insensitive",
          },
        },
        {
          customerEmail: {
            contains:
              query.search,

            mode:
              "insensitive",
          },
        },
        {
          customerPhone: {
            contains:
              query.search,

            mode:
              "insensitive",
          },
        },
      ],
    });
  }

  const where:
    Prisma.OrderWhereInput =
    filters.length ===
    0
      ? {}
      : {
          AND:
            filters,
        };

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    orders,
    total,
  ] =
    await prisma.$transaction([
      prisma.order.findMany(
        {
          where,

          skip,

          take:
            query.limit,

          orderBy: {
            placedAt:
              "desc",
          },

          select:
            listOrderSelect,
        },
      ),

      prisma.order.count({
        where,
      }),
    ]);

  return {
    orders:
      orders.map(
        (order) => ({
          id:
            order.id,

          orderNumber:
            order.orderNumber,

          status:
            order.status,

          currency:
            order.currency,

          customer: {
            name:
              order.customerName,

            email:
              order.customerEmail,

            phone:
              order.customerPhone,
          },

          destination: {
            emirate:
              order.shippingEmirate,

            city:
              order.shippingCity,
          },

          amounts: {
            subtotal:
              numberValue(
                order.subtotal,
              ),

            discountAmount:
              numberValue(
                order.discountAmount,
              ),

            storeCreditAmount:
              numberValue(
                order.storeCreditAmount,
              ),

            giftWrapAmount:
              numberValue(
                order.giftWrapAmount,
              ),

            deliveryFee:
              numberValue(
                order.deliveryFee,
              ),

            taxAmount:
              numberValue(
                order.taxAmount,
              ),

            totalAmount:
              numberValue(
                order.totalAmount,
              ),
          },

          itemCount:
            order._count.items,

          giftWrapSelected:
            order.giftWrapSelected,

          placedAt:
            order.placedAt,

          paidAt:
            order.paidAt,

          estimatedDeliveryAt:
            order.estimatedDeliveryAt,

          cancelledAt:
            order.cancelledAt,

          deliveredAt:
            order.deliveredAt,

          shipment:
            order.shipment,
        }),
      ),

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

      total,

      totalPages:
        total === 0
          ? 0
          : Math.ceil(
              total /
                query.limit,
            ),
    },
  };
}

export async function getAdminOrderDetail(
  orderId: string,
) {
  const order =
    await prisma.order.findUnique(
      {
        where: {
          id:
            orderId,
        },

        include:
          detailOrderInclude,
      },
    );

  if (!order) {
    throw new AdminOrderError(
      "Order not found.",
      404,
    );
  }

  return {
    id:
      order.id,

    orderNumber:
      order.orderNumber,

    status:
      order.status,

    currency:
      order.currency,

    customer: {
      account:
        order.user,

      name:
        order.customerName,

      email:
        order.customerEmail,

      phone:
        order.customerPhone,
    },

    shippingAddress: {
      recipientName:
        order.shippingRecipientName,

      phone:
        order.shippingPhone,

      emirate:
        order.shippingEmirate,

      city:
        order.shippingCity,

      area:
        order.shippingArea,

      street:
        order.shippingStreet,

      building:
        order.shippingBuilding,

      apartmentOrVilla:
        order.shippingApartmentOrVilla,

      landmark:
        order.shippingLandmark,

      deliveryInstructions:
        order.deliveryInstructions,
    },

    amounts: {
      subtotal:
        numberValue(
          order.subtotal,
        ),

      discountAmount:
        numberValue(
          order.discountAmount,
        ),

      storeCreditAmount:
        numberValue(
          order.storeCreditAmount,
        ),

      giftWrapAmount:
        numberValue(
          order.giftWrapAmount,
        ),

      deliveryFee:
        numberValue(
          order.deliveryFee,
        ),

      taxAmount:
        numberValue(
          order.taxAmount,
        ),

      totalAmount:
        numberValue(
          order.totalAmount,
        ),
    },

    couponCode:
      order.couponCode,

    gift: {
      selected:
        order.giftWrapSelected,

      message:
        order.giftMessage,
    },

    placedAt:
      order.placedAt,

    paidAt:
      order.paidAt,

    estimatedDeliveryAt:
      order.estimatedDeliveryAt,

    cancelledAt:
      order.cancelledAt,

    deliveredAt:
      order.deliveredAt,

    items:
      order.items.map(
        (item) => ({
          id:
            item.id,

          itemType:
            item.itemType,

          productId:
            item.productId,

          variantId:
            item.variantId,

          bouquetBuildId:
            item.bouquetBuildId,

          productName:
            item.productName,

          variantName:
            item.variantName,

          sku:
            item.sku,

          unitPrice:
            numberValue(
              item.unitPrice,
            ),

          quantity:
            item.quantity,

          subtotal:
            numberValue(
              item.subtotal,
            ),

          fulfillmentType:
            item.fulfillmentType,

          productionMinDays:
            item.productionMinDays,

          productionMaxDays:
            item.productionMaxDays,

          customization:
            item.customization,

          product:
            item.product,

          variant:
            item.variant,

          createdAt:
            item.createdAt,
        }),
      ),

    statusHistory:
      order.statusHistory,

    media:
      order.media,

    shipment:
      order.shipment,

    payments:
      order.payments,
  };
}

export async function updateAdminOrderStatus(
  adminId: string,
  orderId: string,
  input: UpdateAdminOrderStatusInput,
) {
  await prisma.$transaction(
    async (tx) => {
      const order =
        await getFulfillmentOrder(
          tx,
          orderId,
        );

      await applyOrderStatusTransition(
        tx,
        adminId,
        order,
        input.status,
        input.note,
      );
    },
  );

  return getAdminOrderDetail(
    orderId,
  );
}

export async function addAdminOrderQcPhotos(
  orderId: string,
  input: AddAdminOrderQcPhotosInput,
) {
  const order =
    await prisma.order.findUnique(
      {
        where: {
          id:
            orderId,
        },

        select: {
          id: true,
          status: true,
        },
      },
    );

  if (!order) {
    throw new AdminOrderError(
      "Order not found.",
      404,
    );
  }

  if (
    order.status !==
    "QUALITY_CHECK"
  ) {
    throw new AdminOrderError(
      "Quality-check photos can only be added while the order is in QUALITY_CHECK.",
      409,
    );
  }

  const created =
    await prisma.$transaction(
      async (tx) => {
        const photos = [];

        for (
          const photo of
          input.photos
        ) {
          const media =
            await tx.orderMedia.create(
              {
                data: {
                  orderId,

                  type:
                    "QUALITY_CHECK_PHOTO",

                  url:
                    photo.url,

                  publicId:
                    photo.publicId ??
                    null,

                  caption:
                    photo.caption ??
                    null,
                },
              },
            );

          photos.push(
            media,
          );
        }

        return photos;
      },
    );

  return created;
}

export async function deleteAdminOrderQcPhoto(
  orderId: string,
  mediaId: string,
) {
  const order =
    await prisma.order.findUnique(
      {
        where: {
          id:
            orderId,
        },

        select: {
          status: true,
        },
      },
    );

  if (!order) {
    throw new AdminOrderError(
      "Order not found.",
      404,
    );
  }

  if (
    order.status !==
    "QUALITY_CHECK"
  ) {
    throw new AdminOrderError(
      "Quality-check photos can only be removed while the order is in QUALITY_CHECK.",
      409,
    );
  }

  const media =
    await prisma.orderMedia.findFirst(
      {
        where: {
          id:
            mediaId,

          orderId,

          type:
            "QUALITY_CHECK_PHOTO",
        },
      },
    );

  if (!media) {
    throw new AdminOrderError(
      "Quality-check photo not found.",
      404,
    );
  }

  await prisma.orderMedia.delete(
    {
      where: {
        id:
          mediaId,
      },
    },
  );

  return media;
}

export async function updateAdminOrderShipment(
  adminId: string,
  orderId: string,
  input: UpdateAdminShipmentInput,
) {
  await prisma.$transaction(
    async (tx) => {
      let order =
        await getFulfillmentOrder(
          tx,
          orderId,
        );

      if (
        order.status ===
          "PENDING_PAYMENT" ||
        order.status ===
          "CANCELLED" ||
        order.status ===
          "REFUNDED"
      ) {
        throw new AdminOrderError(
          "Shipment details cannot be updated for this order status.",
          409,
        );
      }

      if (
        input.status ===
        "OUT_FOR_DELIVERY"
      ) {
        if (
          order.status ===
          "PACKED"
        ) {
          await applyOrderStatusTransition(
            tx,
            adminId,
            order,
            "OUT_FOR_DELIVERY",
            "Shipment marked out for delivery.",
          );

          order = {
            ...order,
            status:
              "OUT_FOR_DELIVERY",
          };
        } else if (
          order.status !==
            "OUT_FOR_DELIVERY" &&
          order.status !==
            "DELIVERED"
        ) {
          throw new AdminOrderError(
            "The order must be packed before the shipment can be marked out for delivery.",
            409,
          );
        }
      }

      if (
        input.status ===
        "DELIVERED"
      ) {
        if (
          order.status ===
          "OUT_FOR_DELIVERY"
        ) {
          await applyOrderStatusTransition(
            tx,
            adminId,
            order,
            "DELIVERED",
            "Shipment marked delivered.",
          );

          order = {
            ...order,
            status:
              "DELIVERED",
          };
        } else if (
          order.status !==
          "DELIVERED"
        ) {
          throw new AdminOrderError(
            "The order must be out for delivery before the shipment can be marked delivered.",
            409,
          );
        }
      }

      const existingShipment =
        await tx.shipment.findUnique(
          {
            where: {
              orderId,
            },
          },
        );

      const now =
        new Date();

      const shipmentData = {
        ...(input.status !==
        undefined
          ? {
              status:
                input.status,
            }
          : {}),

        ...(input.courier !==
        undefined
          ? {
              courier:
                input.courier,
            }
          : {}),

        ...(input.trackingNumber !==
        undefined
          ? {
              trackingNumber:
                input.trackingNumber,
            }
          : {}),

        ...(input.trackingUrl !==
        undefined
          ? {
              trackingUrl:
                input.trackingUrl,
            }
          : {}),

        ...(input.estimatedDeliveryAt !==
        undefined
          ? {
              estimatedDeliveryAt:
                input.estimatedDeliveryAt,
            }
          : {}),

        ...(input.status ===
        "OUT_FOR_DELIVERY"
          ? {
              outForDeliveryAt:
                existingShipment
                  ?.outForDeliveryAt ??
                now,
            }
          : {}),

        ...(input.status ===
        "DELIVERED"
          ? {
              deliveredAt:
                existingShipment
                  ?.deliveredAt ??
                now,
            }
          : {}),
      };

      await tx.shipment.upsert(
        {
          where: {
            orderId,
          },

          create: {
            orderId,

            status:
              input.status ??
              "PENDING",

            courier:
              input.courier ??
              null,

            trackingNumber:
              input.trackingNumber ??
              null,

            trackingUrl:
              input.trackingUrl ??
              null,

            estimatedDeliveryAt:
              input.estimatedDeliveryAt ??
              null,

            outForDeliveryAt:
              input.status ===
              "OUT_FOR_DELIVERY"
                ? now
                : null,

            deliveredAt:
              input.status ===
              "DELIVERED"
                ? now
                : null,
          },

          update:
            shipmentData,
        },
      );

      if (
        input.estimatedDeliveryAt !==
        undefined
      ) {
        await tx.order.update(
          {
            where: {
              id:
                orderId,
            },

            data: {
              estimatedDeliveryAt:
                input.estimatedDeliveryAt,
            },
          },
        );
      }
    },
  );

  return getAdminOrderDetail(
    orderId,
  );
}
