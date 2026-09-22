import type { Request, Response } from "express";

import {
  getCatalogProductBySlug,
  getCatalogProducts,
  ProductCatalogError,
} from "../services/productCatalog.service";
import {
  productListQuerySchema,
  productSlugParamSchema,
} from "../validators/productCatalog";

export async function listCatalogProducts(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = productListQuerySchema.safeParse(
    req.query,
  );

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid product filters.",
      errors: parsed.error.flatten(),
    });

    return;
  }

  const result = await getCatalogProducts(
    parsed.data,
  );

  res.status(200).json(result);
}

export async function getCatalogProduct(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = productSlugParamSchema.safeParse(
    req.params,
  );

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid product slug.",
      errors: parsed.error.flatten(),
    });

    return;
  }

  try {
    const product =
      await getCatalogProductBySlug(
        parsed.data.slug,
      );

    res.status(200).json({
      product,
    });
  } catch (error) {
    if (error instanceof ProductCatalogError) {
      res.status(error.statusCode).json({
        message: error.message,
      });

      return;
    }

    throw error;
  }
}