import jwt from "jsonwebtoken";

import { env } from "../config/env";

export type AuthUserRole = "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

export function createAccessToken(
  userId: string,
  role: AuthUserRole,
): string {
  return jwt.sign(
    {
      role,
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    },
  );
}

export function createRefreshToken(
  userId: string,
  sessionId: string,
): string {
  return jwt.sign(
    {
      sessionId,
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: userId,
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    },
  );
}

export function verifyAccessToken(token: string): jwt.JwtPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (typeof payload === "string") {
    throw new Error("Invalid access token payload");
  }

  return payload;
}

export function verifyRefreshToken(token: string): jwt.JwtPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (typeof payload === "string") {
    throw new Error("Invalid refresh token payload");
  }

  return payload;
}
