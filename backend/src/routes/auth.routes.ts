import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  login,
  register,
  resendVerification,
  verifyEmail,
} from "../controllers/auth.controller";

const authRouter = Router();

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message:
      "Too many authentication requests. Please wait and try again.",
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
  "/verify-email",
  authRateLimiter,
  verifyEmail,
);

authRouter.post(
  "/resend-verification",
  authRateLimiter,
  resendVerification,
);

export default authRouter;