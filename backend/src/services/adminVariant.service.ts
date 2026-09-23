import { prisma } from "../lib/prisma";

import type {
  AdjustInventoryInput,
  CreateAdminVariantInput,
  UpdateAdminVariantInput,
} from "../validators/adminVariant";

export class AdminVariantError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AdminVariantError";
  }
}

async function ensureProductExists(
  productId: string,
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    throw new AdminVariantError(
      "Product not found.",
      404,
    );
  }
}

async function getOwnedVariant(
  productId: string,
  variantId: string,
) {
  const variant =
    await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
      },
    });

  if (!variant) {
    throw new AdminVariantError(
      "Product variant not found.",
      404,
    );
  }

  return variant;
}

async function ensureSkuAvailable(
  sku: string,
  excludeVariantId?: string,
): Promise<void> {
  const existingVariant =
    await prisma.productVariant.findUnique({
      where: {
        sku,
      },
      select: {
        id: true,
      },
    });

  if (
    existingVariant &&
    existingVariant.id !== excludeVariantId
  ) {
    throw new AdminVariantError(
      "A product variant with this SKU already exists.",
      409,
    );
  }
}

export async function getAdminProductVariants(
  productId: string,
) {
  await ensureProductExists(productId);

  return prisma.productVariant.findMany({
    where: {
      productId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function createAdminProductVariant(
  productId: string,
  adminUserId: string,
  data: CreateAdminVariantInput,
) {
  await ensureProductExists(productId);
  await ensureSkuAvailable(data.sku);

  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.create({
      data: {
        productId,
        sku: data.sku,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        colorEn: data.colorEn,
        colorAr: data.colorAr,
        size: data.size,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        stockQuantity: data.stockQuantity,
        isActive: data.isActive,
      },
    });

    if (data.stockQuantity > 0) {
      await tx.inventoryMovement.create({
        data: {
          variantId: variant.id,
          createdByUserId: adminUserId,
          type: "STOCK_IN",
          quantity: data.stockQuantity,
          reason: "Initial stock quantity.",
        },
      });
    }

    return variant;
  });
}

export async function updateAdminProductVariant(
  productId: string,
  variantId: string,
  data: UpdateAdminVariantInput,
) {
  const existingVariant = await getOwnedVariant(
    productId,
    variantId,
  );

  if (data.sku !== undefined) {
    await ensureSkuAvailable(
      data.sku,
      variantId,
    );
  }

  const nextPrice =
    data.price !== undefined
      ? data.price
      : existingVariant.price !== null
        ? Number(existingVariant.price)
        : undefined;

  const nextCompareAtPrice =
    data.compareAtPrice !== undefined
      ? data.compareAtPrice
      : existingVariant.compareAtPrice !== null
        ? Number(existingVariant.compareAtPrice)
        : undefined;

  if (
    nextPrice !== undefined &&
    nextCompareAtPrice !== undefined &&
    nextCompareAtPrice < nextPrice
  ) {
    throw new AdminVariantError(
      "Compare-at price cannot be lower than the variant price.",
      400,
    );
  }

  return prisma.productVariant.update({
    where: {
      id: variantId,
    },
    data: {
      sku: data.sku,
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      colorEn: data.colorEn,
      colorAr: data.colorAr,
      size: data.size,
      price: data.price,
      compareAtPrice: data.compareAtPrice,
      isActive: data.isActive,
    },
  });
}

export async function adjustAdminVariantInventory(
  productId: string,
  variantId: string,
  adminUserId: string,
  data: AdjustInventoryInput,
) {
  await getOwnedVariant(
    productId,
    variantId,
  );

  let stockDelta: number;

  switch (data.type) {
    case "STOCK_IN":
    case "RETURNED":
      stockDelta = data.quantity;
      break;

    case "STOCK_OUT":
      stockDelta = -data.quantity;
      break;

    case "ADJUSTMENT":
      stockDelta = data.quantity;
      break;
  }

  return prisma.$transaction(async (tx) => {
    if (stockDelta < 0) {
      const quantityToRemove =
        Math.abs(stockDelta);

      const updateResult =
        await tx.productVariant.updateMany({
          where: {
            id: variantId,
            productId,
            stockQuantity: {
              gte: quantityToRemove,
            },
          },
          data: {
            stockQuantity: {
              decrement: quantityToRemove,
            },
          },
        });

      if (updateResult.count === 0) {
        throw new AdminVariantError(
          "Insufficient stock for this inventory change.",
          409,
        );
      }
    } else {
      await tx.productVariant.update({
        where: {
          id: variantId,
        },
        data: {
          stockQuantity: {
            increment: stockDelta,
          },
        },
      });
    }

    await tx.inventoryMovement.create({
      data: {
        variantId,
        createdByUserId: adminUserId,
        type: data.type,
        quantity: stockDelta,
        reason: data.reason,
      },
    });

    return tx.productVariant.findUnique({
      where: {
        id: variantId,
      },
    });
  });
}

export async function getAdminVariantInventoryHistory(
  productId: string,
  variantId: string,
) {
  await getOwnedVariant(
    productId,
    variantId,
  );

  return prisma.inventoryMovement.findMany({
    where: {
      variantId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdByUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });
}