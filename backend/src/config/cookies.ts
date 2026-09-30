import type { CookieOptions } from "express";

import { env } from "./env";

export const AUTH_COOKIE_NAMES = {
  accessToken: "lnl_access_token",
  refreshToken: "lnl_refresh_token",
} as const;

export const CART_COOKIE_NAME =
  "lnl_cart_token";

const isProduction =
  env.NODE_ENV === "production";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

export const accessTokenCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 15 * 60 * 1000,
};

export const refreshTokenCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const clearAuthCookieOptions: CookieOptions = {
  ...baseCookieOptions,
};

export const cartCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const clearCartCookieOptions: CookieOptions = {
  ...baseCookieOptions,
};