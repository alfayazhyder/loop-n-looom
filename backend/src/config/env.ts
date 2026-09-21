import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    PORT: z.coerce.number().int().positive().default(5000),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    FRONTEND_URL: z
      .string()
      .url("FRONTEND_URL must be a valid URL")
      .default("http://localhost:3000"),

    JWT_ACCESS_SECRET: z
      .string()
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),

    JWT_REFRESH_SECRET: z
      .string()
      .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

    EMAIL_MODE: z.enum(["console", "smtp"]).default("console"),

    EMAIL_FROM_NAME: z.string().default("LOOP_N_LOOOM"),

    EMAIL_FROM_ADDRESS: z
      .string()
      .email("EMAIL_FROM_ADDRESS must be a valid email address")
      .default("noreply@loopnlooom.local"),

    SMTP_HOST: z.string().optional(),

    SMTP_PORT: z.coerce.number().int().positive().optional(),

    SMTP_SECURE: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),

    SMTP_USER: z.string().optional(),

    SMTP_PASSWORD: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_MODE !== "smtp") {
      return;
    }

    const requiredFields = [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASSWORD",
    ] as const;

    for (const field of requiredFields) {
      if (!env[field]) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when EMAIL_MODE is smtp`,
        });
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  console.error(z.treeifyError(parsedEnv.error));
  process.exit(1);
}

export const env = parsedEnv.data;