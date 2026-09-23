import { prisma } from "../lib/prisma";

import type {
  CreateAdminProductInput,
  UpdateAdminProductInput,
} from "../validators/adminProduct";

export class AdminProductError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AdminProductError";
  }
}

async function ensureCategoryExists(
  categoryId: string,
): Promise<void> {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      id: true,
    },
  });

  if (!category) {
    throw new AdminProductError(
      "Category not found.",
      404,
    );
  }
}

async function ensureSlugAvailable(
  slug: string,
  excludeProductId?: string,
): Promise<void> {
  const existingProduct =
    await prisma.product.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

  if (
    existingProduct &&
    existingProduct.id !== excludeProductId
  ) {
    throw new AdminProductError(
      "A product with this slug already exists.",
      409,
    );
  }
}

export async function getAdminProducts() {
  return prisma.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      category: true,
      media: {
        orderBy: [
          {
            isPrimary: "desc",
          },
          {
            sortOrder: "asc",
          },
        ],
      },
      variants: {
        orderBy: {
          createdAt: "asc",
        },
      },
      occasionLinks: {
        include: {
          occasion: true,
        },
      },
    },
  });
}

export async function getAdminProductById(
  productId: string,
) {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
    include: {
      category: true,
      media: {
        orderBy: [
          {
            isPrimary: "desc",
          },
          {
            sortOrder: "asc",
          },
        ],
      },
      variants: {
        orderBy: {
          createdAt: "asc",
        },
      },
      occasionLinks: {
        include: {
          occasion: true,
        },
      },
    },
  });

  if (!product) {
    throw new AdminProductError(
      "Product not found.",
      404,
    );
  }

  return product;
}

export async function createAdminProduct(
  data: CreateAdminProductInput,
) {
  await ensureCategoryExists(data.categoryId);
  await ensureSlugAvailable(data.slug);

  return prisma.product.create({
    data: {
      categoryId: data.categoryId,
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      slug: data.slug,
      descriptionEn: data.descriptionEn,
      descriptionAr: data.descriptionAr,
      basePrice: data.basePrice,
      status: data.status,
      fulfillmentType: data.fulfillmentType,
      deliveryScope: data.deliveryScope,
      productionMinDays: data.productionMinDays,
      productionMaxDays: data.productionMaxDays,
      isFeatured: data.isFeatured,
      isNewArrival: data.isNewArrival,
      isGiftWrappable: data.isGiftWrappable,
    },
    include: {
      category: true,
      media: true,
      variants: true,
      occasionLinks: {
        include: {
          occasion: true,
        },
      },
    },
  });
}

export async function updateAdminProduct(
  productId: string,
  data: UpdateAdminProductInput,
) {
  const existingProduct =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

  if (!existingProduct) {
    throw new AdminProductError(
      "Product not found.",
      404,
    );
  }

  if (data.categoryId !== undefined) {
    await ensureCategoryExists(data.categoryId);
  }

  if (data.slug !== undefined) {
    await ensureSlugAvailable(
      data.slug,
      productId,
    );
  }

  const nextProductionMinDays =
    data.productionMinDays ??
    existingProduct.productionMinDays;

  const nextProductionMaxDays =
    data.productionMaxDays ??
    existingProduct.productionMaxDays;

  if (
    nextProductionMinDays !== null &&
    nextProductionMaxDays !== null &&
    nextProductionMinDays >
      nextProductionMaxDays
  ) {
    throw new AdminProductError(
      "Minimum production days cannot exceed maximum production days.",
      400,
    );
  }

  return prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      categoryId: data.categoryId,
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      slug: data.slug,
      descriptionEn: data.descriptionEn,
      descriptionAr: data.descriptionAr,
      basePrice: data.basePrice,
      status: data.status,
      fulfillmentType: data.fulfillmentType,
      deliveryScope: data.deliveryScope,
      productionMinDays:
        data.productionMinDays,
      productionMaxDays:
        data.productionMaxDays,
      isFeatured: data.isFeatured,
      isNewArrival: data.isNewArrival,
      isGiftWrappable:
        data.isGiftWrappable,
    },
    include: {
      category: true,
      media: {
        orderBy: [
          {
            isPrimary: "desc",
          },
          {
            sortOrder: "asc",
          },
        ],
      },
      variants: {
        orderBy: {
          createdAt: "asc",
        },
      },
      occasionLinks: {
        include: {
          occasion: true,
        },
      },
    },
  });
}

export async function archiveAdminProduct(
  productId: string,
) {
  const existingProduct =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
      },
    });

  if (!existingProduct) {
    throw new AdminProductError(
      "Product not found.",
      404,
    );
  }

  return prisma.product.update({
    where: {
      id: productId,
    },
    data: {
      status: "ARCHIVED",
      isFeatured: false,
      isNewArrival: false,
    },
    include: {
      category: true,
      media: true,
      variants: true,
      occasionLinks: {
        include: {
          occasion: true,
        },
      },
    },
  });
}