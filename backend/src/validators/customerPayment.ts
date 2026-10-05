import { z } from "zod";

export const paymentIdParamsSchema =
  z.object({
    paymentId: z
      .string()
      .uuid(
        "Enter a valid payment ID",
      ),
  });

export const paymentStatusQuerySchema =
  z.object({
    customerEmail: z
      .string()
      .trim()
      .email(
        "Enter a valid customer email address",
      )
      .transform(
        (value) =>
          value.toLowerCase(),
      )
      .optional(),
  });

export const retryCustomerPaymentSchema =
  z.object({
    paymentMethod: z.enum([
      "APPLE_PAY",
      "VISA",
      "MASTERCARD",
    ]),

    customerEmail: z
      .string()
      .trim()
      .email(
        "Enter a valid customer email address",
      )
      .transform(
        (value) =>
          value.toLowerCase(),
      )
      .optional(),
  });

export const simulateCustomerPaymentSchema =
  z
    .object({
      outcome: z.enum([
        "AUTHORIZED",
        "PAID",
        "FAILED",
      ]),

      customerEmail: z
        .string()
        .trim()
        .email(
          "Enter a valid customer email address",
        )
        .transform(
          (value) =>
            value.toLowerCase(),
        )
        .optional(),

      failureReason: z
        .string()
        .trim()
        .min(
          1,
          "Failure reason cannot be empty",
        )
        .max(
          500,
          "Failure reason is too long",
        )
        .optional(),
    })
    .superRefine(
      (data, ctx) => {
        if (
          data.outcome ===
            "FAILED" &&
          !data.failureReason
        ) {
          ctx.addIssue({
            code: "custom",

            path: [
              "failureReason",
            ],

            message:
              "Failure reason is required when simulating a failed payment.",
          });
        }
      },
    );

export type PaymentMethodInput =
  z.infer<
    typeof retryCustomerPaymentSchema
  >["paymentMethod"];

export type PaymentSimulationOutcome =
  z.infer<
    typeof simulateCustomerPaymentSchema
  >["outcome"];
