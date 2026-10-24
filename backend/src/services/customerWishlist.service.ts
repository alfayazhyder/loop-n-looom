import type {
  Prisma,
} from "../generated/prisma/client";

import { prisma } from "../lib/prisma";

import type {
  UpdateWishlistPreferencesInput,
  WishlistListQuery,
} from "../validators/customerWishlist";

export class CustomerWishlistError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "CustomerWishlistError";
  }
}

const wishlistInclude = {
  product: {
    include: {
      category:
        true,

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
      },

      variants: {
        where: {
          isActive:
            true,
        },

        orderBy: {
          createdAt:
            "asc",
        },
      },
    },
  },
} satisfies Prisma.WishlistItemInclude;

function activeWishlistWhere(
  userId: string,
): Prisma.WishlistItemWhereInput {
  return {
    userId,

    product: {
      status:
        "ACTIVE",

      category: {
        isActive:
          true,
      },
    },
  };
}

function withWishlistMetadata<
  T extends {
    priceWhenAdded:
      unknown;

    product: {
      basePrice:
        unknown;
      variants: Array<{
        stockQuantity:
          number;
      }>;
    };
  },
>(
  item: T,
) {
  const priceWhenAdded =
    item.priceWhenAdded ===
    null
      ? null
      : Number(
          item.priceWhenAdded,
        );

  const currentPrice =
    Number(
      item.product.basePrice,
    );

  const availableStock =
    item.product.variants.reduce(
      (
        total,
        variant,
      ) =>
        total +
        Math.max(
          0,
          variant.stockQuantity,
        ),
      0,
    );

  return {
    ...item,

    wishlistMeta: {
      priceWhenAdded,

      currentPrice,

      priceChanged:
        priceWhenAdded !==
          null &&
        priceWhenAdded !==
          currentPrice,

      priceDropped:
        priceWhenAdded !==
          null &&
        currentPrice <
          priceWhenAdded,

      availableStock,
    },
  };
}

export async function getCustomerWishlist(
  userId: string,
  query: WishlistListQuery,
) {
  const where =
    activeWishlistWhere(
      userId,
    );

  const skip =
    (query.page - 1) *
    query.limit;

  const items =
    await prisma.wishlistItem.findMany(
      {
        where,

        skip,

        take:
          query.limit,

        orderBy: {
          createdAt:
            "desc",
        },

        include:
          wishlistInclude,
      },
    );

  const total =
    await prisma.wishlistItem.count(
      {
        where,
      },
    );

  return {
    items:
      items.map(
        withWishlistMetadata,
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

export async function addProductToWishlist(
  userId: string,
  productId: string,
) {
  const product =
    await prisma.product.findFirst(
      {
        where: {
          id:
            productId,

          status:
            "ACTIVE",

          category: {
            isActive:
              true,
          },
        },

        select: {
          id:
            true,

          basePrice:
            true,
        },
      },
    );

  if (!product) {
    throw new CustomerWishlistError(
      "Product not found or unavailable.",
      404,
    );
  }

  const existing =
    await prisma.wishlistItem.findUnique(
      {
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      },
    );

  if (existing) {
    throw new CustomerWishlistError(
      "Product is already in your wishlist.",
      409,
    );
  }

  try {
    const item =
      await prisma.wishlistItem.create(
        {
          data: {
            userId,

            productId,

            priceWhenAdded:
              product.basePrice,

            notifyOnRestock:
              true,

            notifyOnPriceDrop:
              true,
          },

          include:
            wishlistInclude,
        },
      );

    return withWishlistMetadata(
      item,
    );
  } catch (error) {
    /*
     * Protect against two simultaneous
     * requests attempting to add the
     * same product.
     */
    const duplicate =
      await prisma.wishlistItem.findUnique(
        {
          where: {
            userId_productId: {
              userId,
              productId,
            },
          },
        },
      );

    if (duplicate) {
      throw new CustomerWishlistError(
        "Product is already in your wishlist.",
        409,
      );
    }

    throw error;
  }
}

export async function updateWishlistPreferences(
  userId: string,
  productId: string,
  input: UpdateWishlistPreferencesInput,
) {
  const existing =
    await prisma.wishlistItem.findUnique(
      {
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      },
    );

  if (!existing) {
    throw new CustomerWishlistError(
      "Wishlist item not found.",
      404,
    );
  }

  const item =
    await prisma.wishlistItem.update(
      {
        where: {
          id:
            existing.id,
        },

        data: {
          ...(input.notifyOnRestock !==
          undefined
            ? {
                notifyOnRestock:
                  input.notifyOnRestock,
              }
            : {}),

          ...(input.notifyOnPriceDrop !==
          undefined
            ? {
                notifyOnPriceDrop:
                  input.notifyOnPriceDrop,
              }
            : {}),
        },

        include:
          wishlistInclude,
      },
    );

  return withWishlistMetadata(
    item,
  );
}

export async function removeProductFromWishlist(
  userId: string,
  productId: string,
) {
  const result =
    await prisma.wishlistItem.deleteMany(
      {
        where: {
          userId,

          productId,
        },
      },
    );

  if (
    result.count ===
    0
  ) {
    throw new CustomerWishlistError(
      "Wishlist item not found.",
      404,
    );
  }

  return {
    removed:
      true,
  };
}
