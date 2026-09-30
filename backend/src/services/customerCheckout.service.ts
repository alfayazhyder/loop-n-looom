import { prisma } from "../lib/prisma";
import {
  CustomerCartError,
  getCustomerCart,
  type CustomerCartIdentity,
} from "./customerCart.service";
import {
  hashGuestCartToken,
} from "../utils/cartToken";
import {
  createOrderNumberCandidate,
} from "../utils/orderNumber";
import type {
  CheckoutPreviewInput,
  PlaceCustomerOrderInput,
} from "../validators/customerCheckout";

export class CustomerCheckoutError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name =
      "CustomerCheckoutError";
  }
}

export type CustomerCheckoutIdentity =
  CustomerCartIdentity;

const checkoutCartInclude = {
  coupon: true,

  items: {
    orderBy: {
      createdAt: "asc" as const,
    },

    include: {
      product: {
        include: {
          category: true,

          variants: {
            where: {
              isActive: true,
            },

            orderBy: {
              createdAt:
                "asc" as const,
            },
          },
        },
      },

      variant: true,

      bouquetBuild: true,
    },
  },
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

function fromCents(
  cents: number,
): number {
  return (
    Math.round(cents) /
    100
  );
}

function cleanOptionalText(
  value:
    | string
    | null
    | undefined,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}

async function mergeGuestCartIfNeeded(
  identity: CustomerCheckoutIdentity,
): Promise<void> {
  if (
    !identity.userId ||
    !identity.guestToken
  ) {
    return;
  }

  try {
    await getCustomerCart(
      identity,
    );
  } catch (error) {
    if (
      error instanceof
      CustomerCartError
    ) {
      throw new CustomerCheckoutError(
        error.message,
        error.statusCode,
      );
    }

    throw error;
  }
}

async function findCheckoutCart(
  identity: CustomerCheckoutIdentity,
) {
  await mergeGuestCartIfNeeded(
    identity,
  );

  if (identity.userId) {
    return prisma.cart.findFirst({
      where: {
        userId:
          identity.userId,
        status: "ACTIVE",
      },

      orderBy: {
        updatedAt: "desc",
      },

      include:
        checkoutCartInclude,
    });
  }

  if (
    !identity.guestToken
  ) {
    return null;
  }

  const guestTokenHash =
    hashGuestCartToken(
      identity.guestToken,
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

    include:
      checkoutCartInclude,
  });
}

async function requireCheckoutCart(
  identity: CustomerCheckoutIdentity,
) {
  const cart =
    await findCheckoutCart(
      identity,
    );

  if (!cart) {
    throw new CustomerCheckoutError(
      "Active cart not found.",
      404,
    );
  }

  if (
    cart.items.length === 0
  ) {
    throw new CustomerCheckoutError(
      "Your cart is empty.",
      400,
    );
  }

  return cart;
}

async function getCheckoutCustomer(
  userId?: string,
) {
  if (!userId) {
    return null;
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        storeCreditBalance:
          true,
      },
    });

  if (!user) {
    throw new CustomerCheckoutError(
      "Customer account not found.",
      404,
    );
  }

  if (
    user.status !== "ACTIVE"
  ) {
    throw new CustomerCheckoutError(
      "Customer account is not active.",
      403,
    );
  }

  if (
    user.role !== "CUSTOMER"
  ) {
    throw new CustomerCheckoutError(
      "Only customer accounts can use customer checkout.",
      403,
    );
  }

  return user;
}

