import { rateLimit } from "express-rate-limit";
import {
  listCouponsAdmin,
  getCouponAdmin,
  createCouponAdmin,
  updateCouponAdmin,
  listSubscribersAdmin,
  unsubscribeAdmin,
  analyticsOverviewAdmin,
  ordersReportAdmin,
  productsReportAdmin,
  couponsReportAdmin,
} from "../controllers/adminMarketing.controller";
import {
  getCustomerAdmin,
  getReviewAdmin,
  listCustomersAdmin,
  listReviewsAdmin,
  moderateReviewAdmin,
  updateCustomerStatusAdmin,
} from "../controllers/adminCustomerReview.controller";
import { Router } from "express";

import { checkAdminAccess } from "../controllers/adminAccess.controller";
import {
  addOrderQcPhotosAdmin,
  deleteOrderQcPhotoAdmin,
  getOrderAdmin,
  listOrdersAdmin,
  updateOrderShipmentAdmin,
  updateOrderStatusAdmin,
} from "../controllers/adminOrder.controller";
import {
  assignAdminSupport,
  getAdminSupport,
  listAdminSupport,
  sendAdminSupportMessage,
  updateAdminSupportStatus,
} from "../controllers/adminSupport.controller";
import {
  assignCustomRequestAdmin,
  createCustomRequestAdminMessage,
  createCustomRequestQuote,
  getAdminCustomRequest,
  listAdminCustomRequests,
  sendCustomRequestQuote,
  updateCustomRequestStatus,
} from "../controllers/adminCustomRequest.controller";
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
const adminApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 240,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message:
      "Too many admin requests. Please try again later.",
  },
});

adminRouter.use(
  adminApiRateLimiter,
);

adminRouter.use(
  (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  },
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

adminRouter.get(
  "/custom-requests",
  listAdminCustomRequests,
);

adminRouter.get(
  "/custom-requests/:requestId",
  getAdminCustomRequest,
);

adminRouter.patch(
  "/custom-requests/:requestId/assign",
  assignCustomRequestAdmin,
);

adminRouter.patch(
  "/custom-requests/:requestId/status",
  updateCustomRequestStatus,
);

adminRouter.post(
  "/custom-requests/:requestId/messages",
  createCustomRequestAdminMessage,
);

adminRouter.post(
  "/custom-requests/:requestId/quotes",
  createCustomRequestQuote,
);

adminRouter.post(
  "/custom-requests/:requestId/quotes/:quoteId/send",
  sendCustomRequestQuote,
);


adminRouter.get(
  "/support-conversations",
  listAdminSupport,
);

adminRouter.get(
  "/support-conversations/:conversationId",
  getAdminSupport,
);

adminRouter.patch(
  "/support-conversations/:conversationId/assign",
  assignAdminSupport,
);

adminRouter.patch(
  "/support-conversations/:conversationId/status",
  updateAdminSupportStatus,
);

adminRouter.post(
  "/support-conversations/:conversationId/messages",
  sendAdminSupportMessage,
);

adminRouter.get(
  "/orders",
  listOrdersAdmin,
);

adminRouter.get(
  "/orders/:orderId",
  getOrderAdmin,
);

adminRouter.patch(
  "/orders/:orderId/status",
  updateOrderStatusAdmin,
);

adminRouter.post(
  "/orders/:orderId/qc-photos",
  addOrderQcPhotosAdmin,
);

adminRouter.delete(
  "/orders/:orderId/qc-photos/:mediaId",
  deleteOrderQcPhotoAdmin,
);

adminRouter.put(
  "/orders/:orderId/shipment",
  updateOrderShipmentAdmin,
);
adminRouter.get(
  "/customers",
  listCustomersAdmin,
);

adminRouter.get(
  "/customers/:customerId",
  getCustomerAdmin,
);

adminRouter.patch(
  "/customers/:customerId/status",
  updateCustomerStatusAdmin,
);

adminRouter.get(
  "/reviews",
  listReviewsAdmin,
);

adminRouter.get(
  "/reviews/:reviewId",
  getReviewAdmin,
);

adminRouter.patch(
  "/reviews/:reviewId/moderation",
  moderateReviewAdmin,
);
adminRouter.get(
  "/coupons",
  listCouponsAdmin,
);

adminRouter.post(
  "/coupons",
  createCouponAdmin,
);

adminRouter.get(
  "/coupons/:couponId",
  getCouponAdmin,
);

adminRouter.patch(
  "/coupons/:couponId",
  updateCouponAdmin,
);

adminRouter.get(
  "/newsletter-subscribers",
  listSubscribersAdmin,
);

adminRouter.patch(
  "/newsletter-subscribers/:subscriberId/unsubscribe",
  unsubscribeAdmin,
);

adminRouter.get(
  "/analytics/overview",
  analyticsOverviewAdmin,
);

adminRouter.get(
  "/reports/orders",
  ordersReportAdmin,
);

adminRouter.get(
  "/reports/products",
  productsReportAdmin,
);

adminRouter.get(
  "/reports/coupons",
  couponsReportAdmin,
);
export default adminRouter;
