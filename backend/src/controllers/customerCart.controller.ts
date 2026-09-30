import type { Response } from "express";
import {
  CART_COOKIE_NAME,
  cartCookieOptions,
  clearCartCookieOptions,
} from "../config/cookies";
import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";
import {
  addCustomerCartItem,
  applyCustomerCartCoupon,
  clearCustomerCart,
  CustomerCartError,
  getCustomerCart,
  type CustomerCartIdentity,
  removeCustomerCartCoupon,
  removeCustomerCartItem,
  updateCustomerCartGiftOptions,
  updateCustomerCartItem,
} from "../services/customerCart.service";
import {
  addCustomerCartItemSchema,
  applyCustomerCartCouponSchema,
  customerCartItemIdParamSchema,
  updateCustomerCartGiftOptionsSchema,
  updateCustomerCartItemSchema,
} from "../validators/customerCart";

function handleCustomerCartError(
  error: unknown,
  res: Response,
): boolean {
  if (
    error instanceof
    CustomerCartError
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

function getCartIdentity(
  req: AuthenticatedRequest,
): CustomerCartIdentity {
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

function updateCartCookie(
  req: AuthenticatedRequest,
  res: Response,
  newGuestToken?: string,
): void {
  if (req.user) {
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

    return;
  }

  const existingToken =
    getCartIdentity(
      req,
    ).guestToken;

  const token =
    newGuestToken ??
    existingToken;

  if (token) {
    res.cookie(
      CART_COOKIE_NAME,
      token,
      cartCookieOptions,
    );
  }
}

export async function getCart(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const result =
      await getCustomerCart(
        getCartIdentity(req),
      );

    updateCartCookie(
      req,
      res,
    );

    res
      .status(200)
      .json(result);
  } catch (error) {
    if (
      handleCustomerCartError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function addCartItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedBody =
    addCustomerCartItemSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid cart item details.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await addCustomerCartItem(
        getCartIdentity(req),
        parsedBody.data,
      );

    updateCartCookie(
      req,
      res,
      result.guestToken,
    );

    res.status(200).json({
      cart: result.cart,
      summary:
        result.summary,

      message:
        "Cart updated successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCartError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function updateCartItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    customerCartItemIdParamSchema.safeParse(
      req.params,
    );

  if (
    !parsedParams.success
  ) {
    res.status(400).json({
      message:
        "Invalid cart item ID.",

      errors:
        parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    updateCustomerCartItemSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid cart item quantity.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await updateCustomerCartItem(
        getCartIdentity(req),
        parsedParams.data
          .itemId,
        parsedBody.data,
      );

    updateCartCookie(
      req,
      res,
    );

    res.status(200).json({
      cart: result.cart,
      summary:
        result.summary,

      message:
        "Cart item updated successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCartError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function removeCartItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    customerCartItemIdParamSchema.safeParse(
      req.params,
    );

  if (
    !parsedParams.success
  ) {
    res.status(400).json({
      message:
        "Invalid cart item ID.",

      errors:
        parsedParams.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await removeCustomerCartItem(
        getCartIdentity(req),
        parsedParams.data
          .itemId,
      );

    updateCartCookie(
      req,
      res,
    );

    res.status(200).json({
      cart: result.cart,
      summary:
        result.summary,

      message:
        "Cart item removed successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCartError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function clearCart(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const result =
      await clearCustomerCart(
        getCartIdentity(req),
      );

    updateCartCookie(
      req,
      res,
    );

    res.status(200).json({
      cart: result.cart,
      summary:
        result.summary,

      message:
        "Cart cleared successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCartError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function updateCartGiftOptions(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedBody =
    updateCustomerCartGiftOptionsSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid gift options.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await updateCustomerCartGiftOptions(
        getCartIdentity(req),
        parsedBody.data,
      );

    updateCartCookie(
      req,
      res,
    );

    res.status(200).json({
      cart: result.cart,
      summary:
        result.summary,

      message:
        "Gift options updated successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCartError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function applyCartCoupon(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedBody =
    applyCustomerCartCouponSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid coupon code.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await applyCustomerCartCoupon(
        getCartIdentity(req),
        parsedBody.data,
      );

    updateCartCookie(
      req,
      res,
    );

    res.status(200).json({
      cart: result.cart,
      summary:
        result.summary,

      message:
        "Coupon applied successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCartError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function removeCartCoupon(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const result =
      await removeCustomerCartCoupon(
        getCartIdentity(req),
      );

    updateCartCookie(
      req,
      res,
    );

    res.status(200).json({
      cart: result.cart,
      summary:
        result.summary,

      message:
        "Coupon removed successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCartError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}