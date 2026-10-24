import type {
  Prisma,
} from "../generated/prisma/client";

import { prisma } from "../lib/prisma";

import type {
  NotificationListQuery,
} from "../validators/customerNotification";

export class CustomerNotificationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "CustomerNotificationError";
  }
}

export async function listCustomerNotifications(
  userId: string,
  query: NotificationListQuery,
) {
  const where:
    Prisma.NotificationWhereInput =
    {
      userId,

      ...(query.channel
        ? {
            channel:
              query.channel,
          }
        : {}),

      ...(query.status
        ? {
            status:
              query.status,
          }
        : {}),

      ...(query.unreadOnly ===
      true
        ? {
            readAt:
              null,
          }
        : {}),
    };

  const skip =
    (query.page - 1) *
    query.limit;

  const [
    notifications,
    total,
  ] =
    await prisma.$transaction([
      prisma.notification.findMany(
        {
          where,

          skip,

          take:
            query.limit,

          orderBy: {
            createdAt:
              "desc",
          },
        },
      ),

      prisma.notification.count(
        {
          where,
        },
      ),
    ]);

  return {
    notifications,

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

export async function getCustomerUnreadNotificationCount(
  userId: string,
) {
  const unreadCount =
    await prisma.notification.count(
      {
        where: {
          userId,

          readAt:
            null,
        },
      },
    );

  return {
    unreadCount,
  };
}

export async function markCustomerNotificationRead(
  userId: string,
  notificationId: string,
) {
  const result =
    await prisma.notification.updateMany(
      {
        where: {
          id:
            notificationId,

          userId,
        },

        data: {
          readAt:
            new Date(),
        },
      },
    );

  if (
    result.count ===
    0
  ) {
    throw new CustomerNotificationError(
      "Notification not found.",
      404,
    );
  }

  return prisma.notification.findFirstOrThrow(
    {
      where: {
        id:
          notificationId,

        userId,
      },
    },
  );
}

export async function markAllCustomerNotificationsRead(
  userId: string,
) {
  const readAt =
    new Date();

  const result =
    await prisma.notification.updateMany(
      {
        where: {
          userId,

          readAt:
            null,
        },

        data: {
          readAt,
        },
      },
    );

  return {
    updated:
      result.count,

    readAt,
  };
}
