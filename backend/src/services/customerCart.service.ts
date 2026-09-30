import { prisma } from "../lib/prisma";
import {
  createGuestCartToken,
  hashGuestCartToken,
} from "../utils/cartToken";
import type {
  AddCustomerCartItemInput,
  ApplyCustomerCartCouponInput,
  UpdateCustomerCartGiftOptionsInput,
  UpdateCustomerCartItemInput,
} from "../validators/customerCart";

export class CustomerCartError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "CustomerCartError";
  }
}

export type CustomerCartIdentity = {
  userId?: string;
  guestToken?: string;
};

const GUEST_CART_LIFETIME_MS =
  30 * 24 * 60 * 60 * 1000;

const couponInclude = {
  _count: {
    select: {
      redemptions: true,
    },
  },
} as const;

const cartInclude = {
  coupon: {
    include: couponInclude,
  },

  items: {
    orderBy: {
      createdAt: "asc" as const,
    },

    include: {
      product: {
        include: {
          category: true,

          media: {
            orderBy: [
              {
                isPrimary:
                  "desc" as const,
              },
              {
                sortOrder:
                  "asc" as const,
              },
            ],
          },
        },
      },

      variant: true,

      bouquetBuild: {
        include: {
          items: {
            include: {
              component: true,
            },
          },
        },
      },
    },
  },
};

function roundMoney(
  value: number,
): number {
  return (
    Math.round(
      (value + Number.EPSILON) *
        100,
    ) / 100
  );
}

function getGuestCartExpiry(): Date {
  return new Date(
    Date.now() +
      GUEST_CART_LIFETIME_MS,
  );
}

async function ensureActiveCustomer(
  userId: string,
): Promise<void> {
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        status: true,
      },
    });

  if (!user) {
    throw new CustomerCartError(
      "Customer account not found.",
      404,
    );
  }

  if (user.status !== "ACTIVE") {
    throw new CustomerCartError(
      "Customer account is not active.",
      403,
    );
  }
}

async function findUserCart(
  userId: string,
) {
  return prisma.cart.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },

    orderBy: {
      updatedAt: "desc",
    },

    include: cartInclude,
  });
}

async function findGuestCart(
  guestToken: string,
) {
  const guestTokenHash =
    hashGuestCartToken(
      guestToken,
    );

  return prisma.cart.findFirst({
    where: {
      guestToken:
        guestTokenHash,
      userId: null,
      status: "ACTIVE",

      OR: [
        {
          expiresAt: null,
        },

        {
          expiresAt: {
            gt: new Date(),
          },
        },
      ],
    },

    orderBy: {
      updatedAt: "desc",
    },

    include: cartInclude,
  });
}

function sameCustomization(
  first: unknown,
  second: unknown,
): boolean {
  return (
    JSON.stringify(first) ===
    JSON.stringify(second)
  );
}

