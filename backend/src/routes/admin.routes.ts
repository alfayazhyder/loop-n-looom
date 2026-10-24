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
export default adminRouter;
