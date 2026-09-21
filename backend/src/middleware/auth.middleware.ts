import type { NextFunction, Request, Response } from "express";

import {
  AUTH_COOKIE_NAMES,
} from "../config/cookies";
import { verifyAccessToken } from "../utils/tokens";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
  };
};

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const token = req.cookies[AUTH_COOKIE_NAMES.accessToken];

  if (!token) {
    res.status(401).json({
      message: "Authentication required.",
    });

    return;
  }

  try {
    const payload = verifyAccessToken(token);

    if (!payload.sub || typeof payload.role !== "string") {
      res.status(401).json({
        message: "Invalid authentication token.",
      });

      return;
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch {
    res.status(401).json({
      message: "Invalid or expired authentication token.",
    });
  }
}