function resolveCustomerSnapshot(
  input:
    | CheckoutPreviewInput
    | PlaceCustomerOrderInput,
  customer: Awaited<
    ReturnType<
      typeof getCheckoutCustomer
    >
  >,
) {
  const accountName =
    customer
      ? [
          customer.firstName,
          customer.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim()
      : "";

  const customerName =
    input.customerName?.trim() ||
    accountName;

  const customerEmail =
    input.customerEmail
      ?.trim()
      .toLowerCase() ||
    customer?.email
      .trim()
      .toLowerCase() ||
    "";

  const customerPhone =
    input.customerPhone
      ?.trim() ||
    customer?.phone?.trim() ||
    "";

  if (!customerName) {
    throw new CustomerCheckoutError(
      "Customer name is required for checkout.",
      400,
    );
  }

  if (!customerEmail) {
    throw new CustomerCheckoutError(
      "Customer email is required for checkout.",
      400,
    );
  }

  if (!customerPhone) {
    throw new CustomerCheckoutError(
      "Customer phone number is required for checkout.",
      400,
    );
  }

  return {
    customerName,
    customerEmail,
    customerPhone,
  };
}

async function resolveShippingSnapshot(
  input:
    | CheckoutPreviewInput
    | PlaceCustomerOrderInput,
  userId?: string,
) {
  if (input.addressId) {
    if (!userId) {
      throw new CustomerCheckoutError(
        "Guest checkout cannot use a saved customer address.",
        400,
      );
    }

    const address =
      await prisma.address.findFirst({
        where: {
          id: input.addressId,
          userId,
        },
      });

    if (!address) {
      throw new CustomerCheckoutError(
        "Shipping address not found.",
        404,
      );
    }

    return {
      recipientName:
        address.recipientName,

      phone: address.phone,

      emirate:
        address.emirate,

      city: address.city,

      area: address.area,

      street:
        address.street,

      building:
        address.building,

      apartmentOrVilla:
        address.apartmentOrVilla,

      landmark:
        address.landmark,

      deliveryInstructions:
        address.deliveryInstructions,
    };
  }

  if (!input.shippingAddress) {
    throw new CustomerCheckoutError(
      "Shipping address is required.",
      400,
    );
  }

  return {
    recipientName:
      input.shippingAddress
        .recipientName
        .trim(),

    phone:
      input.shippingAddress.phone
        .trim(),

    emirate:
      input.shippingAddress
        .emirate,

    city:
      input.shippingAddress.city
        .trim(),

    area:
      input.shippingAddress.area
        .trim(),

    street:
      cleanOptionalText(
        input.shippingAddress
          .street,
      ),

    building:
      cleanOptionalText(
        input.shippingAddress
          .building,
      ),

    apartmentOrVilla:
      cleanOptionalText(
        input.shippingAddress
          .apartmentOrVilla,
      ),

    landmark:
      cleanOptionalText(
        input.shippingAddress
          .landmark,
      ),

    deliveryInstructions:
      cleanOptionalText(
        input.shippingAddress
          .deliveryInstructions,
      ),
  };
}

async function buildCheckoutLines(
  cart: NonNullable<
    Awaited<
      ReturnType<
        typeof findCheckoutCart
      >
    >
  >,
) {
  return Promise.all(
    cart.items.map(
      async (cartItem) => {
        const hasProduct =
          Boolean(
            cartItem.productId,
          );

        const hasBouquet =
          Boolean(
            cartItem.bouquetBuildId,
          );

        if (
          Number(hasProduct) +
            Number(hasBouquet) !==
          1
        ) {
          throw new CustomerCheckoutError(
            "One or more cart items are invalid.",
            409,
          );
        }

        if (
          cartItem.quantity < 1 ||
          cartItem.quantity > 99
        ) {
          throw new CustomerCheckoutError(
            "One or more cart quantities are invalid.",
            409,
          );
        }

        if (cartItem.productId) {
          const product =
            await prisma.product.findFirst({
              where: {
                id: cartItem.productId,

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
                    createdAt:
                      "asc",
                  },
                },
              },
            });

          if (!product) {
            throw new CustomerCheckoutError(
              "One or more products in your cart are no longer available.",
              409,
            );
          }

          let variant:
            | (typeof product.variants)[number]
            | null = null;

          if (
            cartItem.variantId
          ) {
            variant =
              product.variants.find(
                (candidate) =>
                  candidate.id ===
                  cartItem.variantId,
              ) ?? null;

            if (!variant) {
              throw new CustomerCheckoutError(
                `The selected variant for "${product.nameEn}" is no longer available.`,
                409,
              );
            }
          } else {
            if (
              product.fulfillmentType ===
              "READY_STOCK"
            ) {
              throw new CustomerCheckoutError(
                `"${product.nameEn}" requires a product variant.`,
                409,
              );
            }

            if (
              product.variants
                .length > 0
            ) {
              throw new CustomerCheckoutError(
                `Please select a variant for "${product.nameEn}".`,
                409,
              );
            }
          }

          const unitPrice =
            variant?.price ??
            product.basePrice;

          const unitPriceCents =
            toCents(unitPrice);

          if (
            unitPriceCents < 0
          ) {
            throw new CustomerCheckoutError(
              `The price for "${product.nameEn}" is invalid.`,
              409,
            );
          }

          if (
            product.fulfillmentType ===
              "READY_STOCK" &&
            (
              !variant ||
              variant.stockQuantity <
                cartItem.quantity
            )
          ) {
            throw new CustomerCheckoutError(
              `The requested quantity for "${product.nameEn}" is no longer available.`,
              409,
            );
          }

          return {
            cartItemId:
              cartItem.id,

            itemType:
              "PRODUCT" as const,

            productId:
              product.id,

            variantId:
              variant?.id ?? null,

            bouquetBuildId:
              null,

            productName:
              product.nameEn,

            variantName:
              variant?.nameEn ??
              null,

            sku:
              variant?.sku ??
              null,

            unitPriceCents,

            quantity:
              cartItem.quantity,

            subtotalCents:
              unitPriceCents *
              cartItem.quantity,

            fulfillmentType:
              product.fulfillmentType,

            productionMinDays:
              product.productionMinDays,

            productionMaxDays:
              product.productionMaxDays,

            deliveryScope:
              product.deliveryScope,

            isGiftWrappable:
              product.isGiftWrappable,

            customization:
              cartItem.customization,
          };
        }

        if (
          !cartItem.bouquetBuildId
        ) {
          throw new CustomerCheckoutError(
            "One or more cart items are invalid.",
            409,
          );
        }

        const bouquetBuild =
          await prisma.bouquetBuild.findUnique(
            {
              where: {
                id: cartItem.bouquetBuildId,
              },
            },
          );

        if (
          !bouquetBuild ||
          bouquetBuild.status ===
            "ORDERED"
        ) {
          throw new CustomerCheckoutError(
            "One or more bouquet builds are no longer available.",
            409,
          );
        }

        const unitPriceCents =
          toCents(
            bouquetBuild.totalPrice,
          );

        if (
          unitPriceCents <= 0
        ) {
          throw new CustomerCheckoutError(
            "One or more bouquet builds have an invalid price.",
            409,
          );
        }

        return {
          cartItemId:
            cartItem.id,

          itemType:
            "BOUQUET" as const,

          productId: null,

          variantId: null,

          bouquetBuildId:
            bouquetBuild.id,

          productName:
            "Custom Bouquet",

          variantName: null,

          sku: null,

          unitPriceCents,

          quantity:
            cartItem.quantity,

          subtotalCents:
            unitPriceCents *
            cartItem.quantity,

          fulfillmentType:
            "MADE_TO_ORDER" as const,

          productionMinDays: 5,

          productionMaxDays: 10,

          deliveryScope:
            "UAE_WIDE" as const,

          isGiftWrappable:
            true,

          customization:
            cartItem.customization,
        };
      },
    ),
  );
}

