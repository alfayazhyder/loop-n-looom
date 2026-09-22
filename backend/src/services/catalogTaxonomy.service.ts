import { prisma } from "../lib/prisma";

export async function getActiveCategories() {
  return prisma.category.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        nameEn: "asc",
      },
    ],
  });
}

export async function getActiveOccasions() {
  return prisma.occasion.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        nameEn: "asc",
      },
    ],
  });
}