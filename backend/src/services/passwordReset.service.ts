import { prisma } from "../lib/prisma";

import {
  generateOtp,
  hashOtp,
  verifyOtp,
} from "../utils/otp";

import {
  hashPassword,
} from "../utils/password";

import type {
  ResetPasswordInput,
} from "../validators/authCompletion";

const RESET_OTP_LIFETIME_MS =
  10 *
  60 *
  1000;

const MAX_RESET_ATTEMPTS =
  5;

export class PasswordResetError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "PasswordResetError";
  }
}

export async function createPasswordResetCode(
  email: string,
) {
  const normalizedEmail =
    email
      .trim()
      .toLowerCase();

  const user =
    await prisma.user.findUnique({
      where: {
        email:
          normalizedEmail,
      },
    });

  /*
   * Never reveal whether an email
   * address has an account.
   */
  if (
    !user ||
    !user.passwordHash ||
    user.status !==
      "ACTIVE"
  ) {
    return null;
  }

  await prisma.verificationCode.updateMany(
    {
      where: {
        email:
          normalizedEmail,

        purpose:
          "PASSWORD_RESET",

        consumedAt:
          null,
      },

      data: {
        consumedAt:
          new Date(),
      },
    },
  );

  const code =
    generateOtp();

  const codeHash =
    await hashOtp(
      code,
    );

  await prisma.verificationCode.create({
    data: {
      userId:
        user.id,

      email:
        normalizedEmail,

      purpose:
        "PASSWORD_RESET",

      codeHash,

      expiresAt:
        new Date(
          Date.now() +
            RESET_OTP_LIFETIME_MS,
        ),
    },
  });

  return code;
}

export async function resetPasswordWithCode(
  input: ResetPasswordInput,
) {
  const verification =
    await prisma.verificationCode.findFirst(
      {
        where: {
          email:
            input.email,

          purpose:
            "PASSWORD_RESET",

          consumedAt:
            null,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      },
    );

  if (!verification) {
    throw new PasswordResetError(
      "No active password reset code was found.",
      400,
    );
  }

  if (
    verification.expiresAt.getTime() <=
    Date.now()
  ) {
    await prisma.verificationCode.update(
      {
        where: {
          id:
            verification.id,
        },

        data: {
          consumedAt:
            new Date(),
        },
      },
    );

    throw new PasswordResetError(
      "Password reset code has expired. Please request a new one.",
      400,
    );
  }

  if (
    verification.attempts >=
    MAX_RESET_ATTEMPTS
  ) {
    throw new PasswordResetError(
      "Too many incorrect attempts. Please request a new reset code.",
      429,
    );
  }

  const matches =
    await verifyOtp(
      input.code,
      verification.codeHash,
    );

  if (!matches) {
    await prisma.verificationCode.update(
      {
        where: {
          id:
            verification.id,
        },

        data: {
          attempts: {
            increment:
              1,
          },
        },
      },
    );

    throw new PasswordResetError(
      "The password reset code is incorrect.",
      400,
    );
  }

  const user =
    verification.userId
      ? await prisma.user.findUnique(
          {
            where: {
              id:
                verification.userId,
            },
          },
        )
      : await prisma.user.findUnique(
          {
            where: {
              email:
                input.email,
            },
          },
        );

  if (
    !user ||
    !user.passwordHash
  ) {
    throw new PasswordResetError(
      "The account associated with this reset request was not found.",
      404,
    );
  }

  if (
    user.status !==
    "ACTIVE"
  ) {
    throw new PasswordResetError(
      "This account is currently unavailable.",
      403,
    );
  }

  const passwordHash =
    await hashPassword(
      input.newPassword,
    );

  const consumedAt =
    new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id:
          user.id,
      },

      data: {
        passwordHash,
      },
    }),

    prisma.verificationCode.update({
      where: {
        id:
          verification.id,
      },

      data: {
        consumedAt,
      },
    }),

    prisma.verificationCode.updateMany({
      where: {
        email:
          input.email,

        purpose:
          "PASSWORD_RESET",

        consumedAt:
          null,
      },

      data: {
        consumedAt,
      },
    }),

    /*
     * Password reset revokes every
     * existing logged-in session.
     */
    prisma.refreshSession.deleteMany({
      where: {
        userId:
          user.id,
      },
    }),
  ]);

  return {
    message:
      "Password reset successfully. Please sign in again.",
  };
}
