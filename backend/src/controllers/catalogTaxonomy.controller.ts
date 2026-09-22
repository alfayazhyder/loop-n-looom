import type { Request, Response } from "express";

import {
  getActiveCategories,
  getActiveOccasions,
} from "../services/catalogTaxonomy.service";

export async function listCategories(
  _req: Request,
  res: Response,
): Promise<void> {
  const categories = await getActiveCategories();

  res.status(200).json({
    categories,
  });
}

export async function listOccasions(
  _req: Request,
  res: Response,
): Promise<void> {
  const occasions = await getActiveOccasions();

  res.status(200).json({
    occasions,
  });
}