async function mergeGuestCartIntoCustomerCart(
  userId: string,
  guestToken: string,
): Promise<void> {
  const guestCart =
    await findGuestCart(
      guestToken,
    );

  if (!guestCart) {
    return;
  }

  const customerCart =
    await findUserCart(userId);

  if (!customerCart) {
    await prisma.cart.update({
      where: {
        id: guestCart.id,
      },

      data: {
        userId,
        guestToken: null,
        expiresAt: null,
        updatedAt: new Date(),
      },
    });

    return;
  }

  await prisma.$transaction(
    async (transaction) => {
      for (
        const guestItem of
        guestCart.items
      ) {
        const matchingItem =
          customerCart.items.find(
            (customerItem) =>
              customerItem.productId ===
                guestItem.productId &&
              customerItem.variantId ===
                guestItem.variantId &&
              customerItem.bouquetBuildId ===
                guestItem.bouquetBuildId &&
              sameCustomization(
                customerItem.customization,
                guestItem.customization,
              ),
          );

        if (matchingItem) {
          const mergedQuantity =
            Math.min(
              99,
              matchingItem.quantity +
                guestItem.quantity,
            );

          await transaction.cartItem.update(
            {
              where: {
                id: matchingItem.id,
              },

              data: {
                quantity:
                  mergedQuantity,
              },
            },
          );

          await transaction.cartItem.delete(
            {
              where: {
                id: guestItem.id,
              },
            },
          );
        } else {
          await transaction.cartItem.update(
            {
              where: {
                id: guestItem.id,
              },

              data: {
                cartId:
                  customerCart.id,
              },
            },
          );
        }
      }

      await transaction.cart.update(
        {
          where: {
            id: customerCart.id,
          },

          data: {
            couponId:
              customerCart.couponId ??
              guestCart.couponId,

            giftWrapSelected:
              customerCart.giftWrapSelected ||
              guestCart.giftWrapSelected,

            giftMessage:
              customerCart.giftMessage ??
              guestCart.giftMessage,

            updatedAt: new Date(),
          },
        },
      );

      await transaction.cart.update(
        {
          where: {
            id: guestCart.id,
          },

          data: {
            status: "ABANDONED",
            guestToken: null,
            expiresAt: null,
            couponId: null,
            giftWrapSelected:
              false,
            giftMessage: null,
            updatedAt: new Date(),
          },
        },
      );
    },
  );
}

async function findActiveCart(
  identity: CustomerCartIdentity,
) {
  if (identity.userId) {
    await ensureActiveCustomer(
      identity.userId,
    );

    if (identity.guestToken) {
      await mergeGuestCartIntoCustomerCart(
        identity.userId,
        identity.guestToken,
      );
    }

    return findUserCart(
      identity.userId,
    );
  }

  if (!identity.guestToken) {
    return null;
  }

  return findGuestCart(
    identity.guestToken,
  );
}

async function getOrCreateActiveCart(
  identity: CustomerCartIdentity,
) {
  const existingCart =
    await findActiveCart(identity);

  if (existingCart) {
    return {
      cart: existingCart,
      newGuestToken: undefined,
    };
  }

  if (identity.userId) {
    const cart =
      await prisma.cart.create({
        data: {
          userId:
            identity.userId,
          status: "ACTIVE",
        },

        include: cartInclude,
      });

    return {
      cart,
      newGuestToken:
        undefined,
    };
  }

  const rawGuestToken =
    createGuestCartToken();

  const guestTokenHash =
    hashGuestCartToken(
      rawGuestToken,
    );

  const cart =
    await prisma.cart.create({
      data: {
        guestToken:
          guestTokenHash,

        status: "ACTIVE",

        expiresAt:
          getGuestCartExpiry(),
      },

      include: cartInclude,
    });

  return {
    cart,
    newGuestToken:
      rawGuestToken,
  };
}

async function refreshCartActivity(
  cartId: string,
  identity: CustomerCartIdentity,
): Promise<void> {
  await prisma.cart.update({
    where: {
      id: cartId,
    },

    data: {
      updatedAt: new Date(),

      ...(identity.userId
        ? {}
        : {
            expiresAt:
              getGuestCartExpiry(),
          }),
    },
  });
}

async function getUpdatedCart(
  cartId: string,
) {
  const cart =
    await prisma.cart.findUnique({
      where: {
        id: cartId,
      },

      include: cartInclude,
    });

  if (!cart) {
    throw new CustomerCartError(
      "Cart could not be loaded.",
      500,
    );
  }

  return cart;
}

function calculateSubtotal(
  cart: NonNullable<
    Awaited<
      ReturnType<
        typeof findActiveCart
      >
    >
  >,
): number {
  const subtotal =
    cart.items.reduce(
      (total, item) => {
        const unitPrice =
          item.unitPrice ===
          null
            ? 0
            : Number(
                item.unitPrice,
              );

        return (
          total +
          unitPrice *
            item.quantity
        );
      },
      0,
    );

  return roundMoney(
    subtotal,
  );
}

