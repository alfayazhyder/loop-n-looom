import { prisma } from "../lib/prisma";

export class CustomerProfileError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "CustomerProfileError";
  }
}

function toPublicProfile(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
  };
}

export async function getCustomerProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new CustomerProfileError(
      "Customer account not found.",
      404,
    );
  }

  return toPublicProfile(user);
}

export async function updateCustomerProfile(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  },
) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new CustomerProfileError(
      "Customer account not found.",
      404,
    );
  }

  if (data.phone && data.phone !== user.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: {
        phone: data.phone,
      },
    });

    if (existingPhone) {
      throw new CustomerProfileError(
        "This phone number is already in use.",
        409,
      );
    }
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data,
  });

  return toPublicProfile(updatedUser);
}
