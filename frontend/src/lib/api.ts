export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/*
 * The browser uses the Next.js same-origin rewrite.
 *
 * /backend/api/products
 *       |
 *       v
 * Express /api/products
 *
 * Cookies are handled by the browser.
 * Tokens are never stored in localStorage.
 */

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (
    !path.startsWith("/api/") ||
    path.startsWith("//")
  ) {
    throw new Error("Invalid API path.");
  }

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const response = await fetch(
    `/backend${path}`,
    {
      ...options,
      headers,
      credentials: "include",
      cache: "no-store",
    },
  );

  const contentType =
    response.headers.get("content-type") ?? "";

  let result: unknown = null;

  if (contentType.includes("application/json")) {
    try {
      result = await response.json();
    } catch {
      result = null;
    }
  } else {
    result = await response.text();
  }

  if (!response.ok) {
    let message =
      `Request failed with status ${response.status}.`;

    if (
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof result.message === "string"
    ) {
      message = result.message;
    }

    throw new ApiError(
      message,
      response.status,
    );
  }

  return result as T;
}

export function apiJson<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  data?: unknown,
): Promise<T> {
  return apiRequest<T>(path, {
    method,
    ...(data === undefined
      ? {}
      : { body: JSON.stringify(data) }),
  });
}