function isCouponCurrentlyValid(
  coupon: NonNullable<
    NonNullable<
      Awaited<
        ReturnType<
          typeof findActiveCart
        >
      >
    >["coupon"]
  >,
  subtotal: number,
): boolean {
  const now = new Date();

  if (!coupon.isActive) {
    return false;
  }

  if (
    coupon.startsAt &&
    coupon.startsAt > now
  ) {
    return false;
  }

  if (
    coupon.endsAt &&
    coupon.endsAt < now
  ) {
    return false;
  }

  if (
    coupon.usageLimit !==
      null &&
    coupon._count
      .redemptions >=
      coupon.usageLimit
  ) {
    return false;
  }

  if (
    coupon.minimumOrderAmount !==
      null &&
    subtotal <
      Number(
        coupon.minimumOrderAmount,
      )
  ) {
    return false;
  }

  return true;
}

function calculateCouponDiscount(
  cart: NonNullable<
    Awaited<
      ReturnType<
        typeof findActiveCart
      >
    >
  >,
  subtotal: number,
): number {
  const coupon =
    cart.coupon;

  if (!coupon) {
    return 0;
  }

  if (
    !isCouponCurrentlyValid(
      coupon,
      subtotal,
    )
  ) {
    return 0;
  }

  let discount = 0;

  if (
    coupon.type ===
    "PERCENTAGE"
  ) {
    discount =
      subtotal *
      (Number(
        coupon.discountValue,
      ) /
        100);
  } else {
    discount = Number(
      coupon.discountValue,
    );
  }

  if (
    coupon.maximumDiscountAmount !==
    null
  ) {
    discount = Math.min(
      discount,
      Number(
        coupon.maximumDiscountAmount,
      ),
    );
  }

  discount = Math.min(
    discount,
    subtotal,
  );

  return roundMoney(
    Math.max(0, discount),
  );
}

function calculateCartSummary(
  cart:
    | NonNullable<
        Awaited<
          ReturnType<
            typeof findActiveCart
          >
        >
      >
    | null,
) {
  if (!cart) {
    return {
      itemCount: 0,
      subtotal: 0,
      discountAmount: 0,
      total: 0,
      currency: "AED",
    };
  }

  const itemCount =
    cart.items.reduce(
      (total, item) =>
        total +
        item.quantity,
      0,
    );

  const subtotal =
    calculateSubtotal(cart);

  const discountAmount =
    calculateCouponDiscount(
      cart,
      subtotal,
    );

  const total = roundMoney(
    Math.max(
      0,
      subtotal -
        discountAmount,
    ),
  );

  return {
    itemCount,
    subtotal,
    discountAmount,
    total,
    currency: "AED",
  };
}

function formatCoupon(
  coupon:
    | NonNullable<
        Awaited<
          ReturnType<
            typeof findActiveCart
          >
        >
      >["coupon"]
    | null,
) {
  if (!coupon) {
    return null;
  }

  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    discountValue:
      coupon.discountValue,
    minimumOrderAmount:
      coupon.minimumOrderAmount,
    maximumDiscountAmount:
      coupon.maximumDiscountAmount,
    startsAt:
      coupon.startsAt,
    endsAt: coupon.endsAt,
  };
}

function formatCart(
  cart: NonNullable<
    Awaited<
      ReturnType<
        typeof findActiveCart
      >
    >
  >,
) {
  return {
    id: cart.id,
    userId: cart.userId,
    couponId:
      cart.couponId,
    status: cart.status,

    giftWrapSelected:
      cart.giftWrapSelected,

    giftMessage:
      cart.giftMessage,

    expiresAt:
      cart.expiresAt,

    createdAt:
      cart.createdAt,

    updatedAt:
      cart.updatedAt,

    coupon:
      formatCoupon(
        cart.coupon,
      ),

    items: cart.items,
  };
}

