import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";

export function checkAdminAccess(
  req: AuthenticatedRequest,
  res: Response,
): void {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required.",
    });

    return;
  }

  res.status(200).json({
    message: "Admin access granted.",
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
}