import type { Request, Response } from "express";

import {
  AdminProductError,
  archiveAdminProduct,
  createAdminProduct,
  getAdminProductById,
  getAdminProducts,
  updateAdminProduct,
} from "../services/adminProduct.service";
import {
  adminProductIdParamSchema,
  createAdminProductSchema,
  updateAdminProductSchema,
} from "../validators/adminProduct";

function handleAdminProductError(
  error: unknown,
  res: Response,
): boolean {
  if (error instanceof AdminProductError) {
    res.status(error.statusCode).json({
      message: error.message,
    });

    return true;
  }

  return false;
}

export async function listAdminProducts(
  _req: Request,
  res: Response,
): Promise<void> {
  const products = await getAdminProducts();

  res.status(200).json({
    products,
  });
}

export async function getAdminProduct(
  req: Request,
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
    const product = await getAdminProductById(
      parsedParams.data.productId,
    );

    res.status(200).json({
      product,
    });
  } catch (error) {
    if (handleAdminProductError(error, res)) {
      return;
    }

    throw error;
  }
}

export async function createProduct(
  req: Request,
  res: Response,
): Promise<void> {
  const parsedBody =
    createAdminProductSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      message: "Invalid product details.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const product = await createAdminProduct(
      parsedBody.data,
    );

    res.status(201).json({
      product,
      message: "Product created successfully.",
    });
  } catch (error) {
    if (handleAdminProductError(error, res)) {
      return;
    }

    throw error;
  }
}

export async function updateProduct(
  req: Request,
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

  const parsedBody =
    updateAdminProductSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      message: "Invalid product details.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  if (Object.keys(parsedBody.data).length === 0) {
    res.status(400).json({
      message:
        "Provide at least one product field to update.",
    });

    return;
  }

  try {
    const product = await updateAdminProduct(
      parsedParams.data.productId,
      parsedBody.data,
    );

    res.status(200).json({
      product,
      message: "Product updated successfully.",
    });
  } catch (error) {
    if (handleAdminProductError(error, res)) {
      return;
    }

    throw error;
  }
}

export async function archiveProduct(
  req: Request,
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
    const product = await archiveAdminProduct(
      parsedParams.data.productId,
    );

    res.status(200).json({
      product,
      message: "Product archived successfully.",
    });
  } catch (error) {
    if (handleAdminProductError(error, res)) {
      return;
    }

    throw error;
  }
}