function calculateCouponDiscountCents(
  coupon: {
    type:
      | "PERCENTAGE"
      | "FIXED_AMOUNT";

    discountValue: unknown;

    maximumDiscountAmount:
      | unknown
      | null;
  },
  subtotalCents: number,
): number {
  let discountCents = 0;

  if (
    coupon.type ===
    "PERCENTAGE"
  ) {
    const percentage =
      Number(
        coupon.discountValue,
      );

    discountCents =
      Math.round(
        subtotalCents *
          (percentage / 100),
      );
  } else {
    discountCents =
      toCents(
        coupon.discountValue,
      );
  }

  if (
    coupon.maximumDiscountAmount !==
    null
  ) {
    discountCents =
      Math.min(
        discountCents,
        toCents(
          coupon.maximumDiscountAmount,
        ),
      );
  }

  return Math.max(
    0,
    Math.min(
      discountCents,
      subtotalCents,
    ),
  );
}

function validateCouponDatesAndMinimum(
  coupon: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    minimumOrderAmount:
      | unknown
      | null;
  },
  subtotalCents: number,
): void {
  const now =
    new Date();

  if (!coupon.isActive) {
    throw new CustomerCheckoutError(
      "The applied coupon is no longer active.",
      409,
    );
  }

  if (
    coupon.startsAt &&
    coupon.startsAt > now
  ) {
    throw new CustomerCheckoutError(
      "The applied coupon is not active yet.",
      409,
    );
  }

  if (
    coupon.endsAt &&
    coupon.endsAt < now
  ) {
    throw new CustomerCheckoutError(
      "The applied coupon has expired.",
      409,
    );
  }

  if (
    coupon.minimumOrderAmount !==
      null &&
    subtotalCents <
      toCents(
        coupon.minimumOrderAmount,
      )
  ) {
    throw new CustomerCheckoutError(
      "The cart no longer meets the coupon minimum order amount.",
      409,
    );
  }
}

async function resolveCouponForCheckout(
  cart: NonNullable<
    Awaited<
      ReturnType<
        typeof findCheckoutCart
      >
    >
  >,
  userId: string | undefined,
  subtotalCents: number,
) {
  const coupon =
    cart.coupon;

  if (!coupon) {
    return {
      couponId: null,
      couponCode: null,
      discountCents: 0,
    };
  }

  validateCouponDatesAndMinimum(
    coupon,
    subtotalCents,
  );

  const globalUsageCount =
    await prisma.couponRedemption.count({
      where: {
        couponId:
          coupon.id,
      },
    });

  if (
    coupon.usageLimit !==
      null &&
    globalUsageCount >=
      coupon.usageLimit
  ) {
    throw new CustomerCheckoutError(
      "The applied coupon has reached its usage limit.",
      409,
    );
  }

  if (
    userId &&
    coupon.usageLimitPerUser !==
      null
  ) {
    const customerUsageCount =
      await prisma.couponRedemption.count(
        {
          where: {
            couponId:
              coupon.id,

            userId,
          },
        },
      );

    if (
      customerUsageCount >=
      coupon.usageLimitPerUser
    ) {
      throw new CustomerCheckoutError(
        "You have already used this coupon the maximum number of times.",
        409,
      );
    }
  }

  return {
    couponId:
      coupon.id,

    couponCode:
      coupon.code,

    discountCents:
      calculateCouponDiscountCents(
        coupon,
        subtotalCents,
      ),
  };
}

