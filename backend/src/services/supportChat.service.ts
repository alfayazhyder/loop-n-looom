import type {
  Prisma,
} from "../generated/prisma/client";

import { prisma } from "../lib/prisma";

import type {
  AdminSupportListQuery,
  AssignSupportConversationInput,
  CreateAdminSupportMessageInput,
  UpdateSupportConversationStatusInput,
} from "../validators/adminSupport";

import type {
  CreateCustomerSupportConversationInput,
  CreateCustomerSupportMessageInput,
  CustomerSupportListQuery,
  SupportMessageListQuery,
} from "../validators/customerSupport";

export class SupportChatError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "SupportChatError";
  }
}

const conversationSummaryInclude = {
  assignedAdmin: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },

  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
    },
  },

  messages: {
    orderBy: {
      createdAt:
        "desc",
    },

    take:
      1,

    select: {
      id: true,
      senderType: true,
      body: true,
      attachmentUrl: true,
      createdAt: true,
    },
  },
} satisfies Prisma.SupportConversationInclude;

const adminConversationSummaryInclude = {
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },

  assignedAdmin: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },

  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
    },
  },

  messages: {
    orderBy: {
      createdAt:
        "desc",
    },

    take:
      1,

    select: {
      id: true,
      senderType: true,
      body: true,
      attachmentUrl: true,
      createdAt: true,
    },
  },
} satisfies Prisma.SupportConversationInclude;

async function getOwnedConversation(
  userId: string,
  conversationId: string,
) {
  const conversation =
    await prisma.supportConversation.findFirst(
      {
        where: {
          id:
            conversationId,

          userId,
        },
      },
    );

  if (!conversation) {
    throw new SupportChatError(
      "Support conversation not found.",
      404,
    );
  }

  return conversation;
}

async function getConversationForAdmin(
  conversationId: string,
) {
  const conversation =
    await prisma.supportConversation.findUnique(
      {
        where: {
          id:
            conversationId,
        },
      },
    );

  if (!conversation) {
    throw new SupportChatError(
      "Support conversation not found.",
      404,
    );
  }

  return conversation;
}

async function verifyOwnedOrder(
  userId: string,
  orderId:
    | string
    | undefined,
) {
  if (!orderId) {
    return;
  }

  const order =
    await prisma.order.findFirst(
      {
        where: {
          id:
            orderId,

          userId,
        },

        select: {
          id:
            true,
        },
      },
    );

  if (!order) {
    throw new SupportChatError(
      "Order not found or does not belong to this customer.",
      404,
    );
  }
}

export async function createCustomerSupportConversation(
  userId: string,
  input: CreateCustomerSupportConversationInput,
) {
  await verifyOwnedOrder(
    userId,
    input.orderId,
  );

  const now =
    new Date();

  return prisma.$transaction(
    async (tx) => {
      const conversation =
        await tx.supportConversation.create(
          {
            data: {
              userId,

              orderId:
                input.orderId ??
                null,

              subject:
                input.subject,

              status:
                "OPEN",

              lastMessageAt:
                now,
            },
          },
        );

      const message =
        await tx.supportMessage.create(
          {
            data: {
              conversationId:
                conversation.id,

              senderUserId:
                userId,

              senderType:
                "CUSTOMER",

              body:
                input.message,

              attachmentUrl:
                input.attachmentUrl ??
                null,
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
        );

      const created =
        await tx.supportConversation.findUniqueOrThrow(
          {
            where: {
              id:
                conversation.id,
            },

            include: {
              assignedAdmin: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },

              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  status: true,
                },
              },
            },
          },
        );

      return {
        conversation:
          created,

        initialMessage:
          message,
      };
    },
  );
}

