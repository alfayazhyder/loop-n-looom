import { Router } from "express";
import {
  rateLimit,
} from "express-rate-limit";

import {
  createReview,
  deleteReview,
  getReview,
  listProductReviews,
  listReviews,
  updateReview,
} from "../controllers/customerReview.controller";

import {
  requireAuth,
} from "../middleware/auth.middleware";

const customerReviewRouter =
  Router();

const publicProductReviewRouter =
  Router();

const reviewWriteRateLimiter =
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
        "Too many review requests. Please wait and try again.",
    },
  });

customerReviewRouter.get(
  "/",
  requireAuth,
  listReviews,
);

customerReviewRouter.post(
  "/",
  reviewWriteRateLimiter,
  requireAuth,
  createReview,
);

customerReviewRouter.get(
  "/:reviewId",
  requireAuth,
  getReview,
);

customerReviewRouter.put(
  "/:reviewId",
  reviewWriteRateLimiter,
  requireAuth,
  updateReview,
);

customerReviewRouter.delete(
  "/:reviewId",
  reviewWriteRateLimiter,
  requireAuth,
  deleteReview,
);

publicProductReviewRouter.get(
  "/:slug/reviews",
  listProductReviews,
);

export {
  publicProductReviewRouter,
};

export default customerReviewRouter;
