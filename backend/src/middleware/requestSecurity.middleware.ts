import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { env } from "../config/env";

/*
 * Browser requests carrying authentication cookies
 * must originate from the configured frontend.
 *
 * Production rejects cookie-authenticated mutations
 * without an Origin header.
 *
 * Local development permits missing Origin headers
 * so existing CLI and runtime tests continue working.
 */

const allowedFrontendOrigin =
  new URL(env.FRONTEND_URL).origin;

const unsafeMethods = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

/*
 * Simulated payment completion is strictly a
 * development/testing feature.
 *
 * Never allow this endpoint in production.
 */

const simulatedPaymentRoute =
  /^\/api\/payments\/[^/]+\/simulate\/?$/i;

export function enforceRequestSecurity(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (
    process.env.NODE_ENV === "production" &&
    simulatedPaymentRoute.test(req.path)
  ) {
    res.status(404).json({
      message: "Endpoint not available.",
    });

    return;
  }

  if (!unsafeMethods.has(req.method)) {
    next();
    return;
  }

  /*
   * Requests without cookies are not using
   * cookie-based authentication.
   *
   * This preserves server-to-server integrations
   * that authenticate independently.
   */

  if (!req.headers.cookie) {
    next();
    return;
  }

  const requestOrigin = req.headers.origin;

  if (requestOrigin !== undefined) {
    if (requestOrigin !== allowedFrontendOrigin) {
      res.status(403).json({
        message: "Request origin is not allowed.",
      });

      return;
    }
  } else if (process.env.NODE_ENV === "production") {
    res.status(403).json({
      message: "Request origin is required.",
    });

    return;
  }

  next();
}