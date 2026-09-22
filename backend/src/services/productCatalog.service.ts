import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { ProductListQuery } from "../validators/productCatalog";

export class ProductCatalogError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ProductCatalogError";
  }
}

function buildProductWhere(
  query: ProductListQuery,
): Prisma.ProductWhereInput {
  const filters: Prisma.ProductWhereInput[] = [
    {
      status: "ACTIVE",
      category: {
        isActive: true,
      },
    },
  ];

  if (query.search) {
    filters.push({
      OR: [
        {
          nameEn: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        {
          nameAr: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        {
          descriptionEn: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        {
          descriptionAr: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (query.category) {
    filters.push({
      category: {
        slug: query.category,
        isActive: true,
      },
    });
  }

  if (query.color) {
    filters.push({
      variants: {
        some: {
          isActive: true,
          OR: [
            {
              colorEn: {
                equals: query.color,
                mode: "insensitive",
              },
            },
            {
              colorAr: {
                equals: query.color,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    });
  }

  if (query.occasion) {
    filters.push({
      occasionLinks: {
        some: {
          occasion: {
            slug: query.occasion,
            isActive: true,
          },
        },
      },
    });
  }

  if (
    query.minPrice !== undefined ||
    query.maxPrice !== undefined
  ) {
    filters.push({
      basePrice: {
        ...(query.minPrice !== undefined
          ? {
              gte: query.minPrice,
            }
          : {}),
        ...(query.maxPrice !== undefined
          ? {
              lte: query.maxPrice,
            }
          : {}),
      },
    });
  }

  if (query.fulfillmentType) {
    filters.push({
      fulfillmentType: query.fulfillmentType,
    });
  }

  if (query.deliveryScope) {
    filters.push({
      deliveryScope: query.deliveryScope,
    });
  }

  if (query.featured !== undefined) {
    filters.push({
      isFeatured: query.featured,
    });
  }

  if (query.newArrival !== undefined) {
    filters.push({
      isNewArrival: query.newArrival,
    });
  }

  return {
    AND: filters,
  };
}

function buildProductOrderBy(
  sort: ProductListQuery["sort"],
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return {
        basePrice: "asc",
      };

    case "price_desc":
      return {
        basePrice: "desc",
      };

    case "name_asc":
      return {
        nameEn: "asc",
      };

    case "name_desc":
      return {
        nameEn: "desc",
      };

    case "newest":
    default:
      return {
        createdAt: "desc",
      };
  }
}

export async function getCatalogProducts(
  query: ProductListQuery,
) {
  const where = buildProductWhere(query);
  const orderBy = buildProductOrderBy(query.sort);

  const skip = (query.page - 1) * query.limit;

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
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
          where: {
            isActive: true,
          },
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
    }),

    prisma.product.count({
      where,
    }),
  ]);

  return {
    products,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages:
        total === 0
          ? 0
          : Math.ceil(total / query.limit),
    },
  };
}

export async function getCatalogProductBySlug(
  slug: string,
) {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      status: "ACTIVE",
      category: {
        isActive: true,
      },
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
        where: {
          isActive: true,
        },
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
    throw new ProductCatalogError(
      "Product not found.",
      404,
    );
  }

  return product;
}