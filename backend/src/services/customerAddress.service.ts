import { prisma } from "../lib/prisma";

import type {
  CreateAddressInput,
  UpdateAddressInput,
} from "../validators/auth";

export class CustomerAddressError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "CustomerAddressError";
  }
}

async function clearDefaultAddress(
  userId: string,
): Promise<void> {
  await prisma.address.updateMany({
    where: {
      userId,
      isDefault: true,
    },
    data: {
      isDefault: false,
    },
  });
}

export async function getCustomerAddresses(
  userId: string,
) {
  return prisma.address.findMany({
    where: {
      userId,
    },
    orderBy: [
      {
        isDefault: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function createCustomerAddress(
  userId: string,
  data: CreateAddressInput,
) {
  const existingAddressCount =
    await prisma.address.count({
      where: {
        userId,
      },
    });

  const shouldBeDefault =
    data.isDefault === true ||
    existingAddressCount === 0;

  if (shouldBeDefault) {
    await clearDefaultAddress(userId);
  }

  return prisma.address.create({
    data: {
      userId,
      type: data.type,
      recipientName: data.recipientName,
      phone: data.phone,
      emirate: data.emirate,
      city: data.city,
      area: data.area,
      street: data.street,
      building: data.building,
      apartmentOrVilla: data.apartmentOrVilla,
      landmark: data.landmark,
      deliveryInstructions:
        data.deliveryInstructions,
      isDefault: shouldBeDefault,
    },
  });
}

export async function updateCustomerAddress(
  userId: string,
  addressId: string,
  data: UpdateAddressInput,
) {
  const existingAddress =
    await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

  if (!existingAddress) {
    throw new CustomerAddressError(
      "Address not found.",
      404,
    );
  }

  if (data.isDefault === true) {
    await clearDefaultAddress(userId);
  }

  return prisma.address.update({
    where: {
      id: addressId,
    },
    data: {
      type: data.type,
      recipientName: data.recipientName,
      phone: data.phone,
      emirate: data.emirate,
      city: data.city,
      area: data.area,
      street: data.street,
      building: data.building,
      apartmentOrVilla:
        data.apartmentOrVilla,
      landmark: data.landmark,
      deliveryInstructions:
        data.deliveryInstructions,
      isDefault: data.isDefault,
    },
  });
}

export async function deleteCustomerAddress(
  userId: string,
  addressId: string,
) {
  const address =
    await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

  if (!address) {
    throw new CustomerAddressError(
      "Address not found.",
      404,
    );
  }

  await prisma.address.delete({
    where: {
      id: addressId,
    },
  });

  /*
   * If the deleted address was the default address,
   * automatically make another saved address the default.
   */
  if (address.isDefault) {
    const nextAddress =
      await prisma.address.findFirst({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (nextAddress) {
      await prisma.address.update({
        where: {
          id: nextAddress.id,
        },
        data: {
          isDefault: true,
        },
      });
    }
  }

  return {
    message: "Address deleted successfully.",
  };
}

export async function setDefaultCustomerAddress(
  userId: string,
  addressId: string,
) {
  const address =
    await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

  if (!address) {
    throw new CustomerAddressError(
      "Address not found.",
      404,
    );
  }

  await clearDefaultAddress(userId);

  return prisma.address.update({
    where: {
      id: addressId,
    },
    data: {
      isDefault: true,
    },
  });
}