import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  CustomerProfileError,
  getCustomerProfile,
  updateCustomerProfile,
} from "../services/customerProfile.service";
import { updateProfileSchema } from "../validators/auth";

export async function getProfile(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required.",
      });

      return;
    }

    const profile = await getCustomerProfile(req.user.id);

    res.status(200).json({
      user: profile,
    });
  } catch (error) {
    if (error instanceof CustomerProfileError) {
      res.status(error.statusCode).json({
        message: error.message,
      });

      return;
    }

    throw error;
  }
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsed = updateProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid profile details.",
      errors: parsed.error.flatten(),
    });

    return;
  }

  try {
    if (!req.user) {
      res.status(401).json({
        message: "Authentication required.",
      });

      return;
    }

    const profile = await updateCustomerProfile(
      req.user.id,
      parsed.data,
    );

    res.status(200).json({
      user: profile,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    if (error instanceof CustomerProfileError) {
      res.status(error.statusCode).json({
        message: error.message,
      });

      return;
    }

    throw error;
  }
}