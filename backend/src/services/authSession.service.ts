import {
  randomUUID,
} from "node:crypto";

import { prisma } from "../lib/prisma";
import { hashToken } from "../utils/tokenHash";

import {
  createAccessToken,
  createRefreshToken,
  type AuthUserRole,
  verifyRefreshToken,
} from "../utils/tokens";

const REFRESH_TOKEN_LIFETIME_MS =
  30 *
  24 *
  60 *
  60 *
  1000;

export class AuthSessionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);

    this.name =
      "AuthSessionError";
  }
}

function parseRefreshToken(
  refreshToken: string,
) {
  try {
    const payload =
      verifyRefreshToken(
        refreshToken,
      );

    if (
      typeof payload.sub !==
        "string" ||
      typeof payload.sessionId !==
        "string"
    ) {
      throw new Error(
        "Invalid refresh payload",
      );
    }

    return {
      userId:
        payload.sub,

      sessionId:
        payload.sessionId,
    };
  } catch {
    throw new AuthSessionError(
      "Invalid or expired refresh session.",
      401,
    );
  }
}

function publicUser(
  user: {
    id: string;
    email: string;
    firstName:
      | string
      | null;
    lastName:
      | string
      | null;
    phone:
      | string
      | null;
    role: string;
    emailVerifiedAt:
      | Date
      | null;
  },
) {
  return {
    id:
      user.id,

    email:
      user.email,

    firstName:
      user.firstName,

    lastName:
      user.lastName,

    phone:
      user.phone,

    role:
      user.role,

    emailVerified:
      Boolean(
        user.emailVerifiedAt,
      ),
  };
}

export async function rotateRefreshSession(
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string,
) {
  const {
    userId,
    sessionId,
  } =
    parseRefreshToken(
      refreshToken,
    );

  const refreshHash =
    hashToken(
      refreshToken,
    );

  /*
   * Load the session before starting the
   * rotation transaction.
   *
   * Security revocations for suspended or
   * otherwise unavailable accounts must be
   * committed before we throw an error.
   */
  const session =
    await prisma.refreshSession.findUnique(
      {
        where: {
          id:
            sessionId,
        },

        include: {
          user:
            true,
        },
      },
    );

  if (
    !session ||
    session.userId !==
      userId ||
    session.tokenHash !==
      refreshHash
  ) {
    throw new AuthSessionError(
      "Invalid or expired refresh session.",
      401,
    );
  }

  if (
    session.expiresAt.getTime() <=
    Date.now()
  ) {
    await prisma.refreshSession.deleteMany(
      {
        where: {
          id:
            sessionId,

          userId,

          tokenHash:
            refreshHash,
        },
      },
    );

    throw new AuthSessionError(
      "Invalid or expired refresh session.",
      401,
    );
  }

  if (
    session.user.status !==
    "ACTIVE"
  ) {
    /*
     * This deletion deliberately happens
     * outside the rotation transaction.
     * It must remain committed even though
     * the request returns an auth error.
     */
    await prisma.refreshSession.deleteMany(
      {
        where: {
          userId,
        },
      },
    );

    throw new AuthSessionError(
      "This account is currently unavailable.",
      403,
    );
  }

  if (
    !session.user
      .emailVerifiedAt
  ) {
    await prisma.refreshSession.deleteMany(
      {
        where: {
          userId,
        },
      },
    );

    throw new AuthSessionError(
      "Email verification is required.",
      403,
    );
  }

  /*
   * For a healthy account, deletion of the
   * old token and creation of the new token
   * remain atomic.
   */
  return prisma.$transaction(
    async (transaction) => {
      const deleted =
        await transaction.refreshSession.deleteMany(
          {
            where: {
              id:
                sessionId,

              userId,

              tokenHash:
                refreshHash,
            },
          },
        );

      /*
       * This protects against refresh-token
       * replay/races. Only one request can
       * successfully consume the old token.
       */
      if (
        deleted.count !==
        1
      ) {
        throw new AuthSessionError(
          "Refresh session has already been used.",
          401,
        );
      }

      const newSessionId =
        randomUUID();

      const accessToken =
        createAccessToken(
          userId,
          session.user
            .role as AuthUserRole,
        );

      const newRefreshToken =
        createRefreshToken(
          userId,
          newSessionId,
        );

      await transaction.refreshSession.create(
        {
          data: {
            id:
              newSessionId,

            userId,

            tokenHash:
              hashToken(
                newRefreshToken,
              ),

            expiresAt:
              new Date(
                Date.now() +
                  REFRESH_TOKEN_LIFETIME_MS,
              ),

            userAgent,

            ipAddress,
          },
        },
      );

      return {
        accessToken,

        refreshToken:
          newRefreshToken,

        user:
          publicUser(
            session.user,
          ),
      };
    },
  );
}

export async function logoutRefreshSession(
  refreshToken:
    | string
    | undefined,
) {
  if (!refreshToken) {
    return;
  }

  let parsed:
    | {
        userId: string;
        sessionId: string;
      }
    | null =
    null;

  try {
    parsed =
      parseRefreshToken(
        refreshToken,
      );
  } catch {
    /*
     * Logout is intentionally idempotent.
     * Invalid/expired cookies are simply
     * cleared by the controller.
     */
    return;
  }

  await prisma.refreshSession.deleteMany(
    {
      where: {
        id:
          parsed.sessionId,

        userId:
          parsed.userId,

        tokenHash:
          hashToken(
            refreshToken,
          ),
      },
    },
  );
}

export async function logoutAllUserSessions(
  userId: string,
) {
  const result =
    await prisma.refreshSession.deleteMany(
      {
        where: {
          userId,
        },
      },
    );

  return {
    revokedSessions:
      result.count,
  };
}
