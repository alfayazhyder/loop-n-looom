import { prisma } from "../lib/prisma";

import type {
  CreateCustomerCustomRequestInput,
  CreateCustomerCustomRequestMessageInput,
} from "../validators/customerCustomRequest";

export class CustomerCustomRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "CustomerCustomRequestError";
  }
}

const closedRequestStatuses = new Set([
  "REJECTED",
  "CANCELLED",
  "CONVERTED_TO_ORDER",
]);

async function getCustomerAccount(
  userId: string,
) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
    },
  });

  if (!user) {
    throw new CustomerCustomRequestError(
      "Customer account not found.",
      404,
    );
  }

  if (user.status !== "ACTIVE") {
    throw new CustomerCustomRequestError(
      "Customer account is not active.",
      403,
    );
  }

  return user;
}

async function getOwnedCustomRequest(
  userId: string,
  requestId: string,
) {
  const request =
    await prisma.customRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
    });

  if (!request) {
    throw new CustomerCustomRequestError(
      "Custom request not found.",
      404,
    );
  }

  return request;
}

async function getOwnedQuote(
  userId: string,
  requestId: string,
  quoteId: string,
) {
  const request =
    await getOwnedCustomRequest(
      userId,
      requestId,
    );

  const quote =
    await prisma.customQuote.findFirst({
      where: {
        id: quoteId,
        requestId: request.id,
      },
    });

  if (!quote) {
    throw new CustomerCustomRequestError(
      "Quotation not found.",
      404,
    );
  }

  return {
    request,
    quote,
  };
}

export async function createCustomerCustomRequest(
  userId: string,
  data: CreateCustomerCustomRequestInput,
) {
  const customer =
    await getCustomerAccount(userId);

  const customerName =
    [
      customer.firstName,
      customer.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || customer.email;

  return prisma.customRequest.create({
    data: {
      userId,
      customerName,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      status: "SUBMITTED",
      title: data.title,
      description: data.description,
      colors: data.colors,
      size: data.size,
      occasion: data.occasion,
      targetDate: data.targetDate,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
    },
    include: {
      media: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });
}

export async function getCustomerCustomRequests(
  userId: string,
) {
  return prisma.customRequest.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      media: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      assignedAdmin: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          messages: true,
          quotes: true,
        },
      },
    },
  });
}

export async function getCustomerCustomRequestById(
  userId: string,
  requestId: string,
) {
  const request =
    await prisma.customRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
      include: {
        media: {
          orderBy: {
            sortOrder: "asc",
          },
        },

        assignedAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },

        messages: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            senderUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },

        quotes: {
          where: {
            status: {
              not: "DRAFT",
            },
          },
          orderBy: {
            version: "desc",
          },
          select: {
            id: true,
            requestId: true,
            version: true,
            status: true,
            amount: true,
            notes: true,
            validUntil: true,
            sentAt: true,
            respondedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

  if (!request) {
    throw new CustomerCustomRequestError(
      "Custom request not found.",
      404,
    );
  }

  return request;
}

export async function createCustomerCustomRequestMessage(
  userId: string,
  requestId: string,
  data: CreateCustomerCustomRequestMessageInput,
) {
  const request =
    await getOwnedCustomRequest(
      userId,
      requestId,
    );

  if (
    closedRequestStatuses.has(
      request.status,
    )
  ) {
    throw new CustomerCustomRequestError(
      "Messages cannot be added to a closed custom request.",
      409,
    );
  }

  return prisma.$transaction(async (tx) => {
    const message =
      await tx.customRequestMessage.create({
        data: {
          requestId,
          senderUserId: userId,
          senderType: "CUSTOMER",
          message: data.message,
        },
        include: {
          senderUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });

    if (
      request.status === "SUBMITTED" ||
      request.status === "UNDER_REVIEW"
    ) {
      await tx.customRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: "CHATTING",
        },
      });
    }

    return message;
  });
}

export async function acceptCustomerCustomQuote(
  userId: string,
  requestId: string,
  quoteId: string,
) {
  const { request, quote } =
    await getOwnedQuote(
      userId,
      requestId,
      quoteId,
    );

  if (request.status !== "QUOTE_SENT") {
    throw new CustomerCustomRequestError(
      "This custom request is not awaiting a quotation response.",
      409,
    );
  }

  if (quote.status !== "SENT") {
    throw new CustomerCustomRequestError(
      "Only a sent quotation can be accepted.",
      409,
    );
  }

  if (
    quote.validUntil &&
    quote.validUntil.getTime() <= Date.now()
  ) {
    throw new CustomerCustomRequestError(
      "This quotation has expired.",
      409,
    );
  }

  const respondedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const acceptedQuote =
      await tx.customQuote.update({
        where: {
          id: quoteId,
        },
        data: {
          status: "ACCEPTED",
          respondedAt,
        },
      });

    await tx.customRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: "QUOTE_ACCEPTED",
      },
    });

    return acceptedQuote;
  });
}

export async function rejectCustomerCustomQuote(
  userId: string,
  requestId: string,
  quoteId: string,
) {
  const { request, quote } =
    await getOwnedQuote(
      userId,
      requestId,
      quoteId,
    );

  if (request.status !== "QUOTE_SENT") {
    throw new CustomerCustomRequestError(
      "This custom request is not awaiting a quotation response.",
      409,
    );
  }

  if (quote.status !== "SENT") {
    throw new CustomerCustomRequestError(
      "Only a sent quotation can be rejected.",
      409,
    );
  }

  const respondedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const rejectedQuote =
      await tx.customQuote.update({
        where: {
          id: quoteId,
        },
        data: {
          status: "REJECTED",
          respondedAt,
        },
      });

    await tx.customRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: "QUOTE_REJECTED",
      },
    });

    return rejectedQuote;
  });
}
