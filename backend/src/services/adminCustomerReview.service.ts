import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

import type {
  AdminCustomerQuery,
  AdminCustomerStatus,
  AdminReviewQuery,
  AdminReviewStatus,
} from "../validators/adminCustomerReview";

export class AdminCustomerReviewError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AdminCustomerReviewError";
  }
}

function pagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listAdminCustomers(query: AdminCustomerQuery) {
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? {
      OR: [
        { email: { contains: query.search, mode: "insensitive" } },
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
        { phone: { contains: query.search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [total, customers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        preferredLocale: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            addresses: true,
          },
        },
      },
    }),
  ]);

  return {
    customers,
    pagination: pagination(query.page, query.limit, total),
  };
}

export async function getAdminCustomer(customerId: string) {
  const customer = await prisma.user.findFirst({
    where: {
      id: customerId,
      role: "CUSTOMER",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      preferredLocale: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      storeCreditBalance: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          addresses: true,
          orders: true,
          reviews: true,
        },
      },
      orders: {
        take: 10,
        orderBy: { placedAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          currency: true,
          placedAt: true,
        },
      },
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          status: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              nameEn: true,
            },
          },
        },
      },
    },
  });

  if (!customer) {
    throw new AdminCustomerReviewError(
      "Customer not found.",
      404,
    );
  }

  return {
    customer: {
      ...customer,
      storeCreditBalance: customer.storeCreditBalance.toString(),
    },
  };
}

export async function updateAdminCustomerStatus(
  customerId: string,
  status: AdminCustomerStatus,
) {
  const customer = await prisma.user.findFirst({
    where: {
      id: customerId,
      role: "CUSTOMER",
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!customer) {
    throw new AdminCustomerReviewError(
      "Customer not found.",
      404,
    );
  }

  if (customer.status !== status) {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: {
          id: customerId,
          role: "CUSTOMER",
          status: customer.status,
        },
        data: { status },
      });

      if (changed.count !== 1) {
        throw new AdminCustomerReviewError(
          "Customer status changed concurrently. Retry.",
          409,
        );
      }

      await tx.refreshSession.deleteMany({
        where: { userId: customerId },
      });
    });
  }

  return getAdminCustomer(customerId);
}

export async function listAdminReviews(query: AdminReviewQuery) {
  const where: Prisma.ReviewWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.rating ? { rating: query.rating } : {}),
    ...(query.search ? {
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { content: { contains: query.search, mode: "insensitive" } },
        { displayName: { contains: query.search, mode: "insensitive" } },
        {
          product: {
            is: {
              nameEn: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          user: {
            is: {
              email: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    } : {}),
  };

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        displayName: true,
        status: true,
        verifiedPurchase: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        product: {
          select: {
            id: true,
            slug: true,
            nameEn: true,
          },
        },
        _count: {
          select: {
            media: true,
          },
        },
      },
    }),
  ]);

  return {
    reviews,
    pagination: pagination(query.page, query.limit, total),
  };
}

export async function getAdminReview(reviewId: string) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      product: {
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,
        },
      },
      media: {
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!review) {
    throw new AdminCustomerReviewError(
      "Review not found.",
      404,
    );
  }

  return { review };
}

export async function moderateAdminReview(
  reviewId: string,
  status: AdminReviewStatus,
) {
  const existing = await prisma.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  if (!existing) {
    throw new AdminCustomerReviewError(
      "Review not found.",
      404,
    );
  }

  if (existing.status !== status) {
    const result = await prisma.review.updateMany({
      where: {
        id: reviewId,
        updatedAt: existing.updatedAt,
      },
      data: { status },
    });

    if (result.count !== 1) {
      throw new AdminCustomerReviewError(
        "Review changed concurrently. Retry.",
        409,
      );
    }
  }

  return getAdminReview(reviewId);
}