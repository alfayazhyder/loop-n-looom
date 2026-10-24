import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  CustomerNotificationError,
  getCustomerUnreadNotificationCount,
  listCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
} from "../services/customerNotification.service";

import {
  notificationIdParamSchema,
  notificationListQuerySchema,
} from "../validators/customerNotification";

function requireUserId(
  req: AuthenticatedRequest,
  res: Response,
) {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return null;
  }

  return req.user.id;
}

export async function listNotifications(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    requireUserId(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    notificationListQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid notification query.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const result =
    await listCustomerNotifications(
      userId,
      parsed.data,
    );

  res.status(200).json(
    result,
  );
}

export async function getUnreadNotificationCount(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    requireUserId(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const result =
    await getCustomerUnreadNotificationCount(
      userId,
    );

  res.status(200).json(
    result,
  );
}

export async function markNotificationRead(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    requireUserId(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const parsed =
    notificationIdParamSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid notification ID.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const notification =
      await markCustomerNotificationRead(
        userId,
        parsed.data.notificationId,
      );

    res.status(200).json({
      message:
        "Notification marked as read.",

      notification,
    });
  } catch (error) {
    if (
      error instanceof
      CustomerNotificationError
    ) {
      res
        .status(
          error.statusCode,
        )
        .json({
          message:
            error.message,
        });

      return;
    }

    throw error;
  }
}

export async function markAllNotificationsRead(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId =
    requireUserId(
      req,
      res,
    );

  if (!userId) {
    return;
  }

  const result =
    await markAllCustomerNotificationsRead(
      userId,
    );

  res.status(200).json({
    message:
      "All notifications marked as read.",

    ...result,
  });
}
