import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";

const OTP_LENGTH = 6;
const OTP_SALT_ROUNDS = 10;

export function generateOtp(): string {
  const minimum = 10 ** (OTP_LENGTH - 1);
  const maximum = 10 ** OTP_LENGTH;

  return randomInt(minimum, maximum).toString();
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, OTP_SALT_ROUNDS);
}

export async function verifyOtp(
  code: string,
  codeHash: string,
): Promise<boolean> {
  return bcrypt.compare(code, codeHash);
}