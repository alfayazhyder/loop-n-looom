import { Router } from "express";

import {
  getCatalogProduct,
  listCatalogProducts,
} from "../controllers/productCatalog.controller";

const productCatalogRouter = Router();

productCatalogRouter.get(
  "/",
  listCatalogProducts,
);

productCatalogRouter.get(
  "/:slug",
  getCatalogProduct,
);

export default productCatalogRouter;