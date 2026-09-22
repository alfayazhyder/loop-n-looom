import { Router } from "express";

import { checkAdminAccess } from "../controllers/adminAccess.controller";
import { requireAdmin } from "../middleware/admin.middleware";
import { requireAuth } from "../middleware/auth.middleware";

const adminRouter = Router();

adminRouter.get(
  "/access-check",
  requireAuth,
  requireAdmin,
  checkAdminAccess,
);

export default adminRouter;