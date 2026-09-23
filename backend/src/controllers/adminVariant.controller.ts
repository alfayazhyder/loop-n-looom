import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  adjustAdminVariantInventory,
  AdminVariantError,
  createAdminProductVariant,
  getAdminProductVariants,
  getAdminVariantInventoryHistory,
  updateAdminProductVariant,
} from "../services/adminVariant.service";
import { adminProductIdParamSchema } from "../validators/adminProduct";
import {
  adjustInventorySchema,
  adminProductVariantParamsSchema,
  createAdminVariantSchema,
  updateAdminVariantSchema,
} from "../validators/adminVariant";

function handleAdminVariantError(
  error: unknown,
  res: Response,
): boolean {
  if (error instanceof AdminVariantError) {
    res.status(error.statusCode).json({
      message: error.message,
    });

    return true;
  }

  return false;
}

function requireAdminUserId(
  req: AuthenticatedRequest,
  res: Response,
): string | null {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required.",
    });

    return null;
  }

  return req.user.id;
}

export async function listAdminVariants(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    adminProductIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    res.status(400).json({
      message: "Invalid product ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  try {
    const variants = await getAdminProductVariants(
      parsedParams.data.productId,
    );

    res.status(200).json({
      variants,
    });
  } catch (error) {
    if (handleAdminVariantError(error, res)) {
      return;
    }

    throw error;
  }
}

export async function createAdminVariant(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const adminUserId = requireAdminUserId(
    req,
    res,
  );

  if (!adminUserId) {
    return;
  }

  const parsedParams =
    adminProductIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    res.status(400).json({
      message: "Invalid product ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    createAdminVariantSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      message: "Invalid variant details.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const variant =
      await createAdminProductVariant(
        parsedParams.data.productId,
        adminUserId,
        parsedBody.data,
      );

    res.status(201).json({
      variant,
      message:
        "Product variant created successfully.",
    });
  } catch (error) {
    if (handleAdminVariantError(error, res)) {
      return;
    }

    throw error;
  }
}

export async function updateAdminVariant(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    adminProductVariantParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid product or variant ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    updateAdminVariantSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      message: "Invalid variant details.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  if (Object.keys(parsedBody.data).length === 0) {
    res.status(400).json({
      message:
        "Provide at least one variant field to update.",
    });

    return;
  }

  try {
    const variant =
      await updateAdminProductVariant(
        parsedParams.data.productId,
        parsedParams.data.variantId,
        parsedBody.data,
      );

    res.status(200).json({
      variant,
      message:
        "Product variant updated successfully.",
    });
  } catch (error) {
    if (handleAdminVariantError(error, res)) {
      return;
    }

    throw error;
  }
}

export async function adjustAdminInventory(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const adminUserId = requireAdminUserId(
    req,
    res,
  );

  if (!adminUserId) {
    return;
  }

  const parsedParams =
    adminProductVariantParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid product or variant ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    adjustInventorySchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid inventory adjustment.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const variant =
      await adjustAdminVariantInventory(
        parsedParams.data.productId,
        parsedParams.data.variantId,
        adminUserId,
        parsedBody.data,
      );

    res.status(200).json({
      variant,
      message:
        "Inventory updated successfully.",
    });
  } catch (error) {
    if (handleAdminVariantError(error, res)) {
      return;
    }

    throw error;
  }
}

export async function listAdminInventoryHistory(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    adminProductVariantParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid product or variant ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  try {
    const movements =
      await getAdminVariantInventoryHistory(
        parsedParams.data.productId,
        parsedParams.data.variantId,
      );

    res.status(200).json({
      movements,
    });
  } catch (error) {
    if (handleAdminVariantError(error, res)) {
      return;
    }

    throw error;
  }
}