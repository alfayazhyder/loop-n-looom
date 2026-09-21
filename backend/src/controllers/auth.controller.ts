import type { Request, Response } from "express";

import {
  AUTH_COOKIE_NAMES,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from "../config/cookies";
import {
  AuthServiceError,
  loginUser,
  registerUser,
} from "../services/auth.service";
import {
  createResentEmailVerificationCode,
  EmailVerificationError,
  verifyEmailCode,
} from "../services/emailVerification.service";
import { sendEmailVerificationOtp } from "../services/email.service";
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from "../validators/auth";

export async function register(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid registration details.",
      errors: parsed.error.flatten(),
    });

    return;
  }

  try {
    const result = await registerUser(parsed.data);

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AuthServiceError) {
      res.status(error.statusCode).json({
        message: error.message,
      });

      return;
    }

    throw error;
  }
}

export async function login(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid login details.",
      errors: parsed.error.flatten(),
    });

    return;
  }

  try {
    const result = await loginUser(
      parsed.data,
      req.get("user-agent"),
      req.ip,
    );

    res.cookie(
      AUTH_COOKIE_NAMES.accessToken,
      result.accessToken,
      accessTokenCookieOptions,
    );

    res.cookie(
      AUTH_COOKIE_NAMES.refreshToken,
      result.refreshToken,
      refreshTokenCookieOptions,
    );

    res.status(200).json({
      user: result.user,
      message: "Signed in successfully.",
    });
  } catch (error) {
    if (error instanceof AuthServiceError) {
      res.status(error.statusCode).json({
        message: error.message,
      });

      return;
    }

    throw error;
  }
}

export async function verifyEmail(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = verifyEmailSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid verification details.",
      errors: parsed.error.flatten(),
    });

    return;
  }

  try {
    const result = await verifyEmailCode(parsed.data);

    res.status(200).json({
      message: "Email verified successfully.",
      ...result,
    });
  } catch (error) {
    if (error instanceof EmailVerificationError) {
      res.status(error.statusCode).json({
        message: error.message,
      });

      return;
    }

    throw error;
  }
}

export async function resendVerification(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = resendVerificationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid email address.",
      errors: parsed.error.flatten(),
    });

    return;
  }

  const code = await createResentEmailVerificationCode(
    parsed.data.email,
  );

  if (code) {
    await sendEmailVerificationOtp(
      parsed.data.email,
      code,
    );
  }

  /*
   * Always return the same response so attackers cannot determine
   * whether an email address has an account.
   */
  res.status(200).json({
    message:
      "If an unverified account exists for this email, a new verification code has been sent.",
  });
}