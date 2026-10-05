import {
  randomUUID,
} from "node:crypto";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import type {
  PaymentMethodInput,
  PaymentSimulationOutcome,
} from "../validators/customerPayment";

export class CustomerPaymentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "CustomerPaymentError";
  }
}

export type CustomerPaymentAccess = {
  userId?: string;
  customerEmail?: string;
};

type ProviderPaymentIdentity = {
  provider: string;
  providerPaymentId: string;
};

function toCents(
  value: unknown,
): number {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 0;
  }

  return Math.round(
    numericValue * 100,
  );
}

async function loadPaymentSnapshot(
  paymentId: string,
) {
  return prisma.payment.findUnique({
    where: {
      id: paymentId,
    },

    select: {
      id: true,
      method: true,
      status: true,
      amount: true,
      currency: true,
      provider: true,
      providerPaymentId: true,
      failureReason: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,

      order: {
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          customerEmail: true,
          status: true,
          totalAmount: true,
          paidAt: true,
        },
      },
    },
  });
}

async function requirePaymentSnapshot(
  paymentId: string,
) {
  const payment =
    await loadPaymentSnapshot(
      paymentId,
    );

  if (!payment) {
    throw new CustomerPaymentError(
      "Payment not found.",
      404,
    );
  }

  return payment;
}

function assertCustomerPaymentAccess(
  payment: NonNullable<
    Awaited<
      ReturnType<
        typeof loadPaymentSnapshot
      >
    >
  >,
  access: CustomerPaymentAccess,
): void {
  if (
    payment.order.userId
  ) {
    if (
      !access.userId ||
      access.userId !==
        payment.order.userId
    ) {
      throw new CustomerPaymentError(
        "You do not have access to this payment.",
        403,
      );
    }

    return;
  }

  const expectedEmail =
    payment.order
      .customerEmail
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
    throw new CustomerPaymentError(
      "Guest payment verification failed.",
      403,
    );
  }
}

