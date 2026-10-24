import type {
  Prisma,
} from "../generated/prisma/client";

import { prisma } from "../lib/prisma";

import type {
  CreateCustomerReviewInput,
  CustomerReviewListQuery,
  PublicProductReviewQuery,
  UpdateCustomerReviewInput,
} from "../validators/customerReview";

export class CustomerReviewError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "CustomerReviewError";
  }
}

function isUniqueConstraintError(
  error: unknown,
): boolean {
  return (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error &&
    (
      error as {
        code?: unknown;
      }
    ).code ===
      "P2002"
  );
}

function formatMedia(
  media: {
    id: string;
    type:
      | "IMAGE"
      | "VIDEO";
    url: string;
    sortOrder: number;
    createdAt: Date;
  },
) {
  return {
    id:
      media.id,

    type:
      media.type,

    url:
      media.url,

    sortOrder:
      media.sortOrder,

    createdAt:
      media.createdAt,
  };
}

async function loadCustomerReview(
  userId: string,
  reviewId: string,
) {
  return prisma.review.findFirst({
    where: {
      id:
        reviewId,

      userId,
    },

    include: {
      media: {
        orderBy: [
          {
            sortOrder:
              "asc",
          },

          {
            createdAt:
              "asc",
          },
        ],
      },

      product: {
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameAr: true,

          media: {
            orderBy: [
              {
                isPrimary:
                  "desc",
              },

              {
                sortOrder:
                  "asc",
              },
            ],

            take: 1,

            select: {
              id: true,
              type: true,
              url: true,
              altTextEn:
                true,
              altTextAr:
                true,
            },
          },
        },
      },

      orderItem: {
        select: {
          id: true,
          itemType: true,
          productName: true,
          variantName: true,
          sku: true,

          order: {
            select: {
              id: true,
              orderNumber:
                true,
              status: true,
              deliveredAt:
                true,
            },
          },
        },
      },
    },
  });
}

type LoadedCustomerReview =
  NonNullable<
    Awaited<
      ReturnType<
        typeof loadCustomerReview
      >
    >
  >;

function formatCustomerReview(
  review:
    LoadedCustomerReview,
) {
  return {
    id:
      review.id,

    rating:
      review.rating,

    title:
      review.title,

    content:
      review.content,

    displayName:
      review.displayName,

    status:
      review.status,

    verifiedPurchase:
      review.verifiedPurchase,

    createdAt:
      review.createdAt,

    updatedAt:
      review.updatedAt,

    product: {
      id:
        review.product.id,

      slug:
        review.product.slug,

      nameEn:
        review.product.nameEn,

      nameAr:
        review.product.nameAr,

      primaryMedia:
        review.product
          .media[0] ??
        null,
    },

    orderItem:
      review.orderItem
        ? {
            id:
              review
                .orderItem
                .id,

            itemType:
              review
                .orderItem
                .itemType,

            productName:
              review
                .orderItem
                .productName,

            variantName:
              review
                .orderItem
                .variantName,

            sku:
              review
                .orderItem
                .sku,

            order: {
              id:
                review
                  .orderItem
                  .order
                  .id,

              orderNumber:
                review
                  .orderItem
                  .order
                  .orderNumber,

              status:
                review
                  .orderItem
                  .order
                  .status,

              deliveredAt:
                review
                  .orderItem
                  .order
                  .deliveredAt,
            },
          }
        : null,

    media:
      review.media.map(
        formatMedia,
      ),
  };
}

function publicReviewOrderBy(
  sort:
    PublicProductReviewQuery["sort"],
): Prisma.ReviewOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [
        {
          createdAt:
            "asc",
        },
      ];

    case "rating_high":
      return [
        {
          rating:
            "desc",
        },

        {
          createdAt:
            "desc",
        },
      ];

    case "rating_low":
      return [
        {
          rating:
            "asc",
        },

        {
          createdAt:
            "desc",
        },
      ];

    case "newest":
    default:
      return [
        {
          createdAt:
            "desc",
        },
      ];
  }
}

