import { Router } from "express";

import {
  listCategories,
  listOccasions,
} from "../controllers/catalogTaxonomy.controller";

const catalogTaxonomyRouter = Router();

catalogTaxonomyRouter.get(
  "/categories",
  listCategories,
);

catalogTaxonomyRouter.get(
  "/occasions",
  listOccasions,
);

export default catalogTaxonomyRouter;
