import { z } from "zod";

const emirateSchema = z.enum([
  "ABU_DHABI",
  "DUBAI",
  "SHARJAH",
  "AJMAN",
  "UMM_AL_QUWAIN",
  "RAS_AL_KHAIMAH",
  "FUJAIRAH",
]);

const paymentMethodSchema = z.enum([
  "APPLE_PAY",
  "VISA",
  "MASTERCARD",
]);

const optionalShortText = (maximumLength: number) =>
  z
    .string()
    .trim()
    .max(maximumLength)
    .optional();

export const checkoutShippingAddressSchema =
  z.object({
    recipientName: z
      .string()
      .trim()
      .min(
        2,
        "Recipient name is required",
      )
      .max(
        120,
        "Recipient name is too long",
      ),

    phone: z
      .string()
      .trim()
      .min(
        7,
        "Enter a valid phone number",
      )
      .max(
        30,
        "Phone number is too long",
      ),

    emirate: emirateSchema,

    city: z
      .string()
      .trim()
      .min(
        1,
        "City is required",
      )
      .max(
        100,
        "City is too long",
      ),

    area: z
      .string()
      .trim()
      .min(
        1,
        "Area is required",
      )
      .max(
        120,
        "Area is too long",
      ),

    street:
      optionalShortText(160),

    building:
      optionalShortText(120),

    apartmentOrVilla:
      optionalShortText(120),

    landmark:
      optionalShortText(160),

    deliveryInstructions:
      optionalShortText(500),
  });

const checkoutBaseShape = {
  addressId: z
    .string()
    .uuid(
      "Enter a valid address ID",
    )
    .optional(),

  shippingAddress:
    checkoutShippingAddressSchema.optional(),

  customerName: z
    .string()
    .trim()
    .min(
      2,
      "Customer name is too short",
    )
    .max(
      120,
      "Customer name is too long",
    )
    .optional(),

  customerEmail: z
    .string()
    .trim()
    .email(
      "Enter a valid email address",
    )
    .max(
      255,
      "Email address is too long",
    )
    .optional(),

  customerPhone: z
    .string()
    .trim()
    .min(
      7,
      "Enter a valid phone number",
    )
    .max(
      30,
      "Phone number is too long",
    )
    .optional(),

  storeCreditAmount: z.coerce
    .number()
    .finite()
    .min(
      0,
      "Store credit amount cannot be negative",
    )
    .max(
      999999.99,
      "Store credit amount is too large",
    )
    .optional(),
};

function validateAddressSelection(
  data: {
    addressId?: string;
    shippingAddress?: unknown;
  },
  ctx: z.RefinementCtx,
): void {
  const hasSavedAddress =
    Boolean(data.addressId);

  const hasInlineAddress =
    Boolean(data.shippingAddress);

  if (
    hasSavedAddress ===
    hasInlineAddress
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["addressId"],
      message:
        "Provide either a saved address ID or a shipping address, but not both.",
    });
  }
}

export const checkoutPreviewSchema =
  z
    .object(checkoutBaseShape)
    .superRefine(
      validateAddressSelection,
    );

export const placeCustomerOrderSchema =
  z
    .object({
      ...checkoutBaseShape,

      paymentMethod:
        paymentMethodSchema,
    })
    .superRefine(
      validateAddressSelection,
    );

export type CheckoutShippingAddressInput =
  z.infer<
    typeof checkoutShippingAddressSchema
  >;

export type CheckoutPreviewInput =
  z.infer<
    typeof checkoutPreviewSchema
  >;

export type PlaceCustomerOrderInput =
  z.infer<
    typeof placeCustomerOrderSchema
  >;