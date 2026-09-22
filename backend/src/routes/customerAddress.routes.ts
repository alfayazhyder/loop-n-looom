import { Router } from "express";

import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "../controllers/customerAddress.controller";
import { requireAuth } from "../middleware/auth.middleware";

const customerAddressRouter = Router();

customerAddressRouter.get(
  "/",
  requireAuth,
  listAddresses,
);

customerAddressRouter.post(
  "/",
  requireAuth,
  createAddress,
);

customerAddressRouter.put(
  "/:addressId",
  requireAuth,
  updateAddress,
);

customerAddressRouter.delete(
  "/:addressId",
  requireAuth,
  deleteAddress,
);

customerAddressRouter.patch(
  "/:addressId/default",
  requireAuth,
  setDefaultAddress,
);

export default customerAddressRouter;