import { z } from "zod";

const emailSchema = z
  .string()
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

const otpSchema = z
  .string()
  .regex(/^\d{6}$/, "Verification code must contain exactly 6 digits");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(7).max(20).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  email: emailSchema,
  code: otpSchema,
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
});

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .optional(),

  lastName: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .optional(),

  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .optional(),
});

const addressTypeSchema = z.enum([
  "HOME",
  "WORK",
  "OTHER",
]);

const emirateSchema = z.enum([
  "ABU_DHABI",
  "DUBAI",
  "SHARJAH",
  "AJMAN",
  "UMM_AL_QUWAIN",
  "RAS_AL_KHAIMAH",
  "FUJAIRAH",
]);

export const createAddressSchema = z.object({
  type: addressTypeSchema.default("HOME"),

  recipientName: z
    .string()
    .trim()
    .min(1, "Recipient name is required")
    .max(100),

  phone: z
    .string()
    .trim()
    .min(7)
    .max(20),

  emirate: emirateSchema,

  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .max(80),

  area: z
    .string()
    .trim()
    .min(1, "Area is required")
    .max(120),

  street: z
    .string()
    .trim()
    .max(200)
    .optional(),

  building: z
    .string()
    .trim()
    .max(120)
    .optional(),

  apartmentOrVilla: z
    .string()
    .trim()
    .max(120)
    .optional(),

  landmark: z
    .string()
    .trim()
    .max(200)
    .optional(),

  deliveryInstructions: z
    .string()
    .trim()
    .max(500)
    .optional(),

  isDefault: z
    .boolean()
    .optional(),
});

export const updateAddressSchema =
  createAddressSchema.partial();

export type RegisterInput = z.infer<
  typeof registerSchema
>;

export type LoginInput = z.infer<
  typeof loginSchema
>;

export type VerifyEmailInput = z.infer<
  typeof verifyEmailSchema
>;

export type ResendVerificationInput = z.infer<
  typeof resendVerificationSchema
>;

export type UpdateProfileInput = z.infer<
  typeof updateProfileSchema
>;

export type CreateAddressInput = z.infer<
  typeof createAddressSchema
>;

export type UpdateAddressInput = z.infer<
  typeof updateAddressSchema
>;