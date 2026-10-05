import { Router } from "express";
import {
  rateLimit,
} from "express-rate-limit";

import {
  getPaymentStatus,
  retryPayment,
  simulatePayment,
} from "../controllers/customerPayment.controller";

import {
  optionalAuth,
} from "../middleware/auth.middleware";

const customerPaymentRouter =
  Router();

const paymentWriteRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 30,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many payment requests. Please wait and try again.",
    },
  });

customerPaymentRouter.get(
  "/:paymentId",
  optionalAuth,
  getPaymentStatus,
);

customerPaymentRouter.post(
  "/:paymentId/retry",
  paymentWriteRateLimiter,
  optionalAuth,
  retryPayment,
);

customerPaymentRouter.post(
  "/:paymentId/simulate",
  paymentWriteRateLimiter,
  optionalAuth,
  simulatePayment,
);

export default customerPaymentRouter;
