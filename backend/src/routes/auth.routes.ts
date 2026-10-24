import { Router } from "express";
import {
  rateLimit,
} from "express-rate-limit";

import {
  forgotPassword,
  login,
  logout,
  logoutAll,
  refreshSession,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controller";

import {
  requireAuth,
} from "../middleware/auth.middleware";

const authRouter =
  Router();

const authRateLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit:
      20,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      message:
        "Too many authentication requests. Please wait and try again.",
    },
  });

const refreshRateLimiter =
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
        "Too many session refresh requests. Please wait and try again.",
    },
  });

authRouter.post(
  "/register",
  authRateLimiter,
  register,
);

authRouter.post(
  "/login",
  authRateLimiter,
  login,
);

authRouter.post(
  "/refresh",
  refreshRateLimiter,
  refreshSession,
);

authRouter.post(
  "/logout",
  logout,
);

authRouter.post(
  "/logout-all",
  requireAuth,
  logoutAll,
);

authRouter.post(
  "/verify-email",
  authRateLimiter,
  verifyEmail,
);

authRouter.post(
  "/resend-verification",
  authRateLimiter,
  resendVerification,
);

authRouter.post(
  "/forgot-password",
  authRateLimiter,
  forgotPassword,
);

authRouter.post(
  "/reset-password",
  authRateLimiter,
  resetPassword,
);

export default authRouter;