async function getPurchasableProduct(
  productId: string,
) {
  const product =
    await prisma.product.findFirst({
      where: {
        id: productId,
        status: "ACTIVE",

        category: {
          isActive: true,
        },
      },

      include: {
        category: true,

        variants: {
          where: {
            isActive: true,
          },

          orderBy: {
            createdAt: "asc",
          },
        },

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
      },
    });

  if (!product) {
    throw new CustomerCartError(
      "Product is not available for purchase.",
      404,
    );
  }

  return product;
}

function getSelectedVariant(
  product: Awaited<
    ReturnType<
      typeof getPurchasableProduct
    >
  >,
  variantId?: string,
) {
  if (!variantId) {
    if (
      product.fulfillmentType ===
      "READY_STOCK"
    ) {
      throw new CustomerCartError(
        "Select a product variant before adding this ready-stock product to the cart.",
        400,
      );
    }

    if (
      product.variants.length >
      0
    ) {
      throw new CustomerCartError(
        "Select a product variant before adding this product to the cart.",
        400,
      );
    }

    return null;
  }

  const variant =
    product.variants.find(
      (item) =>
        item.id ===
        variantId,
    );

  if (!variant) {
    throw new CustomerCartError(
      "Product variant is not available.",
      404,
    );
  }

  return variant;
}

function ensureQuantityAvailable(
  fulfillmentType: string,
  stockQuantity:
    | number
    | null,
  quantity: number,
): void {
  if (
    fulfillmentType !==
    "READY_STOCK"
  ) {
    return;
  }

  if (
    stockQuantity ===
      null ||
    stockQuantity <
      quantity
  ) {
    throw new CustomerCartError(
      "Requested quantity is not available in stock.",
      409,
    );
  }
}

async function requireExistingCart(
  identity: CustomerCartIdentity,
) {
  const cart =
    await findActiveCart(
      identity,
    );

  if (!cart) {
    throw new CustomerCartError(
      "Cart not found.",
      404,
    );
  }

  return cart;
}

export async function getCustomerCart(
  identity: CustomerCartIdentity,
) {
  const cart =
    await findActiveCart(
      identity,
    );

  if (!cart) {
    return {
      cart: null,

      summary:
        calculateCartSummary(
          null,
        ),
    };
  }

  return {
    cart:
      formatCart(cart),

    summary:
      calculateCartSummary(
        cart,
      ),
  };
}

export async function addCustomerCartItem(
  identity: CustomerCartIdentity,
  data: AddCustomerCartItemInput,
) {
  const product =
    await getPurchasableProduct(
      data.productId,
    );

  const variant =
    getSelectedVariant(
      product,
      data.variantId,
    );

  const unitPrice =
    variant?.price !==
      null &&
    variant?.price !==
      undefined
      ? variant.price
      : product.basePrice;

  const {
    cart,
    newGuestToken,
  } =
    await getOrCreateActiveCart(
      identity,
    );

  const existingItem =
    await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId:
          product.id,

        variantId:
          variant?.id ??
          null,

        bouquetBuildId:
          null,
      },
    });

  const nextQuantity =
    (existingItem?.quantity ??
      0) +
    data.quantity;

  if (
    nextQuantity > 99
  ) {
    throw new CustomerCartError(
      "Cart item quantity cannot exceed 99.",
      400,
    );
  }

  ensureQuantityAvailable(
    product.fulfillmentType,
    variant?.stockQuantity ??
      null,
    nextQuantity,
  );

  if (existingItem) {
    await prisma.cartItem.update({
      where: {
        id: existingItem.id,
      },

      data: {
        quantity:
          nextQuantity,
        unitPrice,
      },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId:
          product.id,

        variantId:
          variant?.id,

        quantity:
          data.quantity,

        unitPrice,
      },
    });
  }

  await refreshCartActivity(
    cart.id,
    identity,
  );

  const updatedCart =
    await getUpdatedCart(
      cart.id,
    );

  return {
    cart:
      formatCart(
        updatedCart,
      ),

    summary:
      calculateCartSummary(
        updatedCart,
      ),

    guestToken:
      newGuestToken,
  };
}

