import type {
  NextFunction,
  Response,
} from "express";

import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest } from "./auth.middleware";

const ADMIN_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
]);

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required.",
    });

    return;
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: req.user.id,
    },
    select: {
      role: true,
    },
  });

  if (!currentUser) {
    res.status(401).json({
      message: "Authentication required.",
    });

    return;
  }

  if (!ADMIN_ROLES.has(currentUser.role)) {
    res.status(403).json({
      message: "Admin access required.",
    });

    return;
  }

  /*
   * Replace the possibly stale JWT role with the
   * user's current database role.
   */
  req.user.role = currentUser.role;

  next();
}