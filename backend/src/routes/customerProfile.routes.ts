import { Router } from "express";

import {
  getProfile,
  updateProfile,
} from "../controllers/customerProfile.controller";
import { requireAuth } from "../middleware/auth.middleware";

const customerProfileRouter = Router();

customerProfileRouter.get(
  "/me",
  requireAuth,
  getProfile,
);

customerProfileRouter.put(
  "/me",
  requireAuth,
  updateProfile,
);

export default customerProfileRouter;