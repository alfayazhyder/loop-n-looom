import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

import type {
  CreateCouponInput,
  UpdateCouponInput,
  CouponQuery,
  SubscriberQuery,
  ReportQuery,
} from "../validators/adminMarketing";

export class AdminMarketingError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AdminMarketingError";
  }
}

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function paginate(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

function money(value: { toString(): string } | null | undefined) {
  return value?.toString() ?? "0";
}

function validateCoupon(
  type: string,
  discountValue: number,
  minimum: number | null | undefined,
  maximum: number | null | undefined,
  startsAt: Date | null | undefined,
  endsAt: Date | null | undefined,
) {
  if (/PERCENT|PCT/i.test(type) && discountValue > 100) {
    throw new AdminMarketingError(
      "Percentage discounts cannot exceed 100.",
      400,
    );
  }

  if (
    minimum != null &&
    maximum != null &&
    maximum < 0
  ) {
    throw new AdminMarketingError(
      "Invalid coupon amount limits.",
      400,
    );
  }

  if (
    startsAt &&
    endsAt &&
    endsAt <= startsAt
  ) {
    throw new AdminMarketingError(
      "Coupon end date must be after start date.",
      400,
    );
  }
}

function formatUaeDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dateBounds(query: ReportQuery) {
  const today = formatUaeDay(new Date());

  const to = query.to ?? today;

  const defaultFrom = formatUaeDay(
    new Date(
      Date.parse(`${to}T00:00:00+04:00`) -
      29 * 86400000,
    ),
  );

  const from = query.from ?? defaultFrom;

  const start = new Date(`${from}T00:00:00+04:00`);
  const endStart = new Date(`${to}T00:00:00+04:00`);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(endStart.getTime()) ||
    formatUaeDay(start) !== from ||
    formatUaeDay(endStart) !== to
  ) {
    throw new AdminMarketingError(
      "Invalid report date.",
      400,
    );
  }

  const days =
    (endStart.getTime() - start.getTime()) /
    86400000;

  if (days < 0 || days > 365) {
    throw new AdminMarketingError(
      "Report dates must cover 1 to 366 days.",
      400,
    );
  }

  return {
    from,
    to,
    start,
    end: new Date(endStart.getTime() + 86400000),
    timezone: "Asia/Dubai",
  };
}

type Bounds = ReturnType<typeof dateBounds>;

function paidOrderWhere(bounds: Bounds): Prisma.OrderWhereInput {
  return {
    paidAt: {
      gte: bounds.start,
      lt: bounds.end,
    },
    status: {
      in: [
        "PAID",
        "CONFIRMED",
        "IN_PRODUCTION",
        "QUALITY_CHECK",
        "READY_FOR_PACKING",
        "PACKED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
      ],
    },
  };
}

function placedOrderWhere(bounds: Bounds): Prisma.OrderWhereInput {
  return {
    placedAt: {
      gte: bounds.start,
      lt: bounds.end,
    },
  };
}

function couponView(coupon: {
  discountValue: { toString(): string };
  minimumOrderAmount: { toString(): string } | null;
  maximumDiscountAmount: { toString(): string } | null;
  [key: string]: unknown;
}) {
  return {
    ...coupon,
    discountValue: money(coupon.discountValue),
    minimumOrderAmount:
      coupon.minimumOrderAmount === null
        ? null
        : money(coupon.minimumOrderAmount),
    maximumDiscountAmount:
      coupon.maximumDiscountAmount === null
        ? null
        : money(coupon.maximumDiscountAmount),
  };
}

export async function listCoupons(query: CouponQuery) {
  const where: Prisma.CouponWhereInput = {
    ...(query.active === undefined
      ? {}
      : { isActive: query.active }),
    ...(query.search
      ? {
          OR: [
            {
              code: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [total, coupons] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    }),
  ]);

  return {
    coupons: coupons.map(couponView),
    pagination: paginate(query.page, query.limit, total),
  };
}

export async function getCoupon(couponId: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    include: {
      _count: {
        select: { redemptions: true },
      },
    },
  });

  if (!coupon) {
    throw new AdminMarketingError("Coupon not found.", 404);
  }

  return { coupon: couponView(coupon) };
}