function formatPaymentSnapshot(
  payment: NonNullable<
    Awaited<
      ReturnType<
        typeof loadPaymentSnapshot
      >
    >
  >,
) {
  return {
    payment: {
      id: payment.id,

      method:
        payment.method,

      status:
        payment.status,

      amount:
        Number(
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
    },

    order: {
      id:
        payment.order.id,

      orderNumber:
        payment.order
          .orderNumber,

      status:
        payment.order.status,

      totalAmount:
        Number(
          payment.order
            .totalAmount,
        ),

      paidAt:
        payment.order.paidAt,
    },
  };
}

export async function getCustomerPaymentStatus(
  paymentId: string,
  access: CustomerPaymentAccess,
) {
  const payment =
    await requirePaymentSnapshot(
      paymentId,
    );

  assertCustomerPaymentAccess(
    payment,
    access,
  );

  return formatPaymentSnapshot(
    payment,
  );
}

export async function retryCustomerPayment(
  paymentId: string,
  paymentMethod: PaymentMethodInput,
  access: CustomerPaymentAccess,
) {
  const originalPayment =
    await requirePaymentSnapshot(
      paymentId,
    );

  assertCustomerPaymentAccess(
    originalPayment,
    access,
  );

  if (
    originalPayment.status !==
    "FAILED"
  ) {
    throw new CustomerPaymentError(
      "Only a failed payment can be retried.",
      409,
    );
  }

  if (
    originalPayment.order.status !==
    "PENDING_PAYMENT"
  ) {
    throw new CustomerPaymentError(
      "The order is no longer awaiting payment.",
      409,
    );
  }

  if (
    toCents(
      originalPayment.order
        .totalAmount,
    ) <= 0
  ) {
    throw new CustomerPaymentError(
      "This order does not require an external payment.",
      409,
    );
  }

  const newPayment =
    await prisma.$transaction(
      async (transaction) => {
        const payment =
          await transaction.payment.findUnique(
            {
              where: {
                id: paymentId,
              },

              include: {
                order: true,
              },
            },
          );

        if (!payment) {
          throw new CustomerPaymentError(
            "Payment not found.",
            404,
          );
        }

        if (
          payment.status !==
          "FAILED"
        ) {
          throw new CustomerPaymentError(
            "Only a failed payment can be retried.",
            409,
          );
        }

        if (
          payment.order.status !==
          "PENDING_PAYMENT"
        ) {
          throw new CustomerPaymentError(
            "The order is no longer awaiting payment.",
            409,
          );
        }

        const activePayment =
          await transaction.payment.findFirst(
            {
              where: {
                orderId:
                  payment.orderId,

                id: {
                  not:
                    payment.id,
                },

                status: {
                  in: [
                    "PENDING",
                    "AUTHORIZED",
                    "PAID",
                  ],
                },
              },

              select: {
                id: true,
                status: true,
              },
            },
          );

        if (activePayment) {
          throw new CustomerPaymentError(
            "Another payment attempt is already active for this order.",
            409,
          );
        }

        return transaction.payment.create(
          {
            data: {
              orderId:
                payment.orderId,

              method:
                paymentMethod,

              status:
                "PENDING",

              amount:
                payment.order
                  .totalAmount,

              currency:
                payment.order
                  .currency,
            },
          },
        );
      },
    );

  const snapshot =
    await requirePaymentSnapshot(
      newPayment.id,
    );

  return formatPaymentSnapshot(
    snapshot,
  );
}

export async function authorizeCustomerPayment(
  paymentId: string,
  identity: ProviderPaymentIdentity,
) {
  await prisma.$transaction(
    async (transaction) => {
      const payment =
        await transaction.payment.findUnique(
          {
            where: {
              id: paymentId,
            },

            include: {
              order: true,
            },
          },
        );

      if (!payment) {
        throw new CustomerPaymentError(
          "Payment not found.",
          404,
        );
      }

      if (
        payment.provider &&
        payment.provider !==
          identity.provider
      ) {
        throw new CustomerPaymentError(
          "This payment is already linked to a different payment provider.",
          409,
        );
      }

      if (
        payment.providerPaymentId &&
        payment.providerPaymentId !==
          identity.providerPaymentId
      ) {
        throw new CustomerPaymentError(
          "This payment is already linked to a different provider payment.",
          409,
        );
      }

      const providerIdConflict =
        await transaction.payment.findFirst(
          {
            where: {
              providerPaymentId:
                identity
                  .providerPaymentId,

              id: {
                not:
                  payment.id,
              },
            },

            select: {
              id: true,
            },
          },
        );

      if (providerIdConflict) {
        throw new CustomerPaymentError(
          "The provider payment ID is already assigned to another payment.",
          409,
        );
      }

      if (
        payment.status ===
          "AUTHORIZED" ||
        payment.status ===
          "PAID"
      ) {
        return;
      }

      if (
        payment.status !==
        "PENDING"
      ) {
        throw new CustomerPaymentError(
          `A ${payment.status.toLowerCase()} payment cannot be authorized.`,
          409,
        );
      }

      if (
        payment.order.status !==
        "PENDING_PAYMENT"
      ) {
        throw new CustomerPaymentError(
          "The order is no longer awaiting payment.",
          409,
        );
      }

      const updated =
        await transaction.payment.updateMany(
          {
            where: {
              id:
                payment.id,

              status:
                "PENDING",
            },

            data: {
              status:
                "AUTHORIZED",

              provider:
                identity.provider,

              providerPaymentId:
                identity
                  .providerPaymentId,

              failureReason:
                null,
            },
          },
        );

      if (
        updated.count !== 1
      ) {
        throw new CustomerPaymentError(
          "Payment state changed while authorization was being processed.",
          409,
        );
      }
    },
  );

  const snapshot =
    await requirePaymentSnapshot(
      paymentId,
    );

  return formatPaymentSnapshot(
    snapshot,
  );
}

export async function completeCustomerPayment(
  paymentId: string,
  identity: ProviderPaymentIdentity,
) {
  await prisma.$transaction(
    async (transaction) => {
      const payment =
        await transaction.payment.findUnique(
          {
            where: {
              id: paymentId,
            },

            include: {
              order: {
                include: {
                  items: {
                    include: {
                      inventoryMovements:
                        true,
                    },
                  },

                  couponRedemption:
                    true,

                  shipment:
                    true,
                },
              },
            },
          },
        );

      if (!payment) {
        throw new CustomerPaymentError(
          "Payment not found.",
          404,
        );
      }

      if (
        payment.provider &&
        payment.provider !==
          identity.provider
      ) {
        throw new CustomerPaymentError(
          "This payment is already linked to a different payment provider.",
          409,
        );
      }

      if (
        payment.providerPaymentId &&
        payment.providerPaymentId !==
          identity.providerPaymentId
      ) {
        throw new CustomerPaymentError(
          "This payment is already linked to a different provider payment.",
          409,
        );
      }

      const providerIdConflict =
        await transaction.payment.findFirst(
          {
            where: {
              providerPaymentId:
                identity
                  .providerPaymentId,

              id: {
                not:
                  payment.id,
              },
            },

            select: {
              id: true,
            },
          },
        );

      if (providerIdConflict) {
        throw new CustomerPaymentError(
          "The provider payment ID is already assigned to another payment.",
          409,
        );
      }

      if (
        payment.status ===
          "PAID" &&
        payment.order.status ===
          "PAID"
      ) {
        return;
      }

      if (
        payment.status !==
          "PENDING" &&
        payment.status !==
          "AUTHORIZED"
      ) {
        throw new CustomerPaymentError(
          `A ${payment.status.toLowerCase()} payment cannot be completed.`,
          409,
        );
      }

      if (
        payment.order.status !==
        "PENDING_PAYMENT"
      ) {
        throw new CustomerPaymentError(
          "The order is no longer awaiting payment.",
          409,
        );
      }

      if (
        payment.currency !==
        payment.order.currency
      ) {
        throw new CustomerPaymentError(
          "Payment currency does not match the order currency.",
          409,
        );
      }

      if (
        toCents(
          payment.amount,
        ) !==
        toCents(
          payment.order
            .totalAmount,
        )
      ) {
        throw new CustomerPaymentError(
          "Payment amount does not match the order total.",
          409,
        );
      }

      const paidAt =
        new Date();

      const paymentUpdate =
        await transaction.payment.updateMany(
          {
            where: {
              id:
                payment.id,

              status: {
                in: [
                  "PENDING",
                  "AUTHORIZED",
                ],
              },
            },

            data: {
              status:
                "PAID",

              provider:
                identity.provider,

              providerPaymentId:
                identity
                  .providerPaymentId,

              failureReason:
                null,

              paidAt,
            },
          },
        );

      if (
        paymentUpdate.count !==
        1
      ) {
        throw new CustomerPaymentError(
          "Payment state changed while payment completion was being processed.",
          409,
        );
      }

      const orderUpdate =
        await transaction.order.updateMany(
          {
            where: {
              id:
                payment.order.id,

              status:
                "PENDING_PAYMENT",
            },

            data: {
              status:
                "PAID",

              paidAt,
            },
          },
        );

      if (
        orderUpdate.count !==
        1
      ) {
        throw new CustomerPaymentError(
          "Another payment has already completed this order.",
          409,
        );
      }

      for (
        const item of
        payment.order.items
      ) {
        if (
          item.fulfillmentType !==
            "READY_STOCK" ||
          !item.variantId
        ) {
          continue;
        }

        const reservationExists =
          item.inventoryMovements.some(
            (movement) =>
              movement.type ===
              "ORDER_RESERVED",
          );

        const fulfillmentExists =
          item.inventoryMovements.some(
            (movement) =>
              movement.type ===
              "ORDER_FULFILLED",
          );

        if (
          reservationExists &&
          !fulfillmentExists
        ) {
          await transaction.inventoryMovement.create(
            {
              data: {
                variantId:
                  item.variantId,

                orderItemId:
                  item.id,

                type:
                  "ORDER_FULFILLED",

                /*
                 * Stock was already decremented
                 * when checkout reserved it.
                 * This zero-quantity movement
                 * records the lifecycle transition
                 * without decrementing stock twice.
                 */
                quantity: 0,

                reason:
                  `Payment completed for order ${payment.order.orderNumber}`,
              },
            },
          );
        }
      }

      /*
       * Checkout now reserves coupon usage when
       * the order is created. This fallback keeps
       * older pending orders compatible.
       */
      if (
        !payment.order
          .couponRedemption &&
        payment.order
          .couponCode &&
        toCents(
          payment.order
            .discountAmount,
        ) > 0
      ) {
        const coupon =
          await transaction.coupon.findUnique(
            {
              where: {
                code:
                  payment.order
                    .couponCode,
              },

              select: {
                id: true,
                code: true,
              },
            },
          );

        if (coupon) {
          await transaction.couponRedemption.create(
            {
              data: {
                couponId:
                  coupon.id,

                userId:
                  payment.order
                    .userId,

                orderId:
                  payment.order.id,

                codeSnapshot:
                  coupon.code,

                discountAmount:
                  payment.order
                    .discountAmount,
              },
            },
          );
        }
      }

      await transaction.orderStatusHistory.create(
        {
          data: {
            orderId:
              payment.order.id,

            status:
              "PAID",

            createdByUserId:
              null,

            note:
              "Payment completed successfully.",
          },
        },
      );

      if (
        !payment.order.shipment
      ) {
        await transaction.shipment.create(
          {
            data: {
              orderId:
                payment.order.id,

              status:
                "PENDING",

              estimatedDeliveryAt:
                payment.order
                  .estimatedDeliveryAt,
            },
          },
        );
      }
    },
  );

  const snapshot =
    await requirePaymentSnapshot(
      paymentId,
    );

  return formatPaymentSnapshot(
    snapshot,
  );
}

export async function failCustomerPayment(
  paymentId: string,
  identity: ProviderPaymentIdentity,
  failureReason: string,
) {
  const safeFailureReason =
    failureReason
      .trim()
      .slice(
        0,
        500,
      ) ||
    "Payment failed.";

  await prisma.$transaction(
    async (transaction) => {
      const payment =
        await transaction.payment.findUnique(
          {
            where: {
              id: paymentId,
            },

            include: {
              order: true,
            },
          },
        );

      if (!payment) {
        throw new CustomerPaymentError(
          "Payment not found.",
          404,
        );
      }

      if (
        payment.provider &&
        payment.provider !==
          identity.provider
      ) {
        throw new CustomerPaymentError(
          "This payment is already linked to a different payment provider.",
          409,
        );
      }

      if (
        payment.providerPaymentId &&
        payment.providerPaymentId !==
          identity.providerPaymentId
      ) {
        throw new CustomerPaymentError(
          "This payment is already linked to a different provider payment.",
          409,
        );
      }

      const providerIdConflict =
        await transaction.payment.findFirst(
          {
            where: {
              providerPaymentId:
                identity
                  .providerPaymentId,

              id: {
                not:
                  payment.id,
              },
            },

            select: {
              id: true,
            },
          },
        );

      if (providerIdConflict) {
        throw new CustomerPaymentError(
          "The provider payment ID is already assigned to another payment.",
          409,
        );
      }

      if (
        payment.status ===
          "FAILED"
      ) {
        return;
      }

      if (
        payment.status ===
          "PAID" ||
        payment.status ===
          "REFUNDED" ||
        payment.status ===
          "PARTIALLY_REFUNDED"
      ) {
        throw new CustomerPaymentError(
          `A ${payment.status.toLowerCase()} payment cannot be marked as failed.`,
          409,
        );
      }

      if (
        payment.order.status !==
          "PENDING_PAYMENT"
      ) {
        throw new CustomerPaymentError(
          "The order is no longer awaiting payment.",
          409,
        );
      }

      const updated =
        await transaction.payment.updateMany(
          {
            where: {
              id:
                payment.id,

              status: {
                in: [
                  "PENDING",
                  "AUTHORIZED",
                ],
              },
            },

            data: {
              status:
                "FAILED",

              provider:
                identity.provider,

              providerPaymentId:
                identity
                  .providerPaymentId,

              failureReason:
                safeFailureReason,
            },
          },
        );

      if (
        updated.count !==
        1
      ) {
        throw new CustomerPaymentError(
          "Payment state changed while the failure was being processed.",
          409,
        );
      }
    },
  );

  const snapshot =
    await requirePaymentSnapshot(
      paymentId,
    );

  return formatPaymentSnapshot(
    snapshot,
  );
}

export async function simulateCustomerPayment(
  paymentId: string,
  outcome: PaymentSimulationOutcome,
  failureReason: string | undefined,
  access: CustomerPaymentAccess,
) {
  if (
    env.NODE_ENV ===
    "production"
  ) {
    throw new CustomerPaymentError(
      "Payment simulation is unavailable in production.",
      404,
    );
  }

  const payment =
    await requirePaymentSnapshot(
      paymentId,
    );

  assertCustomerPaymentAccess(
    payment,
    access,
  );

  if (
    payment.provider &&
    payment.provider !==
      "development-simulator"
  ) {
    throw new CustomerPaymentError(
      "A provider-linked payment cannot be simulated.",
      409,
    );
  }

  const identity = {
    provider:
      "development-simulator",

    providerPaymentId:
      payment.providerPaymentId ??
      `dev_${randomUUID()}`,
  };

  if (
    outcome ===
    "AUTHORIZED"
  ) {
    return authorizeCustomerPayment(
      paymentId,
      identity,
    );
  }

  if (
    outcome ===
    "PAID"
  ) {
    return completeCustomerPayment(
      paymentId,
      identity,
    );
  }

  return failCustomerPayment(
    paymentId,
    identity,
    failureReason ??
      "Development payment simulation failed.",
  );
}
