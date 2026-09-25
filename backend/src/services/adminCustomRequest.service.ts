import { prisma } from "../lib/prisma";

import type {
  AdminCustomRequestListQuery,
  AssignAdminCustomRequestInput,
  CreateAdminCustomQuoteInput,
  CreateAdminCustomRequestMessageInput,
  UpdateAdminCustomRequestStatusInput,
} from "../validators/adminCustomRequest";

export class AdminCustomRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AdminCustomRequestError";
  }
}

const closedRequestStatuses = new Set([
  "REJECTED",
  "CANCELLED",
  "CONVERTED_TO_ORDER",
]);

const quoteBlockedRequestStatuses = new Set([
  "QUOTE_ACCEPTED",
  "PAID",
  "CONVERTED_TO_ORDER",
  "REJECTED",
  "CANCELLED",
]);

async function getExistingRequest(
  requestId: string,
) {
  const request =
    await prisma.customRequest.findUnique({
      where: {
        id: requestId,
      },
    });

  if (!request) {
    throw new AdminCustomRequestError(
      "Custom request not found.",
      404,
    );
  }

  return request;
}

async function ensureAssignableAdmin(
  adminUserId: string,
): Promise<void> {
  const admin = await prisma.user.findFirst({
    where: {
      id: adminUserId,
      role: {
        in: ["ADMIN", "SUPER_ADMIN"],
      },
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (!admin) {
    throw new AdminCustomRequestError(
      "Selected user is not an active admin.",
      400,
    );
  }
}

async function getOwnedQuote(
  requestId: string,
  quoteId: string,
) {
  const quote =
    await prisma.customQuote.findFirst({
      where: {
        id: quoteId,
        requestId,
      },
    });

  if (!quote) {
    throw new AdminCustomRequestError(
      "Quote not found for this custom request.",
      404,
    );
  }

  return quote;
}

export async function getAdminCustomRequests(
  query: AdminCustomRequestListQuery,
) {
  const skip = (query.page - 1) * query.limit;

  const where = {
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),

    ...(query.assignedAdminId
      ? {
          assignedAdminId:
            query.assignedAdminId,
        }
      : {}),

    ...(query.search
      ? {
          OR: [
            {
              title: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              customerName: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              customerEmail: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.customRequest.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        },
        media: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        _count: {
          select: {
            messages: true,
            quotes: true,
          },
        },
      },
    }),

    prisma.customRequest.count({
      where,
    }),
  ]);

  return {
    requests,
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

export async function getAdminCustomRequestById(
  requestId: string,
) {
  const request =
    await prisma.customRequest.findUnique({
      where: {
        id: requestId,
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
          },
        },

        assignedAdmin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        },

        media: {
          orderBy: {
            sortOrder: "asc",
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
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },

        quotes: {
          orderBy: {
            version: "desc",
          },
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
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
    throw new AdminCustomRequestError(
      "Custom request not found.",
      404,
    );
  }

  return request;
}

export async function assignAdminCustomRequest(
  requestId: string,
  data: AssignAdminCustomRequestInput,
) {
  const existingRequest =
    await getExistingRequest(requestId);

  if (
    closedRequestStatuses.has(
      existingRequest.status,
    )
  ) {
    throw new AdminCustomRequestError(
      "Closed custom requests cannot be reassigned.",
      409,
    );
  }

  if (data.assignedAdminId !== null) {
    await ensureAssignableAdmin(
      data.assignedAdminId,
    );
  }

  const shouldStartReview =
    data.assignedAdminId !== null &&
    existingRequest.status === "SUBMITTED";

  return prisma.customRequest.update({
    where: {
      id: requestId,
    },
    data: {
      assignedAdminId:
        data.assignedAdminId,

      ...(shouldStartReview
        ? {
            status: "UNDER_REVIEW",
          }
        : {}),
    },
    include: {
      assignedAdmin: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
        },
      },
    },
  });
}

export async function updateAdminCustomRequestStatus(
  requestId: string,
  data: UpdateAdminCustomRequestStatusInput,
) {
  const existingRequest =
    await getExistingRequest(requestId);

  const manuallyManageableCurrentStatuses =
    new Set([
      "SUBMITTED",
      "UNDER_REVIEW",
      "CHATTING",
    ]);

  if (
    !manuallyManageableCurrentStatuses.has(
      existingRequest.status,
    )
  ) {
    throw new AdminCustomRequestError(
      "This custom request status can no longer be changed manually.",
      409,
    );
  }

  return prisma.customRequest.update({
    where: {
      id: requestId,
    },
    data: {
      status: data.status,
    },
  });
}

export async function createAdminCustomRequestMessage(
  requestId: string,
  adminUserId: string,
  data: CreateAdminCustomRequestMessageInput,
) {
  const existingRequest =
    await getExistingRequest(requestId);

  if (
    closedRequestStatuses.has(
      existingRequest.status,
    )
  ) {
    throw new AdminCustomRequestError(
      "Messages cannot be added to a closed custom request.",
      409,
    );
  }

  return prisma.$transaction(async (tx) => {
    const message =
      await tx.customRequestMessage.create({
        data: {
          requestId,
          senderUserId: adminUserId,
          senderType: "ADMIN",
          message: data.message,
          attachmentUrl:
            data.attachmentUrl,
        },
        include: {
          senderUser: {
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

    if (
      existingRequest.status ===
        "SUBMITTED" ||
      existingRequest.status ===
        "UNDER_REVIEW"
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

export async function createAdminCustomQuote(
  requestId: string,
  adminUserId: string,
  data: CreateAdminCustomQuoteInput,
) {
  const existingRequest =
    await getExistingRequest(requestId);

  if (
    quoteBlockedRequestStatuses.has(
      existingRequest.status,
    )
  ) {
    throw new AdminCustomRequestError(
      "A new quote cannot be created for this custom request.",
      409,
    );
  }

  return prisma.$transaction(async (tx) => {
    const latestQuote =
      await tx.customQuote.findFirst({
        where: {
          requestId,
        },
        orderBy: {
          version: "desc",
        },
        select: {
          version: true,
        },
      });

    const nextVersion =
      (latestQuote?.version ?? 0) + 1;

    return tx.customQuote.create({
      data: {
        requestId,
        createdByUserId: adminUserId,
        version: nextVersion,
        status: "DRAFT",
        amount: data.amount,
        notes: data.notes,
        validUntil: data.validUntil,
      },
      include: {
        createdBy: {
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
  });
}

export async function sendAdminCustomQuote(
  requestId: string,
  quoteId: string,
) {
  const existingRequest =
    await getExistingRequest(requestId);

  if (
    quoteBlockedRequestStatuses.has(
      existingRequest.status,
    )
  ) {
    throw new AdminCustomRequestError(
      "A quote cannot be sent for this custom request.",
      409,
    );
  }

  const quote = await getOwnedQuote(
    requestId,
    quoteId,
  );

  if (quote.status !== "DRAFT") {
    throw new AdminCustomRequestError(
      "Only draft quotes can be sent.",
      409,
    );
  }

  if (
    quote.validUntil &&
    quote.validUntil.getTime() <= Date.now()
  ) {
    throw new AdminCustomRequestError(
      "This quote has already expired.",
      409,
    );
  }

  const sentAt = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.customQuote.updateMany({
      where: {
        requestId,
        id: {
          not: quoteId,
        },
        status: "SENT",
      },
      data: {
        status: "EXPIRED",
      },
    });

    const sentQuote =
      await tx.customQuote.update({
        where: {
          id: quoteId,
        },
        data: {
          status: "SENT",
          sentAt,
        },
        include: {
          createdBy: {
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

    await tx.customRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: "QUOTE_SENT",
      },
    });

    return sentQuote;
  });
}