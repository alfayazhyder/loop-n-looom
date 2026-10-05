import { Router } from "express";
import {
  rateLimit,
} from "express-rate-limit";

import {
  getOrderDetail,
  listOrders,
  trackOrder,
} from "../controllers/customerOrder.controller";

import {
  optionalAuth,
  requireAuth,
} from "../middleware/auth.middleware";

const customerOrderRouter =
  Router();

const publicOrderTrackingRouter =
  Router();

const trackingRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 20,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many order tracking requests. Please wait and try again.",
    },
  });

customerOrderRouter.get(
  "/",
  requireAuth,
  listOrders,
);

customerOrderRouter.get(
  "/:orderId",
  requireAuth,
  getOrderDetail,
);

publicOrderTrackingRouter.get(
  "/track",
  trackingRateLimiter,
  optionalAuth,
  trackOrder,
);

export {
  publicOrderTrackingRouter,
};

export default customerOrderRouter;