export async function listCustomerReviews(
  userId: string,
  query: CustomerReviewListQuery,
) {
  const where:
    Prisma.ReviewWhereInput =
    {
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
    reviews,
  ] =
    await prisma.$transaction([
      prisma.review.count({
        where,
      }),

      prisma.review.findMany({
        where,

        orderBy: {
          createdAt:
            "desc",
        },

        skip:
          (query.page - 1) *
          query.pageSize,

        take:
          query.pageSize,

        include: {
          media: {
            orderBy: [
              {
                sortOrder:
                  "asc",
              },

              {
                createdAt:
                  "asc",
              },
            ],
          },

          product: {
            select: {
              id: true,
              slug: true,
              nameEn: true,
              nameAr: true,

              media: {
                orderBy: [
                  {
                    isPrimary:
                      "desc",
                  },

                  {
                    sortOrder:
                      "asc",
                  },
                ],

                take: 1,

                select: {
                  id: true,
                  type: true,
                  url: true,
                  altTextEn:
                    true,
                  altTextAr:
                    true,
                },
              },
            },
          },

          orderItem: {
            select: {
              id: true,
              itemType: true,
              productName: true,
              variantName: true,
              sku: true,

              order: {
                select: {
                  id: true,
                  orderNumber:
                    true,
                  status: true,
                  deliveredAt:
                    true,
                },
              },
            },
          },
        },
      }),
    ]);

  const totalPages =
    totalItems === 0
      ? 0
      : Math.ceil(
          totalItems /
            query.pageSize,
        );

  return {
    reviews:
      reviews.map(
        formatCustomerReview,
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

export async function getCustomerReview(
  userId: string,
  reviewId: string,
) {
  const review =
    await loadCustomerReview(
      userId,
      reviewId,
    );

  if (!review) {
    throw new CustomerReviewError(
      "Review not found.",
      404,
    );
  }

  return formatCustomerReview(
    review,
  );
}

export async function createCustomerReview(
  userId: string,
  input: CreateCustomerReviewInput,
) {
  const item =
    await prisma.orderItem.findFirst({
      where: {
        id:
          input.orderItemId,

        itemType:
          "PRODUCT",

        productId: {
          not: null,
        },

        order: {
          userId,

          status:
            "DELIVERED",
        },
      },

      select: {
        id: true,
        productId: true,

        review: {
          select: {
            id: true,
          },
        },
      },
    });

  if (
    !item ||
    !item.productId
  ) {
    throw new CustomerReviewError(
      "This order item is not eligible for a review.",
      404,
    );
  }

  if (item.review) {
    throw new CustomerReviewError(
      "This order item has already been reviewed.",
      409,
    );
  }

  try {
    const review =
      await prisma.review.create({
        data: {
          userId,

          productId:
            item.productId,

          orderItemId:
            item.id,

          rating:
            input.rating,

          title:
            input.title,

          content:
            input.content,

          displayName:
            input.displayName,

          status:
            "PENDING",

          verifiedPurchase:
            true,

          ...(input.media
            .length > 0
            ? {
                media: {
                  create:
                    input.media.map(
                      (
                        media,
                        index,
                      ) => ({
                        type:
                          media.type,

                        url:
                          media.url,

                        sortOrder:
                          index,
                      }),
                    ),
                },
              }
            : {}),
        },
      });

    return getCustomerReview(
      userId,
      review.id,
    );
  } catch (error) {
    if (
      isUniqueConstraintError(
        error,
      )
    ) {
      throw new CustomerReviewError(
        "This order item has already been reviewed.",
        409,
      );
    }

    throw error;
  }
}

export async function updateCustomerReview(
  userId: string,
  reviewId: string,
  input: UpdateCustomerReviewInput,
) {
  const existing =
    await prisma.review.findFirst({
      where: {
        id:
          reviewId,

        userId,
      },

      select: {
        id: true,
      },
    });

  if (!existing) {
    throw new CustomerReviewError(
      "Review not found.",
      404,
    );
  }

  await prisma.review.update({
    where: {
      id:
        existing.id,
    },

    data: {
      ...(input.rating !==
      undefined
        ? {
            rating:
              input.rating,
          }
        : {}),

      ...(input.title !==
      undefined
        ? {
            title:
              input.title,
          }
        : {}),

      ...(input.content !==
      undefined
        ? {
            content:
              input.content,
          }
        : {}),

      ...(input.displayName !==
      undefined
        ? {
            displayName:
              input.displayName,
          }
        : {}),

      /*
       * Any customer edit requires
       * moderation again, including
       * edits to previously approved
       * or rejected reviews.
       */
      status:
        "PENDING",

      ...(input.media !==
      undefined
        ? {
            media: {
              deleteMany: {},

              create:
                input.media.map(
                  (
                    media,
                    index,
                  ) => ({
                    type:
                      media.type,

                    url:
                      media.url,

                    sortOrder:
                      index,
                  }),
                ),
            },
          }
        : {}),
    },
  });

  return getCustomerReview(
    userId,
    reviewId,
  );
}

export async function deleteCustomerReview(
  userId: string,
  reviewId: string,
) {
  const existing =
    await prisma.review.findFirst({
      where: {
        id:
          reviewId,

        userId,
      },

      select: {
        id: true,
      },
    });

  if (!existing) {
    throw new CustomerReviewError(
      "Review not found.",
      404,
    );
  }

  await prisma.review.delete({
    where: {
      id:
        existing.id,
    },
  });

  return {
    message:
      "Review deleted successfully.",
  };
}

export async function listPublicProductReviews(
  slug: string,
  query: PublicProductReviewQuery,
) {
  const product =
    await prisma.product.findFirst({
      where: {
        slug,

        status:
          "ACTIVE",

        category: {
          isActive:
            true,
        },
      },

      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameAr: true,
      },
    });

  if (!product) {
    throw new CustomerReviewError(
      "Product not found.",
      404,
    );
  }

  const approvedWhere:
    Prisma.ReviewWhereInput =
    {
      productId:
        product.id,

      status:
        "APPROVED",
    };

  const filteredWhere:
    Prisma.ReviewWhereInput =
    {
      ...approvedWhere,

      ...(query.rating
        ? {
            rating:
              query.rating,
          }
        : {}),
    };

  const [
    reviews,
    totalItems,
    overallAggregate,
    ratingGroups,
  ] =
    await Promise.all([
      prisma.review.findMany({
        where:
          filteredWhere,

        orderBy:
          publicReviewOrderBy(
            query.sort,
          ),

        skip:
          (query.page - 1) *
          query.pageSize,

        take:
          query.pageSize,

        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          displayName: true,
          verifiedPurchase:
            true,
          createdAt: true,
          updatedAt: true,

          media: {
            orderBy: [
              {
                sortOrder:
                  "asc",
              },

              {
                createdAt:
                  "asc",
              },
            ],

            select: {
              id: true,
              type: true,
              url: true,
              sortOrder: true,
              createdAt: true,
            },
          },
        },
      }),

      prisma.review.count({
        where:
          filteredWhere,
      }),

      prisma.review.aggregate({
        where:
          approvedWhere,

        _avg: {
          rating: true,
        },

        _count: {
          _all: true,
        },
      }),

      prisma.review.groupBy({
        by: [
          "rating",
        ],

        where:
          approvedWhere,

        _count: {
          _all: true,
        },

        orderBy: {
          rating:
            "asc",
        },
      }),
    ]);

  const ratingDistribution: Record<
    "1" | "2" | "3" | "4" | "5",
    number
  > = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  for (
    const group of ratingGroups
  ) {
    if (
      group.rating >= 1 &&
      group.rating <= 5
    ) {
      ratingDistribution[
        String(
          group.rating,
        ) as
          | "1"
          | "2"
          | "3"
          | "4"
          | "5"
      ] =
        group._count._all;
    }
  }

  const totalPages =
    totalItems === 0
      ? 0
      : Math.ceil(
          totalItems /
            query.pageSize,
        );

  return {
    product,

    summary: {
      averageRating:
        overallAggregate
          ._avg.rating ===
        null
          ? null
          : Number(
              overallAggregate
                ._avg.rating
                .toFixed(2),
            ),

      totalReviews:
        overallAggregate
          ._count._all,

      ratingDistribution,
    },

    reviews:
      reviews.map(
        (review) => ({
          id:
            review.id,

          rating:
            review.rating,

          title:
            review.title,

          content:
            review.content,

          displayName:
            review.displayName ??
            "Verified Customer",

          verifiedPurchase:
            review
              .verifiedPurchase,

          createdAt:
            review.createdAt,

          updatedAt:
            review.updatedAt,

          media:
            review.media.map(
              formatMedia,
            ),
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
      rating:
        query.rating ??
        null,

      sort:
        query.sort,
    },
  };
}