export async function listCustomerSupportConversations(
  userId: string,
  query: CustomerSupportListQuery,
) {
  const where:
    Prisma.SupportConversationWhereInput =
    {
      userId,

      ...(query.status
        ? {
            status:
              query.status,
          }
        : {}),
    };

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    conversations,
    total,
  ] =
    await prisma.$transaction([
      prisma.supportConversation.findMany(
        {
          where,

          skip,

          take:
            query.limit,

          orderBy: [
            {
              lastMessageAt:
                "desc",
            },
            {
              createdAt:
                "desc",
            },
          ],

          include:
            conversationSummaryInclude,
        },
      ),

      prisma.supportConversation.count(
        {
          where,
        },
      ),
    ]);

  return {
    conversations,

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

      total,

      totalPages:
        total === 0
          ? 0
          : Math.ceil(
              total /
                query.limit,
            ),
    },
  };
}

export async function getCustomerSupportConversation(
  userId: string,
  conversationId: string,
  query: SupportMessageListQuery,
) {
  await getOwnedConversation(
    userId,
    conversationId,
  );

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    conversation,
    messages,
    totalMessages,
  ] =
    await prisma.$transaction([
      prisma.supportConversation.findUniqueOrThrow(
        {
          where: {
            id:
              conversationId,
          },

          include: {
            assignedAdmin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },

            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
              },
            },
          },
        },
      ),

      prisma.supportMessage.findMany(
        {
          where: {
            conversationId,
          },

          skip,

          take:
            query.limit,

          orderBy: {
            createdAt:
              "asc",
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
      ),

      prisma.supportMessage.count(
        {
          where: {
            conversationId,
          },
        },
      ),
    ]);

  return {
    conversation,

    messages,

    messagePagination: {
      page:
        query.page,

      limit:
        query.limit,

      total:
        totalMessages,

      totalPages:
        totalMessages ===
        0
          ? 0
          : Math.ceil(
              totalMessages /
                query.limit,
            ),
    },
  };
}

export async function createCustomerSupportMessage(
  userId: string,
  conversationId: string,
  input: CreateCustomerSupportMessageInput,
) {
  const conversation =
    await getOwnedConversation(
      userId,
      conversationId,
    );

  if (
    conversation.status ===
    "CLOSED"
  ) {
    throw new SupportChatError(
      "Messages cannot be added to a closed support conversation.",
      409,
    );
  }

  const now =
    new Date();

  return prisma.$transaction(
    async (tx) => {
      const message =
        await tx.supportMessage.create(
          {
            data: {
              conversationId,

              senderUserId:
                userId,

              senderType:
                "CUSTOMER",

              body:
                input.message,

              attachmentUrl:
                input.attachmentUrl ??
                null,
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
        );

      await tx.supportConversation.update(
        {
          where: {
            id:
              conversationId,
          },

          data: {
            lastMessageAt:
              now,
          },
        },
      );

      return message;
    },
  );
}

export async function closeCustomerSupportConversation(
  userId: string,
  conversationId: string,
) {
  const conversation =
    await getOwnedConversation(
      userId,
      conversationId,
    );

  if (
    conversation.status ===
    "CLOSED"
  ) {
    return conversation;
  }

  return prisma.supportConversation.update(
    {
      where: {
        id:
          conversationId,
      },

      data: {
        status:
          "CLOSED",
      },
    },
  );
}

export async function listAdminSupportConversations(
  query: AdminSupportListQuery,
) {
  const filters:
    Prisma.SupportConversationWhereInput[] =
    [];

  if (query.status) {
    filters.push({
      status:
        query.status,
    });
  }

  if (
    query.assignedAdminId
  ) {
    filters.push({
      assignedAdminId:
        query.assignedAdminId,
    });
  }

  if (query.search) {
    filters.push({
      OR: [
        {
          subject: {
            contains:
              query.search,

            mode:
              "insensitive",
          },
        },
        {
          guestName: {
            contains:
              query.search,

            mode:
              "insensitive",
          },
        },
        {
          guestEmail: {
            contains:
              query.search,

            mode:
              "insensitive",
          },
        },
      ],
    });
  }

  const where:
    Prisma.SupportConversationWhereInput =
    filters.length ===
    0
      ? {}
      : {
          AND:
            filters,
        };

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    conversations,
    total,
  ] =
    await prisma.$transaction([
      prisma.supportConversation.findMany(
        {
          where,

          skip,

          take:
            query.limit,

          orderBy: [
            {
              lastMessageAt:
                "desc",
            },
            {
              createdAt:
                "desc",
            },
          ],

          include:
            adminConversationSummaryInclude,
        },
      ),

      prisma.supportConversation.count(
        {
          where,
        },
      ),
    ]);

  return {
    conversations,

    pagination: {
      page:
        query.page,

      limit:
        query.limit,

      total,

      totalPages:
        total === 0
          ? 0
          : Math.ceil(
              total /
                query.limit,
            ),
    },
  };
}

export async function getAdminSupportConversation(
  conversationId: string,
  query: SupportMessageListQuery,
) {
  await getConversationForAdmin(
    conversationId,
  );

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    conversation,
    messages,
    totalMessages,
  ] =
    await prisma.$transaction([
      prisma.supportConversation.findUniqueOrThrow(
        {
          where: {
            id:
              conversationId,
          },

          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },

            assignedAdmin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },

            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
              },
            },
          },
        },
      ),

      prisma.supportMessage.findMany(
        {
          where: {
            conversationId,
          },

          skip,

          take:
            query.limit,

          orderBy: {
            createdAt:
              "asc",
          },

          include: {
            senderUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      ),

      prisma.supportMessage.count(
        {
          where: {
            conversationId,
          },
        },
      ),
    ]);

  return {
    conversation,

    messages,

    messagePagination: {
      page:
        query.page,

      limit:
        query.limit,

      total:
        totalMessages,

      totalPages:
        totalMessages ===
        0
          ? 0
          : Math.ceil(
              totalMessages /
                query.limit,
            ),
    },
  };
}

