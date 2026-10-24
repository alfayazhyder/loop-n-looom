import {
  Router,
} from "express";

import {
  rateLimit,
} from "express-rate-limit";

import {
  createReminder,
  deleteReminder,
  getReminder,
  listReminders,
  listUpcomingReminders,
  updateReminder,
} from "../controllers/customerReminder.controller";

import {
  requireAuth,
} from "../middleware/auth.middleware";

const customerReminderRouter =
  Router();

const reminderWriteLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      40,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many reminder changes. Please wait and try again.",
    },
  });

customerReminderRouter.use(
  requireAuth,
);

customerReminderRouter.get(
  "/",
  listReminders,
);

customerReminderRouter.get(
  "/upcoming",
  listUpcomingReminders,
);

customerReminderRouter.get(
  "/:reminderId",
  getReminder,
);

customerReminderRouter.post(
  "/",
  reminderWriteLimiter,
  createReminder,
);

customerReminderRouter.put(
  "/:reminderId",
  reminderWriteLimiter,
  updateReminder,
);

customerReminderRouter.delete(
  "/:reminderId",
  reminderWriteLimiter,
  deleteReminder,
);

export default customerReminderRouter;
