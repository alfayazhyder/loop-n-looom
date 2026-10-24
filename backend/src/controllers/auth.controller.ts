import type {
  Request,
  Response,
} from "express";

import {
  AUTH_COOKIE_NAMES,
  accessTokenCookieOptions,
  clearAuthCookieOptions,
  refreshTokenCookieOptions,
} from "../config/cookies";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  AuthServiceError,
  loginUser,
  registerUser,
} from "../services/auth.service";

import {
  AuthSessionError,
  logoutAllUserSessions,
  logoutRefreshSession,
  rotateRefreshSession,
} from "../services/authSession.service";

import {
  createResentEmailVerificationCode,
  EmailVerificationError,
  verifyEmailCode,
} from "../services/emailVerification.service";

import {
  sendEmailVerificationOtp,
  sendPasswordResetOtp,
} from "../services/email.service";

import {
  createPasswordResetCode,
  PasswordResetError,
  resetPasswordWithCode,
} from "../services/passwordReset.service";

import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from "../validators/auth";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/authCompletion";

function clearAuthCookies(
  res: Response,
) {
  res.clearCookie(
    AUTH_COOKIE_NAMES.accessToken,
    clearAuthCookieOptions,
  );

  res.clearCookie(
    AUTH_COOKIE_NAMES.refreshToken,
    clearAuthCookieOptions,
  );
}

export async function register(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed =
    registerSchema.safeParse(
      req.body,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid registration details.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await registerUser(
        parsed.data,
      );

    res.status(201).json(
      result,
    );
  } catch (error) {
    if (
      error instanceof
      AuthServiceError
    ) {
      res
        .status(
          error.statusCode,
        )
        .json({
          message:
            error.message,
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
  const parsed =
    loginSchema.safeParse(
      req.body,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid login details.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await loginUser(
        parsed.data,
        req.get(
          "user-agent",
        ),
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
      user:
        result.user,

      message:
        "Signed in successfully.",
    });
  } catch (error) {
    if (
      error instanceof
      AuthServiceError
    ) {
      res
        .status(
          error.statusCode,
        )
        .json({
          message:
            error.message,
        });

      return;
    }

    throw error;
  }
}

export async function refreshSession(
  req: Request,
  res: Response,
): Promise<void> {
  const refreshToken =
    req.cookies[
      AUTH_COOKIE_NAMES
        .refreshToken
    ];

  if (
    typeof refreshToken !==
    "string"
  ) {
    clearAuthCookies(res);

    res.status(401).json({
      message:
        "Refresh session is required.",
    });

    return;
  }

  try {
    const result =
      await rotateRefreshSession(
        refreshToken,
        req.get(
          "user-agent",
        ),
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
      user:
        result.user,

      message:
        "Session refreshed successfully.",
    });
  } catch (error) {
    if (
      error instanceof
      AuthSessionError
    ) {
      clearAuthCookies(
        res,
      );

      res
        .status(
          error.statusCode,
        )
        .json({
          message:
            error.message,
        });

      return;
    }

    throw error;
  }
}

export async function logout(
  req: Request,
  res: Response,
): Promise<void> {
  const refreshToken =
    req.cookies[
      AUTH_COOKIE_NAMES
        .refreshToken
    ];

  await logoutRefreshSession(
    typeof refreshToken ===
      "string"
      ? refreshToken
      : undefined,
  );

  clearAuthCookies(
    res,
  );

  res.status(200).json({
    message:
      "Signed out successfully.",
  });
}

export async function logoutAll(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const result =
    await logoutAllUserSessions(
      req.user.id,
    );

  clearAuthCookies(
    res,
  );

  res.status(200).json({
    message:
      "Signed out from all sessions successfully.",

    revokedSessions:
      result.revokedSessions,
  });
}

export async function verifyEmail(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed =
    verifyEmailSchema.safeParse(
      req.body,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid verification details.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await verifyEmailCode(
        parsed.data,
      );

    res.status(200).json({
      message:
        "Email verified successfully.",

      ...result,
    });
  } catch (error) {
    if (
      error instanceof
      EmailVerificationError
    ) {
      res
        .status(
          error.statusCode,
        )
        .json({
          message:
            error.message,
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
  const parsed =
    resendVerificationSchema.safeParse(
      req.body,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid email address.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const code =
    await createResentEmailVerificationCode(
      parsed.data.email,
    );

  if (code) {
    await sendEmailVerificationOtp(
      parsed.data.email,
      code,
    );
  }

  res.status(200).json({
    message:
      "If an unverified account exists for this email, a new verification code has been sent.",
  });
}

export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed =
    forgotPasswordSchema.safeParse(
      req.body,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid email address.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const code =
    await createPasswordResetCode(
      parsed.data.email,
    );

  if (code) {
    await sendPasswordResetOtp(
      parsed.data.email,
      code,
    );
  }

  /*
   * Generic response prevents
   * account enumeration.
   */
  res.status(200).json({
    message:
      "If an eligible account exists for this email, a password reset code has been sent.",
  });
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed =
    resetPasswordSchema.safeParse(
      req.body,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid password reset details.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await resetPasswordWithCode(
        parsed.data,
      );

    clearAuthCookies(
      res,
    );

    res.status(200).json(
      result,
    );
  } catch (error) {
    if (
      error instanceof
      PasswordResetError
    ) {
      res
        .status(
          error.statusCode,
        )
        .json({
          message:
            error.message,
        });

      return;
    }

    throw error;
  }
}
