import {
  Router,
} from "express";

import {
  rateLimit,
} from "express-rate-limit";

import {
  addCustomerWishlistItem,
  deleteCustomerWishlistItem,
  listCustomerWishlist,
  updateCustomerWishlistItem,
} from "../controllers/customerWishlist.controller";

import {
  requireAuth,
} from "../middleware/auth.middleware";

const customerWishlistRouter =
  Router();

const wishlistWriteRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      60,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many wishlist changes. Please wait and try again.",
    },
  });

customerWishlistRouter.use(
  requireAuth,
);

customerWishlistRouter.get(
  "/",
  listCustomerWishlist,
);

customerWishlistRouter.post(
  "/:productId",
  wishlistWriteRateLimiter,
  addCustomerWishlistItem,
);

customerWishlistRouter.patch(
  "/:productId",
  wishlistWriteRateLimiter,
  updateCustomerWishlistItem,
);

customerWishlistRouter.delete(
  "/:productId",
  wishlistWriteRateLimiter,
  deleteCustomerWishlistItem,
);

export default customerWishlistRouter;
