import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  addProductToWishlist,
  CustomerWishlistError,
  getCustomerWishlist,
  removeProductFromWishlist,
  updateWishlistPreferences,
} from "../services/customerWishlist.service";

import {
  updateWishlistPreferencesSchema,
  wishlistListQuerySchema,
  wishlistProductParamSchema,
} from "../validators/customerWishlist";

function handleWishlistError(
  error: unknown,
  res: Response,
): boolean {
  if (
    error instanceof
    CustomerWishlistError
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

export async function listCustomerWishlist(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const parsed =
    wishlistListQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid wishlist query.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const result =
    await getCustomerWishlist(
      req.user.id,
      parsed.data,
    );

  res.status(200).json(
    result,
  );
}

export async function addCustomerWishlistItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const parsed =
    wishlistProductParamSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid product ID.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const item =
      await addProductToWishlist(
        req.user.id,
        parsed.data.productId,
      );

    res.status(201).json({
      message:
        "Product added to wishlist.",

      item,
    });
  } catch (error) {
    if (
      handleWishlistError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function updateCustomerWishlistItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const parsedParams =
    wishlistProductParamSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid product ID.",

      errors:
        parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    updateWishlistPreferencesSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid wishlist preferences.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const item =
      await updateWishlistPreferences(
        req.user.id,
        parsedParams.data
          .productId,
        parsedBody.data,
      );

    res.status(200).json({
      message:
        "Wishlist preferences updated.",

      item,
    });
  } catch (error) {
    if (
      handleWishlistError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function deleteCustomerWishlistItem(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const parsed =
    wishlistProductParamSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid product ID.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    await removeProductFromWishlist(
      req.user.id,
      parsed.data.productId,
    );

    res.status(200).json({
      message:
        "Product removed from wishlist.",
    });
  } catch (error) {
    if (
      handleWishlistError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}
