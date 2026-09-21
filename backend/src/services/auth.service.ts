import { randomUUID } from "node:crypto";

import { prisma } from "../lib/prisma";
import type { LoginInput, RegisterInput } from "../validators/auth";
import { sendEmailVerificationOtp } from "./email.service";
import { createEmailVerificationCode } from "./emailVerification.service";
import { hashPassword, verifyPassword } from "../utils/password";
import { hashToken } from "../utils/tokenHash";
import {
  createAccessToken,
  createRefreshToken,
  type AuthUserRole,
} from "../utils/tokens";

const REFRESH_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

function toPublicUser(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  emailVerifiedAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

async function createSession(
  userId: string,
  role: AuthUserRole,
  userAgent?: string,
  ipAddress?: string,
) {
  const sessionId = randomUUID();

  const accessToken = createAccessToken(userId, role);
  const refreshToken = createRefreshToken(userId, sessionId);

  await prisma.refreshSession.create({
    data: {
      id: sessionId,
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
      userAgent,
      ipAddress,
    },
  });

  return {
    accessToken,
    refreshToken,
  };
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw new AuthServiceError(
      "An account with this email already exists.",
      409,
    );
  }

  if (input.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: {
        phone: input.phone,
      },
    });

    if (existingPhone) {
      throw new AuthServiceError(
        "An account with this phone number already exists.",
        409,
      );
    }
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    },
  });

  const verificationCode = await createEmailVerificationCode(
    user.id,
    user.email,
  );

  await sendEmailVerificationOtp(
    user.email,
    verificationCode,
  );

  return {
    user: toPublicUser(user),
    verificationRequired: true,
    message:
      "Account created. Please verify your email using the verification code.",
  };
}

export async function loginUser(
  input: LoginInput,
  userAgent?: string,
  ipAddress?: string,
) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user?.passwordHash) {
    throw new AuthServiceError("Invalid email or password.", 401);
  }

  if (user.status !== "ACTIVE") {
    throw new AuthServiceError(
      "This account is currently unavailable.",
      403,
    );
  }

  const passwordMatches = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new AuthServiceError("Invalid email or password.", 401);
  }

  if (!user.emailVerifiedAt) {
    throw new AuthServiceError(
      "Please verify your email before signing in.",
      403,
    );
  }

  const tokens = await createSession(
    user.id,
    user.role as AuthUserRole,
    userAgent,
    ipAddress,
  );

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  return {
    user: toPublicUser(user),
    ...tokens,
  };
}