export async function updateCustomerCartItem(
  identity: CustomerCartIdentity,
  itemId: string,
  data: UpdateCustomerCartItemInput,
) {
  const cart =
    await requireExistingCart(
      identity,
    );

  const cartItem =
    cart.items.find(
      (item) =>
        item.id === itemId,
    );

  if (!cartItem) {
    throw new CustomerCartError(
      "Cart item not found.",
      404,
    );
  }

  if (
    !cartItem.productId
  ) {
    throw new CustomerCartError(
      "This cart item cannot be updated using the product quantity endpoint.",
      400,
    );
  }

  const product =
    await getPurchasableProduct(
      cartItem.productId,
    );

  const variant =
    getSelectedVariant(
      product,
      cartItem.variantId ??
        undefined,
    );

  ensureQuantityAvailable(
    product.fulfillmentType,
    variant?.stockQuantity ??
      null,
    data.quantity,
  );

  const unitPrice =
    variant?.price !==
      null &&
    variant?.price !==
      undefined
      ? variant.price
      : product.basePrice;

  await prisma.cartItem.update({
    where: {
      id: cartItem.id,
    },

    data: {
      quantity:
        data.quantity,

      unitPrice,
    },
  });

  await refreshCartActivity(
    cart.id,
    identity,
  );

  const updatedCart =
    await getUpdatedCart(
      cart.id,
    );

  return {
    cart:
      formatCart(
        updatedCart,
      ),

    summary:
      calculateCartSummary(
        updatedCart,
      ),
  };
}

export async function removeCustomerCartItem(
  identity: CustomerCartIdentity,
  itemId: string,
) {
  const cart =
    await requireExistingCart(
      identity,
    );

  const cartItem =
    cart.items.find(
      (item) =>
        item.id === itemId,
    );

  if (!cartItem) {
    throw new CustomerCartError(
      "Cart item not found.",
      404,
    );
  }

  await prisma.cartItem.delete({
    where: {
      id: cartItem.id,
    },
  });

  const remainingItems =
    await prisma.cartItem.count({
      where: {
        cartId: cart.id,
      },
    });

  if (
    remainingItems === 0
  ) {
    await prisma.cart.update({
      where: {
        id: cart.id,
      },

      data: {
        couponId: null,

        giftWrapSelected:
          false,

        giftMessage:
          null,

        updatedAt:
          new Date(),

        ...(identity.userId
          ? {}
          : {
              expiresAt:
                getGuestCartExpiry(),
            }),
      },
    });
  } else {
    await refreshCartActivity(
      cart.id,
      identity,
    );
  }

  const updatedCart =
    await getUpdatedCart(
      cart.id,
    );

  return {
    cart:
      formatCart(
        updatedCart,
      ),

    summary:
      calculateCartSummary(
        updatedCart,
      ),
  };
}

export async function clearCustomerCart(
  identity: CustomerCartIdentity,
) {
  const cart =
    await requireExistingCart(
      identity,
    );

  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    }),

    prisma.cart.update({
      where: {
        id: cart.id,
      },

      data: {
        couponId: null,

        giftWrapSelected:
          false,

        giftMessage:
          null,

        updatedAt:
          new Date(),

        ...(identity.userId
          ? {}
          : {
              expiresAt:
                getGuestCartExpiry(),
            }),
      },
    }),
  ]);

  const updatedCart =
    await getUpdatedCart(
      cart.id,
    );

  return {
    cart:
      formatCart(
        updatedCart,
      ),

    summary:
      calculateCartSummary(
        updatedCart,
      ),
  };
}

