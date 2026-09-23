import { Router } from "express";

import { checkAdminAccess } from "../controllers/adminAccess.controller";
import {
  archiveProduct,
  createProduct,
  getAdminProduct,
  listAdminProducts,
  updateProduct,
} from "../controllers/adminProduct.controller";
import {
  adjustAdminInventory,
  createAdminVariant,
  listAdminInventoryHistory,
  listAdminVariants,
  updateAdminVariant,
} from "../controllers/adminVariant.controller";
import { requireAdmin } from "../middleware/admin.middleware";
import { requireAuth } from "../middleware/auth.middleware";

const adminRouter = Router();

adminRouter.use(
  requireAuth,
  requireAdmin,
);

adminRouter.get(
  "/access-check",
  checkAdminAccess,
);

adminRouter.get(
  "/products",
  listAdminProducts,
);

adminRouter.get(
  "/products/:productId",
  getAdminProduct,
);

adminRouter.post(
  "/products",
  createProduct,
);

adminRouter.put(
  "/products/:productId",
  updateProduct,
);

adminRouter.patch(
  "/products/:productId/archive",
  archiveProduct,
);

adminRouter.get(
  "/products/:productId/variants",
  listAdminVariants,
);

adminRouter.post(
  "/products/:productId/variants",
  createAdminVariant,
);

adminRouter.put(
  "/products/:productId/variants/:variantId",
  updateAdminVariant,
);

adminRouter.post(
  "/products/:productId/variants/:variantId/inventory",
  adjustAdminInventory,
);

adminRouter.get(
  "/products/:productId/variants/:variantId/inventory",
  listAdminInventoryHistory,
);

export default adminRouter;
