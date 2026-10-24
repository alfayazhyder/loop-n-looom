import { z } from "zod";

const normalizedEmailSchema =
  z
    .string()
    .trim()
    .email(
      "Enter a valid email address.",
    )
    .transform(
      (value) =>
        value.toLowerCase(),
    );

const securePasswordSchema =
  z
    .string()
    .min(
      8,
      "Password must contain at least 8 characters.",
    )
    .max(
      128,
      "Password must contain at most 128 characters.",
    )
    .regex(
      /[A-Za-z]/,
      "Password must contain at least one letter.",
    )
    .regex(
      /\d/,
      "Password must contain at least one number.",
    );

export const forgotPasswordSchema =
  z.object({
    email:
      normalizedEmailSchema,
  });

export const resetPasswordSchema =
  z.object({
    email:
      normalizedEmailSchema,

    code: z
      .string()
      .trim()
      .regex(
        /^\d{6}$/,
        "Reset code must contain exactly 6 digits.",
      ),

    newPassword:
      securePasswordSchema,
  });

export type ForgotPasswordInput =
  z.infer<
    typeof forgotPasswordSchema
  >;

export type ResetPasswordInput =
  z.infer<
    typeof resetPasswordSchema
  >;