function validateDeliveryScope(
  lines: Awaited<
    ReturnType<
      typeof buildCheckoutLines
    >
  >,
  emirate: string,
): void {
  const hasAbuDhabiOnlyItem =
    lines.some(
      (line) =>
        line.deliveryScope ===
        "ABU_DHABI_ONLY",
    );

  if (
    hasAbuDhabiOnlyItem &&
    emirate !== "ABU_DHABI"
  ) {
    throw new CustomerCheckoutError(
      "One or more items in your cart can only be delivered within Abu Dhabi.",
      409,
    );
  }
}

function validateGiftWrap(
  cart: NonNullable<
    Awaited<
      ReturnType<
        typeof findCheckoutCart
      >
    >
  >,
  lines: Awaited<
    ReturnType<
      typeof buildCheckoutLines
    >
  >,
): void {
  if (
    !cart.giftWrapSelected
  ) {
    return;
  }

  const hasIneligibleItem =
    lines.some(
      (line) =>
        line.itemType ===
          "PRODUCT" &&
        !line.isGiftWrappable,
    );

  if (
    hasIneligibleItem
  ) {
    throw new CustomerCheckoutError(
      "One or more cart items are no longer eligible for gift wrapping.",
      409,
    );
  }
}

function calculateEstimatedDeliveryAt(
  lines: Awaited<
    ReturnType<
      typeof buildCheckoutLines
    >
  >,
  emirate: string,
): Date {
  const maximumProductionDays =
    lines.reduce(
      (maximum, line) => {
        if (
          line.fulfillmentType !==
          "MADE_TO_ORDER"
        ) {
          return maximum;
        }

        const productionDays =
          line.productionMaxDays ??
          10;

        return Math.max(
          maximum,
          productionDays,
        );
      },
      0,
    );

  const deliveryDays =
    emirate ===
    "ABU_DHABI"
      ? 3
      : 5;

  const totalDays =
    maximumProductionDays +
    deliveryDays;

  return new Date(
    Date.now() +
      totalDays *
        24 *
        60 *
        60 *
        1000,
  );
}

async function prepareCheckoutState(
  identity: CustomerCheckoutIdentity,
  input:
    | CheckoutPreviewInput
    | PlaceCustomerOrderInput,
) {
  const cart =
    await requireCheckoutCart(
      identity,
    );

  const customer =
    await getCheckoutCustomer(
      identity.userId,
    );

  const contact =
    resolveCustomerSnapshot(
      input,
      customer,
    );

  const shipping =
    await resolveShippingSnapshot(
      input,
      customer?.id,
    );

  const lines =
    await buildCheckoutLines(
      cart,
    );

  validateDeliveryScope(
    lines,
    shipping.emirate,
  );

  validateGiftWrap(
    cart,
    lines,
  );

  const subtotalCents =
    lines.reduce(
      (total, line) =>
        total +
        line.subtotalCents,
      0,
    );

  const coupon =
    await resolveCouponForCheckout(
      cart,
      customer?.id,
      subtotalCents,
    );

  // No configurable delivery, tax, or
  // gift-wrap pricing model exists yet.
  // Checkout therefore snapshots these
  // amounts as zero until that pricing
  // feature is introduced.
  const deliveryFeeCents = 0;
  const taxCents = 0;
  const giftWrapCents = 0;

  const beforeStoreCreditCents =
    Math.max(
      0,
      subtotalCents -
        coupon.discountCents +
        deliveryFeeCents +
        taxCents +
        giftWrapCents,
    );

  const requestedStoreCreditCents =
    toCents(
      input.storeCreditAmount ??
        0,
    );

  if (
    requestedStoreCreditCents >
      0 &&
    !customer
  ) {
    throw new CustomerCheckoutError(
      "Store credit can only be used by a signed-in customer.",
      400,
    );
  }

  if (
    customer &&
    requestedStoreCreditCents >
      toCents(
        customer.storeCreditBalance,
      )
  ) {
    throw new CustomerCheckoutError(
      "Requested store credit exceeds your available balance.",
      409,
    );
  }

  const storeCreditCents =
    Math.min(
      requestedStoreCreditCents,
      beforeStoreCreditCents,
    );

  const totalCents =
    Math.max(
      0,
      beforeStoreCreditCents -
        storeCreditCents,
    );

  const estimatedDeliveryAt =
    calculateEstimatedDeliveryAt(
      lines,
      shipping.emirate,
    );

  return {
    cart,
    customer,
    contact,
    shipping,
    lines,

    couponId:
      coupon.couponId,

    couponCode:
      coupon.couponCode,

    subtotalCents,

    discountCents:
      coupon.discountCents,

    requestedStoreCreditCents,
    storeCreditCents,
    giftWrapCents,
    deliveryFeeCents,
    taxCents,
    totalCents,
    estimatedDeliveryAt,
  };
}