export async function createCoupon(
  adminId: string,
  input: CreateCouponInput,
) {
  validateCoupon(
    input.type,
    input.discountValue,
    input.minimumOrderAmount,
    input.maximumDiscountAmount,
    input.startsAt ? new Date(input.startsAt) : null,
    input.endsAt ? new Date(input.endsAt) : null,
  );

  try {
    const coupon = await prisma.$transaction(async (tx) => {
      const created = await tx.coupon.create({
        data: {
          code: input.code,
          description: input.description,
          type: input.type as Prisma.CouponCreateInput["type"],
          discountValue: input.discountValue,
          minimumOrderAmount: input.minimumOrderAmount,
          maximumDiscountAmount: input.maximumDiscountAmount,
          usageLimit: input.usageLimit,
          usageLimitPerUser: input.usageLimitPerUser,
          startsAt: input.startsAt
            ? new Date(input.startsAt)
            : null,
          endsAt: input.endsAt
            ? new Date(input.endsAt)
            : null,
          isActive: input.isActive ?? true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminId,
          action: "COUPON_CREATED",
          entityType: "COUPON",
          entityId: created.id,
          details: { code: created.code },
        },
      });

      return created;
    });

    return getCoupon(coupon.id);
  } catch (error) {
    if (isUniqueError(error)) {
      throw new AdminMarketingError(
        "Coupon code already exists.",
        409,
      );
    }

    throw error;
  }
}

export async function updateCoupon(
  adminId: string,
  couponId: string,
  input: UpdateCouponInput,
) {
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.coupon.findUnique({
        where: { id: couponId },
        include: {
          _count: {
            select: { redemptions: true },
          },
        },
      });

      if (!current) {
        throw new AdminMarketingError("Coupon not found.", 404);
      }

      const type = input.type ?? current.type;

      const discount =
        input.discountValue ??
        Number(current.discountValue.toString());

      const minimum =
        input.minimumOrderAmount === undefined
          ? current.minimumOrderAmount
            ? Number(current.minimumOrderAmount.toString())
            : null
          : input.minimumOrderAmount;

      const maximum =
        input.maximumDiscountAmount === undefined
          ? current.maximumDiscountAmount
            ? Number(current.maximumDiscountAmount.toString())
            : null
          : input.maximumDiscountAmount;

      const start =
        input.startsAt === undefined
          ? current.startsAt
          : input.startsAt
            ? new Date(input.startsAt)
            : null;

      const end =
        input.endsAt === undefined
          ? current.endsAt
          : input.endsAt
            ? new Date(input.endsAt)
            : null;

      validateCoupon(
        type,
        discount,
        minimum,
        maximum,
        start,
        end,
      );

      const usageLimit =
        input.usageLimit === undefined
          ? current.usageLimit
          : input.usageLimit;

      if (
        usageLimit !== null &&
        usageLimit < current._count.redemptions
      ) {
        throw new AdminMarketingError(
          "Usage limit cannot be below existing redemptions.",
          409,
        );
      }

      await tx.coupon.update({
        where: { id: couponId },
        data: {
          ...(input.code !== undefined
            ? { code: input.code }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.type !== undefined
            ? {
                type:
                  input.type as Prisma.CouponCreateInput["type"],
              }
            : {}),
          ...(input.discountValue !== undefined
            ? { discountValue: input.discountValue }
            : {}),
          ...(input.minimumOrderAmount !== undefined
            ? { minimumOrderAmount: input.minimumOrderAmount }
            : {}),
          ...(input.maximumDiscountAmount !== undefined
            ? { maximumDiscountAmount: input.maximumDiscountAmount }
            : {}),
          ...(input.usageLimit !== undefined
            ? { usageLimit: input.usageLimit }
            : {}),
          ...(input.usageLimitPerUser !== undefined
            ? { usageLimitPerUser: input.usageLimitPerUser }
            : {}),
          ...(input.startsAt !== undefined
            ? { startsAt: start }
            : {}),
          ...(input.endsAt !== undefined
            ? { endsAt: end }
            : {}),
          ...(input.isActive !== undefined
            ? { isActive: input.isActive }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminId,
          action: "COUPON_UPDATED",
          entityType: "COUPON",
          entityId: couponId,
          details: {
            changedFields: Object.keys(input),
          },
        },
      });
    });

    return getCoupon(couponId);
  } catch (error) {
    if (isUniqueError(error)) {
      throw new AdminMarketingError(
        "Coupon code already exists.",
        409,
      );
    }

    throw error;
  }
}