export async function updateCustomerCartGiftOptions(
  identity: CustomerCartIdentity,
  data: UpdateCustomerCartGiftOptionsInput,
) {
  const cart =
    await requireExistingCart(
      identity,
    );

  if (
    cart.items.length === 0
  ) {
    throw new CustomerCartError(
      "Add at least one item before selecting gift options.",
      400,
    );
  }

  if (
    data.giftWrapSelected ===
    true
  ) {
    const hasNonWrappableProduct =
      cart.items.some(
        (item) =>
          item.product !==
            null &&
          !item.product
            .isGiftWrappable,
      );

    if (
      hasNonWrappableProduct
    ) {
      throw new CustomerCartError(
        "One or more items in this cart are not eligible for gift wrapping.",
        409,
      );
    }
  }

  const giftMessage =
    data.giftMessage ===
    undefined
      ? undefined
      : data.giftMessage ===
            null ||
          data.giftMessage
            .trim() === ""
        ? null
        : data.giftMessage.trim();

  await prisma.cart.update({
    where: {
      id: cart.id,
    },

    data: {
      ...(data.giftWrapSelected ===
      undefined
        ? {}
        : {
            giftWrapSelected:
              data.giftWrapSelected,
          }),

      ...(giftMessage ===
      undefined
        ? {}
        : {
            giftMessage,
          }),

      updatedAt:
        new Date(),

      ...(identity.userId
        ? {}
        : {
            expiresAt:
              getGuestCartExpiry(),
          }),
    },
  });

  const updatedCart =
    await getUpdatedCart(
      cart.id,
    );

  return {
    cart:
      formatCart(
        updatedCart,
      ),

    summary:
      calculateCartSummary(
        updatedCart,
      ),
  };
}

export async function applyCustomerCartCoupon(
  identity: CustomerCartIdentity,
  data: ApplyCustomerCartCouponInput,
) {
  const cart =
    await requireExistingCart(
      identity,
    );

  if (
    cart.items.length === 0
  ) {
    throw new CustomerCartError(
      "Add at least one item before applying a coupon.",
      400,
    );
  }

  const coupon =
    await prisma.coupon.findFirst({
      where: {
        code: {
          equals: data.code,
          mode: "insensitive",
        },
      },

      include:
        couponInclude,
    });

  if (!coupon) {
    throw new CustomerCartError(
      "Coupon code is invalid.",
      404,
    );
  }

  const subtotal =
    calculateSubtotal(cart);

  if (
    !isCouponCurrentlyValid(
      coupon,
      subtotal,
    )
  ) {
    throw new CustomerCartError(
      "Coupon is not currently available for this cart.",
      409,
    );
  }

  await prisma.cart.update({
    where: {
      id: cart.id,
    },

    data: {
      couponId:
        coupon.id,

      updatedAt:
        new Date(),

      ...(identity.userId
        ? {}
        : {
            expiresAt:
              getGuestCartExpiry(),
          }),
    },
  });

  const updatedCart =
    await getUpdatedCart(
      cart.id,
    );

  return {
    cart:
      formatCart(
        updatedCart,
      ),

    summary:
      calculateCartSummary(
        updatedCart,
      ),
  };
}

export async function removeCustomerCartCoupon(
  identity: CustomerCartIdentity,
) {
  const cart =
    await requireExistingCart(
      identity,
    );

  await prisma.cart.update({
    where: {
      id: cart.id,
    },

    data: {
      couponId: null,

      updatedAt:
        new Date(),

      ...(identity.userId
        ? {}
        : {
            expiresAt:
              getGuestCartExpiry(),
          }),
    },
  });

  const updatedCart =
    await getUpdatedCart(
      cart.id,
    );

  return {
    cart:
      formatCart(
        updatedCart,
      ),

    summary:
      calculateCartSummary(
        updatedCart,
      ),
  };
}