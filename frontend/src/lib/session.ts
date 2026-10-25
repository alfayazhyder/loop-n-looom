import {
  apiJson,
  apiRequest,
  ApiError,
} from "@/lib/api";

export interface CustomerProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  emailVerified: boolean;
}

export interface ProfileResponse {
  user: CustomerProfile;
}

let refreshPromise: Promise<unknown> | null = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = apiJson(
      "/api/auth/refresh",
      "POST",
    ).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

/*
 * Access tokens are kept in HttpOnly cookies.
 *
 * If an authenticated request receives HTTP 401,
 * refresh the cookie-backed session and retry once.
 *
 * Concurrent refreshes share one refresh request
 * to avoid refresh-token rotation races.
 *
 * No authentication tokens are stored in
 * localStorage or sessionStorage.
 */
export async function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  try {
    return await apiRequest<T>(path, options);
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401
    ) {
      throw error;
    }

    await refreshSession();

    return apiRequest<T>(path, options);
  }
}

export async function getCurrentCustomer() {
  return authenticatedRequest<ProfileResponse>(
    "/api/customer/me",
  );
}

export async function signOut() {
  await apiJson(
    "/api/auth/logout",
    "POST",
  );
}

export function isAuthenticationError(
  error: unknown,
) {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403)
  );
}