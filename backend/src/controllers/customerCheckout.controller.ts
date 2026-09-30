import type {
  Response,
} from "express";
import {
  CART_COOKIE_NAME,
  clearCartCookieOptions,
} from "../config/cookies";
import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import {
  CustomerCheckoutError,
  placeCustomerOrder,
  previewCustomerCheckout,
  type CustomerCheckoutIdentity,
} from "../services/customerCheckout.service";
import {
  checkoutPreviewSchema,
  placeCustomerOrderSchema,
} from "../validators/customerCheckout";

function handleCheckoutError(
  error: unknown,
  res: Response,
): boolean {
  if (
    error instanceof
    CustomerCheckoutError
  ) {
    res
      .status(
        error.statusCode,
      )
      .json({
        message:
          error.message,
      });

    return true;
  }

  return false;
}

function getCheckoutIdentity(
  req: AuthenticatedRequest,
): CustomerCheckoutIdentity {
  const rawGuestToken =
    req.cookies[
      CART_COOKIE_NAME
    ];

  const guestToken =
    typeof rawGuestToken ===
      "string" &&
    /^[a-f0-9]{64}$/.test(
      rawGuestToken,
    )
      ? rawGuestToken
      : undefined;

  return {
    userId:
      req.user?.id,

    guestToken,
  };
}

function clearCartCookie(
  req: AuthenticatedRequest,
  res: Response,
): void {
  if (
    req.cookies[
      CART_COOKIE_NAME
    ]
  ) {
    res.clearCookie(
      CART_COOKIE_NAME,
      clearCartCookieOptions,
    );
  }
}

export async function previewCheckout(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedBody =
    checkoutPreviewSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid checkout details.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await previewCustomerCheckout(
        getCheckoutIdentity(req),
        parsedBody.data,
      );

    // If a signed-in customer arrived
    // with an old guest-cart cookie,
    // cart preparation merges it into
    // the customer cart.
    if (req.user) {
      clearCartCookie(
        req,
        res,
      );
    }

    res.status(200).json(
      result,
    );
  } catch (error) {
    if (
      handleCheckoutError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function placeOrder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedBody =
    placeCustomerOrderSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid checkout details.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await placeCustomerOrder(
        getCheckoutIdentity(req),
        parsedBody.data,
      );

    // The source cart is now CONVERTED,
    // so its guest token must no longer
    // remain in the browser.
    clearCartCookie(
      req,
      res,
    );

    res.status(201).json({
      ...result,

      message:
        result.requiresPayment
          ? "Order created successfully. Payment is required to complete the order."
          : "Order created and paid successfully.",
    });
  } catch (error) {
    if (
      handleCheckoutError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}