export async function assignAdminSupportConversation(
  conversationId: string,
  input: AssignSupportConversationInput,
) {
  await getConversationForAdmin(
    conversationId,
  );

  if (
    input.assignedAdminId
  ) {
    const admin =
      await prisma.user.findFirst(
        {
          where: {
            id:
              input.assignedAdminId,

            role: {
              in: [
                "ADMIN",
                "SUPER_ADMIN",
              ],
            },

            status:
              "ACTIVE",
          },

          select: {
            id: true,
          },
        },
      );

    if (!admin) {
      throw new SupportChatError(
        "Assigned administrator was not found or is unavailable.",
        404,
      );
    }
  }

  return prisma.supportConversation.update(
    {
      where: {
        id:
          conversationId,
      },

      data: {
        assignedAdminId:
          input.assignedAdminId,
      },

      include: {
        assignedAdmin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    },
  );
}

export async function updateAdminSupportConversationStatus(
  conversationId: string,
  input: UpdateSupportConversationStatusInput,
) {
  await getConversationForAdmin(
    conversationId,
  );

  return prisma.supportConversation.update(
    {
      where: {
        id:
          conversationId,
      },

      data: {
        status:
          input.status,
      },
    },
  );
}

export async function createAdminSupportMessage(
  adminId: string,
  conversationId: string,
  input: CreateAdminSupportMessageInput,
) {
  const conversation =
    await getConversationForAdmin(
      conversationId,
    );

  if (
    conversation.status ===
    "CLOSED"
  ) {
    throw new SupportChatError(
      "Messages cannot be added to a closed support conversation.",
      409,
    );
  }

  const now =
    new Date();

  return prisma.$transaction(
    async (tx) => {
      const message =
        await tx.supportMessage.create(
          {
            data: {
              conversationId,

              senderUserId:
                adminId,

              senderType:
                "ADMIN",

              body:
                input.message,

              attachmentUrl:
                input.attachmentUrl ??
                null,
            },

            include: {
              senderUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        );

      await tx.supportConversation.update(
        {
          where: {
            id:
              conversationId,
          },

          data: {
            lastMessageAt:
              now,

            ...(conversation.assignedAdminId
            ? {}
            : {
                assignedAdminId:
                  adminId,
              }),
          },
        },
      );

      return message;
    },
  );
}
