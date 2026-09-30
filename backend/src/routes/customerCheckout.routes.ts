import { Router } from "express";
import {
  rateLimit,
} from "express-rate-limit";
import {
  placeOrder,
  previewCheckout,
} from "../controllers/customerCheckout.controller";
import {
  optionalAuth,
} from "../middleware/auth.middleware";

const customerCheckoutRouter =
  Router();

const placeOrderRateLimiter =
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
        "Too many checkout attempts. Please wait and try again.",
    },
  });

customerCheckoutRouter.post(
  "/preview",
  optionalAuth,
  previewCheckout,
);

customerCheckoutRouter.post(
  "/place-order",
  placeOrderRateLimiter,
  optionalAuth,
  placeOrder,
);

export default customerCheckoutRouter;