import {
  createHash,
  randomBytes,
} from "node:crypto";

export function createGuestCartToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashGuestCartToken(
  token: string,
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}