import { Router } from "express";

import {
  acceptCustomRequestQuote,
  createCustomRequest,
  createCustomRequestMessage,
  getCustomerCustomRequest,
  listCustomerCustomRequests,
  rejectCustomRequestQuote,
} from "../controllers/customerCustomRequest.controller";
import { requireAuth } from "../middleware/auth.middleware";

const customerCustomRequestRouter = Router();

customerCustomRequestRouter.get(
  "/",
  requireAuth,
  listCustomerCustomRequests,
);

customerCustomRequestRouter.post(
  "/",
  requireAuth,
  createCustomRequest,
);

customerCustomRequestRouter.get(
  "/:requestId",
  requireAuth,
  getCustomerCustomRequest,
);

customerCustomRequestRouter.post(
  "/:requestId/messages",
  requireAuth,
  createCustomRequestMessage,
);

customerCustomRequestRouter.post(
  "/:requestId/quotes/:quoteId/accept",
  requireAuth,
  acceptCustomRequestQuote,
);

customerCustomRequestRouter.post(
  "/:requestId/quotes/:quoteId/reject",
  requireAuth,
  rejectCustomRequestQuote,
);

export default customerCustomRequestRouter;