function formatCheckoutSummary(
  state: Awaited<
    ReturnType<
      typeof prepareCheckoutState
    >
  >,
) {
  return {
    subtotal:
      fromCents(
        state.subtotalCents,
      ),

    discountAmount:
      fromCents(
        state.discountCents,
      ),

    storeCreditAmount:
      fromCents(
        state.storeCreditCents,
      ),

    giftWrapAmount:
      fromCents(
        state.giftWrapCents,
      ),

    deliveryFee:
      fromCents(
        state.deliveryFeeCents,
      ),

    taxAmount:
      fromCents(
        state.taxCents,
      ),

    total:
      fromCents(
        state.totalCents,
      ),

    currency: "AED",
  };
}

async function generateUniqueOrderNumber(): Promise<string> {
  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const orderNumber =
      createOrderNumberCandidate();

    const existingOrder =
      await prisma.order.findUnique({
        where: {
          orderNumber,
        },

        select: {
          id: true,
        },
      });

    if (!existingOrder) {
      return orderNumber;
    }
  }

  throw new CustomerCheckoutError(
    "Could not generate a unique order number. Please try again.",
    500,
  );
}

export async function previewCustomerCheckout(
  identity: CustomerCheckoutIdentity,
  input: CheckoutPreviewInput,
) {
  const state =
    await prepareCheckoutState(
      identity,
      input,
    );

  return {
    cartId:
      state.cart.id,

    customer: {
      name:
        state.contact
          .customerName,

      email:
        state.contact
          .customerEmail,

      phone:
        state.contact
          .customerPhone,
    },

    shippingAddress:
      state.shipping,

    items:
      state.lines.map(
        (line) => ({
          cartItemId:
            line.cartItemId,

          itemType:
            line.itemType,

          productId:
            line.productId,

          variantId:
            line.variantId,

          bouquetBuildId:
            line.bouquetBuildId,

          productName:
            line.productName,

          variantName:
            line.variantName,

          sku:
            line.sku,

          unitPrice:
            fromCents(
              line.unitPriceCents,
            ),

          quantity:
            line.quantity,

          subtotal:
            fromCents(
              line.subtotalCents,
            ),

          fulfillmentType:
            line.fulfillmentType,

          productionMinDays:
            line.productionMinDays,

          productionMaxDays:
            line.productionMaxDays,
        }),
      ),

    couponCode:
      state.couponCode,

    giftWrapSelected:
      state.cart
        .giftWrapSelected,

    giftMessage:
      state.cart.giftMessage,

    estimatedDeliveryAt:
      state.estimatedDeliveryAt,

    paymentMethods: [
      "APPLE_PAY",
      "VISA",
      "MASTERCARD",
    ],

    summary:
      formatCheckoutSummary(
        state,
      ),
  };
}