export async function listSubscribers(
  query: SubscriberQuery,
) {
  const where: Prisma.NewsletterSubscriberWhereInput = {
    ...(query.active === undefined
      ? {}
      : { isActive: query.active }),
    ...(query.search
      ? {
          email: {
            contains: query.search,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const [total, subscribers] = await Promise.all([
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        userId: true,
        email: true,
        preferredLocale: true,
        isActive: true,
        consentAt: true,
        unsubscribedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    subscribers,
    pagination: paginate(query.page, query.limit, total),
  };
}

export async function unsubscribeSubscriber(
  adminId: string,
  subscriberId: string,
) {
  return prisma.$transaction(async (tx) => {
    const subscriber =
      await tx.newsletterSubscriber.findUnique({
        where: { id: subscriberId },
      });

    if (!subscriber) {
      throw new AdminMarketingError(
        "Newsletter subscriber not found.",
        404,
      );
    }

    if (subscriber.isActive) {
      await tx.newsletterSubscriber.update({
        where: { id: subscriberId },
        data: {
          isActive: false,
          unsubscribedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: adminId,
          action: "NEWSLETTER_UNSUBSCRIBED",
          entityType: "NEWSLETTER_SUBSCRIBER",
          entityId: subscriberId,
        },
      });
    }

    const updated =
      await tx.newsletterSubscriber.findUniqueOrThrow({
        where: { id: subscriberId },
        select: {
          id: true,
          email: true,
          isActive: true,
          unsubscribedAt: true,
        },
      });

    return { subscriber: updated };
  });
}

export async function marketingOverview(query: ReportQuery) {
  const bounds = dateBounds(query);

  const paidWhere = paidOrderWhere(bounds);

  const [
    customers,
    newCustomers,
    subscribers,
    activeCoupons,
    pendingReviews,
    paidOrders,
    statuses,
  ] = await Promise.all([
    prisma.user.count({
      where: { role: "CUSTOMER" },
    }),

    prisma.user.count({
      where: {
        role: "CUSTOMER",
        createdAt: {
          gte: bounds.start,
          lt: bounds.end,
        },
      },
    }),

    prisma.newsletterSubscriber.count({
      where: { isActive: true },
    }),

    prisma.coupon.count({
      where: { isActive: true },
    }),

    prisma.review.count({
      where: { status: "PENDING" },
    }),

    prisma.order.aggregate({
      where: paidWhere,
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),

    prisma.order.groupBy({
      by: ["status"],
      where: placedOrderWhere(bounds),
      _count: { _all: true },
    }),
  ]);

  const totalPaid =
    Number(money(paidOrders._sum.totalAmount));

  return {
    period: {
      from: bounds.from,
      to: bounds.to,
      timezone: bounds.timezone,
    },

    customers: {
      total: customers,
      newInPeriod: newCustomers,
    },

    newsletter: {
      activeSubscribers: subscribers,
    },

    marketing: {
      activeCoupons,
      pendingReviews,
    },

    orders: {
      paidOrderCount: paidOrders._count._all,

      paidOrderGMV: totalPaid.toFixed(2),

      averagePaidOrderValue:
        paidOrders._count._all > 0
          ? (
              totalPaid /
              paidOrders._count._all
            ).toFixed(2)
          : "0.00",

      currency: "AED",

      statusDistribution: statuses.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),

      note:
        "Paid-order GMV excludes orders currently cancelled or refunded. It is not net revenue.",
    },
  };
}

export async function ordersReport(query: ReportQuery) {
  const bounds = dateBounds(query);
  const where = placedOrderWhere(bounds);

  const [total, orders, totals] = await Promise.all([
    prisma.order.count({ where }),

    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        currency: true,
        subtotal: true,
        discountAmount: true,
        totalAmount: true,
        placedAt: true,
        paidAt: true,
        deliveredAt: true,
      },
    }),

    prisma.order.aggregate({
      where,
      _sum: { totalAmount: true },
    }),
  ]);

  return {
    period: {
      from: bounds.from,
      to: bounds.to,
      timezone: bounds.timezone,
    },

    currency: "AED",

    totals: {
      orderCount: total,
      allOrderValue: money(totals._sum.totalAmount),
      note:
        "All-order value includes unpaid orders and is not revenue.",
    },

    orders: orders.map((order) => ({
      ...order,
      subtotal: money(order.subtotal),
      discountAmount: money(order.discountAmount),
      totalAmount: money(order.totalAmount),
    })),

    pagination: paginate(query.page, query.limit, total),
  };
}

export async function productsReport(query: ReportQuery) {
  const bounds = dateBounds(query);

  const groups = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: {
        is: paidOrderWhere(bounds),
      },
    },
    _count: { _all: true },
    _sum: {
      quantity: true,
      subtotal: true,
    },
    orderBy: {
      _sum: { subtotal: "desc" },
    },
    take: 20,
  });

  const ids = groups
    .map((row) => row.productId)
    .filter((id): id is string => id !== null);

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      status: true,
    },
  });

  const lookup = new Map(
    products.map((product) => [product.id, product]),
  );

  return {
    period: {
      from: bounds.from,
      to: bounds.to,
      timezone: bounds.timezone,
    },

    currency: "AED",

    products: groups.map((row) => ({
      productId: row.productId,
      product:
        row.productId === null
          ? null
          : lookup.get(row.productId) ?? null,

      orderItemCount: row._count._all,
      unitsSold: row._sum.quantity ?? 0,
      itemValue: money(row._sum.subtotal),
    })),

    note:
      "Top 20 products by paid-order item value; excludes refunded and cancelled orders.",
  };
}

export async function couponsReport(query: ReportQuery) {
  const bounds = dateBounds(query);

  const groups = await prisma.couponRedemption.groupBy({
    by: ["couponId"],
    where: {
      redeemedAt: {
        gte: bounds.start,
        lt: bounds.end,
      },
    },
    _count: { _all: true },
    _sum: { discountAmount: true },
    orderBy: {
      _count: { couponId: "desc" },
    },
    take: 20,
  });

  const coupons = await prisma.coupon.findMany({
    where: {
      id: {
        in: groups.map((row) => row.couponId),
      },
    },
    select: {
      id: true,
      code: true,
      type: true,
      isActive: true,
    },
  });

  const lookup = new Map(
    coupons.map((coupon) => [coupon.id, coupon]),
  );

  return {
    period: {
      from: bounds.from,
      to: bounds.to,
      timezone: bounds.timezone,
    },

    currency: "AED",

    coupons: groups.map((row) => ({
      couponId: row.couponId,
      coupon: lookup.get(row.couponId) ?? null,
      redemptions: row._count._all,
      discountAmount: money(row._sum.discountAmount),
    })),
  };
}