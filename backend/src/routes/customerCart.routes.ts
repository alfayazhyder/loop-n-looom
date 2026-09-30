import { Router } from "express";
import {
  addCartItem,
  applyCartCoupon,
  clearCart,
  getCart,
  removeCartCoupon,
  removeCartItem,
  updateCartGiftOptions,
  updateCartItem,
} from "../controllers/customerCart.controller";
import {
  optionalAuth,
} from "../middleware/auth.middleware";

const customerCartRouter =
  Router();

customerCartRouter.get(
  "/",
  optionalAuth,
  getCart,
);

customerCartRouter.post(
  "/items",
  optionalAuth,
  addCartItem,
);

customerCartRouter.patch(
  "/items/:itemId",
  optionalAuth,
  updateCartItem,
);

customerCartRouter.delete(
  "/items/:itemId",
  optionalAuth,
  removeCartItem,
);

customerCartRouter.delete(
  "/items",
  optionalAuth,
  clearCart,
);

customerCartRouter.patch(
  "/gift-options",
  optionalAuth,
  updateCartGiftOptions,
);

customerCartRouter.post(
  "/coupon",
  optionalAuth,
  applyCartCoupon,
);

customerCartRouter.delete(
  "/coupon",
  optionalAuth,
  removeCartCoupon,
);

export default customerCartRouter;