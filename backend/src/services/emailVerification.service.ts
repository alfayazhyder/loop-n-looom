import { prisma } from "../lib/prisma";
import { generateOtp, hashOtp, verifyOtp } from "../utils/otp";
import type { VerifyEmailInput } from "../validators/auth";

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export class EmailVerificationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "EmailVerificationError";
  }
}

export async function createEmailVerificationCode(
  userId: string,
  email: string,
) {
  const normalizedEmail = email.toLowerCase();

  /*
   * Invalidate any previous unused verification codes.
   * Only the newest OTP should remain usable.
   */
  await prisma.verificationCode.updateMany({
    where: {
      email: normalizedEmail,
      purpose: "EMAIL_VERIFICATION",
      consumedAt: null,
    },
    data: {
      consumedAt: new Date(),
    },
  });

  const code = generateOtp();
  const codeHash = await hashOtp(code);

  await prisma.verificationCode.create({
    data: {
      userId,
      email: normalizedEmail,
      purpose: "EMAIL_VERIFICATION",
      codeHash,
      expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
    },
  });

  /*
   * The raw OTP is returned only so our email service can send it.
   * It must never be stored in the database.
   */
  return code;
}

export async function verifyEmailCode(input: VerifyEmailInput) {
  const verification = await prisma.verificationCode.findFirst({
    where: {
      email: input.email,
      purpose: "EMAIL_VERIFICATION",
      consumedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!verification) {
    throw new EmailVerificationError(
      "No active verification code was found.",
      400,
    );
  }

  if (verification.expiresAt.getTime() <= Date.now()) {
    await prisma.verificationCode.update({
      where: {
        id: verification.id,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    throw new EmailVerificationError(
      "Verification code has expired. Please request a new one.",
      400,
    );
  }

  if (verification.attempts >= MAX_OTP_ATTEMPTS) {
    throw new EmailVerificationError(
      "Too many incorrect attempts. Please request a new code.",
      429,
    );
  }

  const codeMatches = await verifyOtp(
    input.code,
    verification.codeHash,
  );

  if (!codeMatches) {
    await prisma.verificationCode.update({
      where: {
        id: verification.id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    throw new EmailVerificationError(
      "The verification code is incorrect.",
      400,
    );
  }

  const user =
    verification.userId !== null
      ? await prisma.user.findUnique({
          where: {
            id: verification.userId,
          },
        })
      : await prisma.user.findUnique({
          where: {
            email: input.email,
          },
        });

  if (!user) {
    throw new EmailVerificationError(
      "The account associated with this verification code was not found.",
      404,
    );
  }

  const verifiedAt = new Date();

  await prisma.$transaction([
    prisma.verificationCode.update({
      where: {
        id: verification.id,
      },
      data: {
        consumedAt: verifiedAt,
      },
    }),

    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerifiedAt: verifiedAt,
      },
    }),
  ]);

  return {
    userId: user.id,
    email: user.email,
    emailVerifiedAt: verifiedAt,
  };
}

export async function createResentEmailVerificationCode(
  email: string,
) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  /*
   * Returning null avoids revealing whether an arbitrary email
   * address has an account.
   */
  if (!user || user.emailVerifiedAt) {
    return null;
  }

  return createEmailVerificationCode(user.id, user.email);
}