export async function placeCustomerOrder(
  identity: CustomerCheckoutIdentity,
  input: PlaceCustomerOrderInput,
) {
  const state =
    await prepareCheckoutState(
      identity,
      input,
    );

  const orderNumber =
    await generateUniqueOrderNumber();

  const result =
    await prisma.$transaction(
      async (transaction) => {
        const claimedCart =
          await transaction.cart.updateMany(
            {
              where: {
                id: state.cart.id,
                status: "ACTIVE",
              },

              data: {
                status:
                  "CONVERTED",

                guestToken:
                  null,

                expiresAt:
                  null,

                updatedAt:
                  new Date(),
              },
            },
          );

        if (
          claimedCart.count !==
          1
        ) {
          throw new CustomerCheckoutError(
            "This cart has already been checked out or is no longer active.",
            409,
          );
        }

        const currentCart =
          await transaction.cart.findUnique(
            {
              where: {
                id: state.cart.id,
              },

              include: {
                items: true,
                coupon: true,
              },
            },
          );

        if (!currentCart) {
          throw new CustomerCheckoutError(
            "Cart could not be loaded during checkout.",
            409,
          );
        }

        const cartItemsChanged =
          currentCart.items
            .length !==
            state.cart.items
              .length ||
          currentCart.items.some(
            (currentItem) => {
              const originalItem =
                state.cart.items.find(
                  (item) =>
                    item.id ===
                    currentItem.id,
                );

              if (
                !originalItem
              ) {
                return true;
              }

              return (
                originalItem.quantity !==
                  currentItem.quantity ||
                originalItem.productId !==
                  currentItem.productId ||
                originalItem.variantId !==
                  currentItem.variantId ||
                originalItem.bouquetBuildId !==
                  currentItem.bouquetBuildId
              );
            },
          );

        const cartOptionsChanged =
          currentCart.couponId !==
            state.cart.couponId ||
          currentCart.giftWrapSelected !==
            state.cart
              .giftWrapSelected ||
          currentCart.giftMessage !==
            state.cart.giftMessage;

        if (
          cartItemsChanged ||
          cartOptionsChanged
        ) {
          throw new CustomerCheckoutError(
            "Your cart changed during checkout. Review it and try again.",
            409,
          );
        }

        let currentCoupon:
          | NonNullable<
              typeof currentCart.coupon
            >
          | null = null;

        let discountCents = 0;

        if (
          currentCart.coupon
        ) {
          currentCoupon =
            currentCart.coupon;

          validateCouponDatesAndMinimum(
            currentCoupon,
            state.subtotalCents,
          );

          const globalUsageCount =
            await transaction.couponRedemption.count(
              {
                where: {
                  couponId:
                    currentCoupon.id,
                },
              },
            );

          if (
            currentCoupon.usageLimit !==
              null &&
            globalUsageCount >=
              currentCoupon.usageLimit
          ) {
            throw new CustomerCheckoutError(
              "The applied coupon has reached its usage limit.",
              409,
            );
          }

          if (
            state.customer &&
            currentCoupon.usageLimitPerUser !==
              null
          ) {
            const customerUsageCount =
              await transaction.couponRedemption.count(
                {
                  where: {
                    couponId:
                      currentCoupon.id,

                    userId:
                      state.customer.id,
                  },
                },
              );

            if (
              customerUsageCount >=
              currentCoupon.usageLimitPerUser
            ) {
              throw new CustomerCheckoutError(
                "You have already used this coupon the maximum number of times.",
                409,
              );
            }
          }

          discountCents =
            calculateCouponDiscountCents(
              currentCoupon,
              state.subtotalCents,
            );
        }

        const beforeStoreCreditCents =
          Math.max(
            0,
            state.subtotalCents -
              discountCents +
              state.giftWrapCents +
              state.deliveryFeeCents +
              state.taxCents,
          );

        const storeCreditCents =
          Math.min(
            state.requestedStoreCreditCents,
            beforeStoreCreditCents,
          );

        if (
          storeCreditCents >
            0 &&
          !state.customer
        ) {
          throw new CustomerCheckoutError(
            "Store credit can only be used by a signed-in customer.",
            400,
          );
        }

        const totalCents =
          Math.max(
            0,
            beforeStoreCreditCents -
              storeCreditCents,
          );

        const isFullyPaid =
          totalCents === 0;

        const orderStatus =
          isFullyPaid
            ? "PAID"
            : "PENDING_PAYMENT";

        const paidAt =
          isFullyPaid
            ? new Date()
            : null;

        const order =
          await transaction.order.create(
            {
              data: {
                orderNumber,

                userId:
                  state.customer?.id ??
                  null,

                status:
                  orderStatus,

                currency: "AED",

                customerName:
                  state.contact
                    .customerName,

                customerEmail:
                  state.contact
                    .customerEmail,

                customerPhone:
                  state.contact
                    .customerPhone,

                shippingRecipientName:
                  state.shipping
                    .recipientName,

                shippingPhone:
                  state.shipping.phone,

                shippingEmirate:
                  state.shipping.emirate,

                shippingCity:
                  state.shipping.city,

                shippingArea:
                  state.shipping.area,

                shippingStreet:
                  state.shipping.street,

                shippingBuilding:
                  state.shipping
                    .building,

                shippingApartmentOrVilla:
                  state.shipping
                    .apartmentOrVilla,

                shippingLandmark:
                  state.shipping
                    .landmark,

                deliveryInstructions:
                  state.shipping
                    .deliveryInstructions,

                subtotal:
                  fromCents(
                    state.subtotalCents,
                  ),

                discountAmount:
                  fromCents(
                    discountCents,
                  ),

                storeCreditAmount:
                  fromCents(
                    storeCreditCents,
                  ),

                giftWrapAmount:
                  fromCents(
                    state.giftWrapCents,
                  ),

                deliveryFee:
                  fromCents(
                    state.deliveryFeeCents,
                  ),

                taxAmount:
                  fromCents(
                    state.taxCents,
                  ),

                totalAmount:
                  fromCents(
                    totalCents,
                  ),

                couponCode:
                  currentCoupon?.code ??
                  null,

                giftWrapSelected:
                  state.cart
                    .giftWrapSelected,

                giftMessage:
                  state.cart
                    .giftMessage,

                paidAt,

                estimatedDeliveryAt:
                  state
                    .estimatedDeliveryAt,
              },
            },
          );

        if (
          storeCreditCents >
          0
        ) {
          if (!state.customer) {
            throw new CustomerCheckoutError(
              "Customer account is required for store credit.",
              400,
            );
          }

          const creditUpdate =
            await transaction.user.updateMany(
              {
                where: {
                  id:
                    state.customer.id,

                  status:
                    "ACTIVE",

                  storeCreditBalance:
                    {
                      gte:
                        fromCents(
                          storeCreditCents,
                        ),
                    },
                },

                data: {
                  storeCreditBalance:
                    {
                      decrement:
                        fromCents(
                          storeCreditCents,
                        ),
                    },
                },
              },
            );

          if (
            creditUpdate.count !==
            1
          ) {
            throw new CustomerCheckoutError(
              "Your store credit balance changed. Review checkout and try again.",
              409,
            );
          }

          const updatedCustomer =
            await transaction.user.findUnique(
              {
                where: {
                  id:
                    state.customer.id,
                },

                select: {
                  storeCreditBalance:
                    true,
                },
              },
            );

          if (!updatedCustomer) {
            throw new CustomerCheckoutError(
              "Customer account could not be loaded.",
              500,
            );
          }

          await transaction.storeCreditTransaction.create(
            {
              data: {
                userId:
                  state.customer.id,

                orderId:
                  order.id,

                type: "SPENT",

                amount:
                  -fromCents(
                    storeCreditCents,
                  ),

                balanceAfter:
                  updatedCustomer
                    .storeCreditBalance,

                description:
                  `Store credit used for ${orderNumber}`,
              },
            },
          );
        }

        for (
          const line of
          state.lines
        ) {
          if (
            line.itemType ===
            "PRODUCT"
          ) {
            const currentProduct =
              await transaction.product.findFirst(
                {
                  where: {
                    id:
                      line.productId,

                    status:
                      "ACTIVE",

                    category: {
                      isActive:
                        true,
                    },
                  },

                  include: {
                    variants: {
                      where: {
                        isActive:
                          true,
                      },
                    },
                  },
                },
              );

            if (
              !currentProduct
            ) {
              throw new CustomerCheckoutError(
                `"${line.productName}" is no longer available.`,
                409,
              );
            }

            if (
              currentProduct
                .fulfillmentType !==
                line.fulfillmentType ||
              currentProduct
                .deliveryScope !==
                line.deliveryScope ||
              currentProduct
                .productionMinDays !==
                line.productionMinDays ||
              currentProduct
                .productionMaxDays !==
                line.productionMaxDays
            ) {
              throw new CustomerCheckoutError(
                `"${line.productName}" changed during checkout. Review your cart and try again.`,
                409,
              );
            }

            if (
              state.cart
                .giftWrapSelected &&
              !currentProduct
                .isGiftWrappable
            ) {
              throw new CustomerCheckoutError(
                `"${currentProduct.nameEn}" is no longer eligible for gift wrapping.`,
                409,
              );
            }

            if (
              currentProduct
                .deliveryScope ===
                "ABU_DHABI_ONLY" &&
              state.shipping
                .emirate !==
                "ABU_DHABI"
            ) {
              throw new CustomerCheckoutError(
                `"${currentProduct.nameEn}" can only be delivered within Abu Dhabi.`,
                409,
              );
            }

            let currentVariant:
              | (typeof currentProduct.variants)[number]
              | null = null;

            if (
              line.variantId
            ) {
              currentVariant =
                currentProduct.variants.find(
                  (variant) =>
                    variant.id ===
                    line.variantId,
                ) ?? null;

              if (
                !currentVariant
              ) {
                throw new CustomerCheckoutError(
                  `The selected variant for "${currentProduct.nameEn}" is no longer available.`,
                  409,
                );
              }
            } else {
              if (
                currentProduct
                  .fulfillmentType ===
                "READY_STOCK"
              ) {
                throw new CustomerCheckoutError(
                  `"${currentProduct.nameEn}" requires a product variant.`,
                  409,
                );
              }

              if (
                currentProduct
                  .variants
                  .length > 0
              ) {
                throw new CustomerCheckoutError(
                  `Please select a variant for "${currentProduct.nameEn}".`,
                  409,
                );
              }
            }

            const currentUnitPriceCents =
              toCents(
                currentVariant?.price ??
                  currentProduct
                    .basePrice,
              );

            if (
              currentUnitPriceCents !==
              line.unitPriceCents
            ) {
              throw new CustomerCheckoutError(
                `The price of "${currentProduct.nameEn}" changed during checkout. Review your cart and try again.`,
                409,
              );
            }

            const orderItem =
              await transaction.orderItem.create(
                {
                  data: {
                    orderId:
                      order.id,

                    productId:
                      currentProduct.id,

                    variantId:
                      currentVariant?.id ??
                      null,

                    itemType:
                      "PRODUCT",

                    productName:
                      currentProduct.nameEn,

                    variantName:
                      currentVariant
                        ?.nameEn ??
                      null,

                    sku:
                      currentVariant?.sku ??
                      null,

                    unitPrice:
                      fromCents(
                        currentUnitPriceCents,
                      ),

                    quantity:
                      line.quantity,

                    subtotal:
                      fromCents(
                        currentUnitPriceCents *
                          line.quantity,
                      ),

                    fulfillmentType:
                      currentProduct
                        .fulfillmentType,

                    productionMinDays:
                      currentProduct
                        .productionMinDays,

                    productionMaxDays:
                      currentProduct
                        .productionMaxDays,

                    customization:
                      line.customization ===
                      null
                        ? undefined
                        : line.customization,
                  },
                },
              );

            if (
              currentProduct
                .fulfillmentType ===
              "READY_STOCK"
            ) {
              if (
                !currentVariant
              ) {
                throw new CustomerCheckoutError(
                  `"${currentProduct.nameEn}" requires an available variant.`,
                  409,
                );
              }

              const stockUpdate =
                await transaction.productVariant.updateMany(
                  {
                    where: {
                      id:
                        currentVariant.id,

                      isActive:
                        true,

                      stockQuantity:
                        {
                          gte:
                            line.quantity,
                        },
                    },

                    data: {
                      stockQuantity:
                        {
                          decrement:
                            line.quantity,
                        },
                    },
                  },
                );

              if (
                stockUpdate.count !==
                1
              ) {
                throw new CustomerCheckoutError(
                  `The requested quantity for "${currentProduct.nameEn}" is no longer available.`,
                  409,
                );
              }

              await transaction.inventoryMovement.create(
                {
                  data: {
                    variantId:
                      currentVariant.id,

                    orderItemId:
                      orderItem.id,

                    type:
                      "ORDER_RESERVED",

                    quantity:
                      -line.quantity,

                    reason:
                      `Reserved for order ${orderNumber}`,
                  },
                },
              );
            }

            continue;
          }

          if (
            !line.bouquetBuildId
          ) {
            throw new CustomerCheckoutError(
              "A bouquet cart item is invalid.",
              409,
            );
          }

          const currentBouquet =
            await transaction.bouquetBuild.findUnique(
              {
                where: {
                  id:
                    line.bouquetBuildId,
                },
              },
            );

          if (
            !currentBouquet ||
            currentBouquet.status ===
              "ORDERED"
          ) {
            throw new CustomerCheckoutError(
              "A bouquet build is no longer available.",
              409,
            );
          }

          if (
            toCents(
              currentBouquet.totalPrice,
            ) !==
            line.unitPriceCents
          ) {
            throw new CustomerCheckoutError(
              "A bouquet price changed during checkout. Review your cart and try again.",
              409,
            );
          }

          await transaction.orderItem.create(
            {
              data: {
                orderId:
                  order.id,

                bouquetBuildId:
                  currentBouquet.id,

                itemType:
                  "BOUQUET",

                productName:
                  "Custom Bouquet",

                variantName:
                  null,

                sku: null,

                unitPrice:
                  fromCents(
                    line.unitPriceCents,
                  ),

                quantity:
                  line.quantity,

                subtotal:
                  fromCents(
                    line.subtotalCents,
                  ),

                fulfillmentType:
                  "MADE_TO_ORDER",

                productionMinDays:
                  line.productionMinDays,

                productionMaxDays:
                  line.productionMaxDays,

                customization:
                  line.customization ===
                  null
                    ? undefined
                    : line.customization,
              },
            },
          );

          await transaction.bouquetBuild.update(
            {
              where: {
                id:
                  currentBouquet.id,
              },

              data: {
                status:
                  "ORDERED",
              },
            },
          );
        }

        await transaction.orderStatusHistory.create(
          {
            data: {
              orderId:
                order.id,

              status:
                orderStatus,

              createdByUserId:
                state.customer?.id ??
                null,

              note:
                isFullyPaid
                  ? "Order created and fully paid using store credit."
                  : "Order created and awaiting payment.",
            },
          },
        );

        if (
          totalCents > 0
        ) {
          await transaction.payment.create(
            {
              data: {
                orderId:
                  order.id,

                method:
                  input.paymentMethod,

                status:
                  "PENDING",

                amount:
                  fromCents(
                    totalCents,
                  ),

                currency:
                  "AED",
              },
            },
          );
        }

        if (
          isFullyPaid &&
          currentCoupon
        ) {
          await transaction.couponRedemption.create(
            {
              data: {
                couponId:
                  currentCoupon.id,

                userId:
                  state.customer?.id ??
                  null,

                orderId:
                  order.id,

                codeSnapshot:
                  currentCoupon.code,

                discountAmount:
                  fromCents(
                    discountCents,
                  ),
              },
            },
          );
        }

        const completedOrder =
          await transaction.order.findUnique(
            {
              where: {
                id: order.id,
              },

              include: {
                items: true,

                statusHistory: {
                  orderBy: {
                    createdAt:
                      "asc",
                  },
                },

                payments: true,

                couponRedemption:
                  true,
              },
            },
          );

        if (!completedOrder) {
          throw new CustomerCheckoutError(
            "Order could not be loaded after checkout.",
            500,
          );
        }

        return {
          order:
            completedOrder,

          requiresPayment:
            totalCents > 0,

          paymentAmount:
            fromCents(
              totalCents,
            ),
        };
      },
    );

  return result;
}