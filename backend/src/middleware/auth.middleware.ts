import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AUTH_COOKIE_NAMES,
} from "../config/cookies";

import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../utils/tokens";

export type AuthenticatedRequest =
  Request & {
    user?: {
      id: string;
      role: string;
    };
  };

function getAccessToken(
  req: AuthenticatedRequest,
): string | null {
  const token =
    req.cookies?.[
      AUTH_COOKIE_NAMES
        .accessToken
    ];

  return typeof token ===
    "string"
    ? token
    : null;
}

function parseAccessToken(
  token: string,
):
  | {
      id: string;
      role: string;
    }
  | null {
  try {
    const payload =
      verifyAccessToken(
        token,
      );

    if (
      typeof payload.sub !==
        "string" ||
      typeof payload.role !==
        "string"
    ) {
      return null;
    }

    return {
      id:
        payload.sub,

      role:
        payload.role,
    };
  } catch {
    return null;
  }
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token =
    getAccessToken(
      req,
    );

  if (!token) {
    next();

    return;
  }

  const payload =
    parseAccessToken(
      token,
    );

  if (!payload) {
    next();

    return;
  }

  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id:
            payload.id,
        },

        select: {
          id: true,
          role: true,
          status: true,
          emailVerifiedAt:
            true,
        },
      });

    if (
      user &&
      user.status ===
        "ACTIVE" &&
      user.emailVerifiedAt
    ) {
      req.user = {
        id:
          user.id,

        role:
          user.role,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token =
    getAccessToken(
      req,
    );

  if (!token) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const payload =
    parseAccessToken(
      token,
    );

  if (!payload) {
    res.status(401).json({
      message:
        "Invalid or expired authentication token.",
    });

    return;
  }

  try {
    const user =
      await prisma.user.findUnique({
        where: {
          id:
            payload.id,
        },

        select: {
          id: true,
          role: true,
          status: true,
          emailVerifiedAt:
            true,
        },
      });

    if (!user) {
      res.status(401).json({
        message:
          "Authentication session is no longer valid.",
      });

      return;
    }

    if (
      user.status !==
      "ACTIVE"
    ) {
      res.status(403).json({
        message:
          "This account is currently unavailable.",
      });

      return;
    }

    if (
      !user.emailVerifiedAt
    ) {
      res.status(403).json({
        message:
          "Email verification is required.",
      });

      return;
    }

    req.user = {
      id:
        user.id,

      role:
        user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
