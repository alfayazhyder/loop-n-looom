import { prisma } from "../lib/prisma";
import type {
  CustomerOrderListQuery,
} from "../validators/customerOrder";

export class CustomerOrderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "CustomerOrderError";
  }
}

export type CustomerOrderTrackingAccess = {
  userId?: string;
  customerEmail?: string;
};

const terminalOrderStatuses =
  new Set([
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]);

function numberValue(
  value: unknown,
): number {
  const result =
    Number(value);

  return Number.isFinite(
    result,
  )
    ? result
    : 0;
}

function safeMedia(
  value: unknown,
) {
  const media =
    value as Record<
      string,
      unknown
    >;

  const possibleUrl =
    media.url ??
    media.mediaUrl ??
    media.fileUrl ??
    media.imageUrl;

  const possibleCaption =
    media.caption ??
    media.description ??
    media.note;

  return {
    id:
      typeof media.id ===
      "string"
        ? media.id
        : null,

    type:
      typeof media.type ===
      "string"
        ? media.type
        : null,

    url:
      typeof possibleUrl ===
      "string"
        ? possibleUrl
        : null,

    caption:
      typeof possibleCaption ===
      "string"
        ? possibleCaption
        : null,

    createdAt:
      media.createdAt ??
      null,
  };
}

async function loadOrderDetail(
  where: {
    id?: string;
    userId?: string;
    orderNumber?: string;
  },
) {
  return prisma.order.findFirst({
    where,

    include: {
      items: {
        orderBy: {
          createdAt: "asc",
        },

        include: {
          review: {
            select: {
              id: true,
              rating: true,
              title: true,
              content: true,
              displayName: true,
              status: true,
              verifiedPurchase:
                true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },

      statusHistory: {
        orderBy: {
          createdAt: "asc",
        },

        select: {
          id: true,
          status: true,
          note: true,
          createdAt: true,
        },
      },

      media: {
        where: {
          type:
            "QUALITY_CHECK_PHOTO",
        },

        orderBy: {
          createdAt:
            "asc",
        },

        select: {
          id: true,
          type: true,
          url: true,
          caption: true,
          createdAt: true,
        },
      },

      payments: {
        orderBy: {
          createdAt: "asc",
        },

        select: {
          id: true,
          method: true,
          status: true,
          amount: true,
          currency: true,
          failureReason: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },

      shipment: {
        select: {
          id: true,
          status: true,
          courier: true,
          trackingNumber:
            true,
          trackingUrl: true,
          estimatedDeliveryAt:
            true,
          outForDeliveryAt:
            true,
          deliveredAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

type LoadedOrder =
  NonNullable<
    Awaited<
      ReturnType<
        typeof loadOrderDetail
      >
    >
  >;

function formatPayment(
  payment:
    LoadedOrder["payments"][number],
) {
  return {
    id:
      payment.id,

    method:
      payment.method,

    status:
      payment.status,

    amount:
      numberValue(
        payment.amount,
      ),

    currency:
      payment.currency,

    failureReason:
      payment.failureReason,

    paidAt:
      payment.paidAt,

    createdAt:
      payment.createdAt,

    updatedAt:
      payment.updatedAt,
  };
}

function formatShipment(
  shipment:
    LoadedOrder["shipment"],
) {
  if (!shipment) {
    return null;
  }

  return {
    id:
      shipment.id,

    status:
      shipment.status,

    courier:
      shipment.courier,

    trackingNumber:
      shipment.trackingNumber,

    trackingUrl:
      shipment.trackingUrl,

    estimatedDeliveryAt:
      shipment
        .estimatedDeliveryAt,

    outForDeliveryAt:
      shipment
        .outForDeliveryAt,

    deliveredAt:
      shipment.deliveredAt,

    createdAt:
      shipment.createdAt,

    updatedAt:
      shipment.updatedAt,
  };
}

function formatTimeline(
  order: LoadedOrder,
) {
  const history =
    order.statusHistory.map(
      (entry) => ({
        id:
          entry.id,

        status:
          entry.status,

        createdAt:
          entry.createdAt,
      }),
    );

  const completedStatuses =
    [
      ...new Set(
        history.map(
          (entry) =>
            entry.status,
        ),
      ),
    ];

  if (
    !completedStatuses.includes(
      order.status,
    )
  ) {
    completedStatuses.push(
      order.status,
    );
  }

  return {
    currentStatus:
      order.status,

    isTerminal:
      terminalOrderStatuses.has(
        order.status,
      ),

    completedStatuses,

    events:
      history,
  };
}

function formatItems(
  order: LoadedOrder,
) {
  return order.items.map(
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

      review:
        item.review
          ? {
              id:
                item.review.id,

              rating:
                item.review.rating,

              title:
                item.review.title,

              content:
                item.review.content,

              displayName:
                item.review
                  .displayName,

              status:
                item.review.status,

              verifiedPurchase:
                item.review
                  .verifiedPurchase,

              createdAt:
                item.review
                  .createdAt,

              updatedAt:
                item.review
                  .updatedAt,
            }
          : null,

      reviewEligible:
        order.status ===
          "DELIVERED" &&
        item.itemType ===
          "PRODUCT" &&
        Boolean(
          item.productId,
        ) &&
        !item.review,
    }),
  );
}

function formatCustomerOrderDetail(
  order: LoadedOrder,
) {
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
      name:
        order.customerName,

      email:
        order.customerEmail,

      phone:
        order.customerPhone,
    },

    shippingAddress: {
      recipientName:
        order
          .shippingRecipientName,

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
        order
          .shippingApartmentOrVilla,

      landmark:
        order.shippingLandmark,

      deliveryInstructions:
        order
          .deliveryInstructions,
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

    giftWrapSelected:
      order.giftWrapSelected,

    giftMessage:
      order.giftMessage,

    qcReview: {
      status: order.qcStatus,
      reviewedAt: order.qcReviewedAt,
      note: order.qcReviewNote,
    },

    placedAt:
      order.placedAt,

    paidAt:
      order.paidAt,

    estimatedDeliveryAt:
      order
        .estimatedDeliveryAt,

    cancelledAt:
      order.cancelledAt,

    deliveredAt:
      order.deliveredAt,

    createdAt:
      order.createdAt,

    updatedAt:
      order.updatedAt,

    items:
      formatItems(order),

    payments:
      order.payments.map(
        formatPayment,
      ),

    shipment:
      formatShipment(
        order.shipment,
      ),

    tracking:
      formatTimeline(order),

    media:
      order.media.map(
        safeMedia,
      ),
  };
}

function formatTrackingOrder(
  order: LoadedOrder,
) {
  return {
    orderNumber:
      order.orderNumber,

    status:
      order.status,

    currency:
      order.currency,

    placedAt:
      order.placedAt,

    paidAt:
      order.paidAt,

    estimatedDeliveryAt:
      order
        .estimatedDeliveryAt,

    deliveredAt:
      order.deliveredAt,

    destination: {
      recipientName:
        order
          .shippingRecipientName,

      emirate:
        order.shippingEmirate,

      city:
        order.shippingCity,

      area:
        order.shippingArea,
    },

    amounts: {
      totalAmount:
        numberValue(
          order.totalAmount,
        ),
    },

    items:
      order.items.map(
        (item) => ({
          id:
            item.id,

          itemType:
            item.itemType,

          productName:
            item.productName,

          variantName:
            item.variantName,

          quantity:
            item.quantity,

          fulfillmentType:
            item.fulfillmentType,

          productionMinDays:
            item.productionMinDays,

          productionMaxDays:
            item.productionMaxDays,
        }),
      ),

    payments:
      order.payments.map(
        formatPayment,
      ),

    shipment:
      formatShipment(
        order.shipment,
      ),

    tracking:
      formatTimeline(order),

    media:
      order.media.map(
        safeMedia,
      ),
  };
}

export async function listCustomerOrders(
  userId: string,
  query: CustomerOrderListQuery,
) {
  const where = {
    userId,

    ...(query.status
      ? {
          status:
            query.status,
        }
      : {}),
  };

  const [
    totalItems,
    orders,
  ] =
    await prisma.$transaction([
      prisma.order.count({
        where,
      }),

      prisma.order.findMany({
        where,

        orderBy: {
          placedAt: "desc",
        },

        skip:
          (query.page - 1) *
          query.pageSize,

        take:
          query.pageSize,

        select: {
          id: true,
          orderNumber: true,
          status: true,
          currency: true,

          subtotal: true,
          discountAmount:
            true,
          storeCreditAmount:
            true,
          giftWrapAmount:
            true,
          deliveryFee: true,
          taxAmount: true,
          totalAmount: true,

          couponCode: true,

          giftWrapSelected:
            true,

          placedAt: true,
          paidAt: true,

          estimatedDeliveryAt:
            true,

          cancelledAt: true,
          deliveredAt: true,

          items: {
            orderBy: {
              createdAt:
                "asc",
            },

            select: {
              id: true,
              itemType: true,
              productName: true,
              variantName: true,
              quantity: true,
              unitPrice: true,
              subtotal: true,
              fulfillmentType:
                true,
            },
          },

          payments: {
            orderBy: {
              createdAt:
                "desc",
            },

            take: 1,

            select: {
              id: true,
              method: true,
              status: true,
              amount: true,
              currency: true,
              failureReason:
                true,
              paidAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          shipment: {
            select: {
              status: true,
              courier: true,
              trackingNumber:
                true,
              trackingUrl: true,
              estimatedDeliveryAt:
                true,
              outForDeliveryAt:
                true,
              deliveredAt: true,
            },
          },
        },
      }),
    ]);

  const totalPages =
    Math.ceil(
      totalItems /
        query.pageSize,
    );

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

          giftWrapSelected:
            order
              .giftWrapSelected,

          placedAt:
            order.placedAt,

          paidAt:
            order.paidAt,

          estimatedDeliveryAt:
            order
              .estimatedDeliveryAt,

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

                productName:
                  item.productName,

                variantName:
                  item.variantName,

                quantity:
                  item.quantity,

                unitPrice:
                  numberValue(
                    item.unitPrice,
                  ),

                subtotal:
                  numberValue(
                    item.subtotal,
                  ),

                fulfillmentType:
                  item
                    .fulfillmentType,
              }),
            ),

          latestPayment:
            order.payments[0]
              ? formatPayment(
                  order
                    .payments[0],
                )
              : null,

          shipment:
            order.shipment,
        }),
      ),

    pagination: {
      page:
        query.page,

      pageSize:
        query.pageSize,

      totalItems,

      totalPages,

      hasPreviousPage:
        query.page > 1,

      hasNextPage:
        query.page <
        totalPages,
    },

    filters: {
      status:
        query.status ??
        null,
    },
  };
}

export async function getCustomerOrderDetail(
  userId: string,
  orderId: string,
) {
  const order =
    await loadOrderDetail({
      id: orderId,
      userId,
    });

  if (!order) {
    throw new CustomerOrderError(
      "Order not found.",
      404,
    );
  }

  return formatCustomerOrderDetail(
    order,
  );
}

export async function trackCustomerOrder(
  orderNumber: string,
  access: CustomerOrderTrackingAccess,
) {
  const order =
    await loadOrderDetail({
      orderNumber,
    });

  if (!order) {
    throw new CustomerOrderError(
      "Order tracking details were not found.",
      404,
    );
  }

  /*
   * Registered-customer orders cannot be
   * exposed using email + order number.
   * Their authenticated account is required.
   */
  if (order.userId) {
    if (
      !access.userId ||
      access.userId !==
        order.userId
    ) {
      throw new CustomerOrderError(
        "Order tracking verification failed.",
        403,
      );
    }

    return formatTrackingOrder(
      order,
    );
  }

  /*
   * Guest orders are verified using the
   * normalized checkout email plus the
   * non-sequential order number.
   */
  const expectedEmail =
    order.customerEmail
      .trim()
      .toLowerCase();

  const suppliedEmail =
    access.customerEmail
      ?.trim()
      .toLowerCase();

  if (
    !suppliedEmail ||
    suppliedEmail !==
      expectedEmail
  ) {
    throw new CustomerOrderError(
      "Order tracking verification failed.",
      403,
    );
  }

  return formatTrackingOrder(
    order,
  );
}
