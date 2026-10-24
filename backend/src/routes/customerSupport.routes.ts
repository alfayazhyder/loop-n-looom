import {
  Router,
} from "express";

import {
  rateLimit,
} from "express-rate-limit";

import {
  closeCustomerSupport,
  createCustomerSupport,
  getCustomerSupport,
  listCustomerSupport,
  sendCustomerSupportMessage,
} from "../controllers/customerSupport.controller";

import {
  requireAuth,
} from "../middleware/auth.middleware";

const customerSupportRouter =
  Router();

const supportWriteLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      80,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many support requests. Please wait and try again.",
    },
  });

customerSupportRouter.use(
  requireAuth,
);

customerSupportRouter.get(
  "/",
  listCustomerSupport,
);

customerSupportRouter.post(
  "/",
  supportWriteLimiter,
  createCustomerSupport,
);

customerSupportRouter.get(
  "/:conversationId",
  getCustomerSupport,
);

customerSupportRouter.post(
  "/:conversationId/messages",
  supportWriteLimiter,
  sendCustomerSupportMessage,
);

customerSupportRouter.patch(
  "/:conversationId/close",
  supportWriteLimiter,
  closeCustomerSupport,
);

export default customerSupportRouter;
