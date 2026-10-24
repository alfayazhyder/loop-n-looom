import {
  Router,
} from "express";

import {
  rateLimit,
} from "express-rate-limit";

import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/customerNotification.controller";

import {
  requireAuth,
} from "../middleware/auth.middleware";

const customerNotificationRouter =
  Router();

const notificationWriteLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      100,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many notification updates. Please wait and try again.",
    },
  });

customerNotificationRouter.use(
  requireAuth,
);

customerNotificationRouter.get(
  "/",
  listNotifications,
);

customerNotificationRouter.get(
  "/unread-count",
  getUnreadNotificationCount,
);

customerNotificationRouter.patch(
  "/read-all",
  notificationWriteLimiter,
  markAllNotificationsRead,
);

customerNotificationRouter.patch(
  "/:notificationId/read",
  notificationWriteLimiter,
  markNotificationRead,
);

export default customerNotificationRouter;
