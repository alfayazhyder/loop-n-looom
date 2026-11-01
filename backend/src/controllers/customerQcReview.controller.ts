import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { CustomerQcReviewError, submitCustomerQcReview } from "../services/customerQcReview.service";
import { customerQcReviewBodySchema, customerQcReviewParamsSchema } from "../validators/customerQcReview";

export async function reviewCustomerQc(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }
  if (req.user.role !== "CUSTOMER") {
    res.status(403).json({ message: "Customer approval is required." });
    return;
  }
  const params = customerQcReviewParamsSchema.safeParse(req.params);
  const body = customerQcReviewBodySchema.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ message: "Invalid quality review request." });
    return;
  }
  try {
    const review = await submitCustomerQcReview(req.user.id, params.data.orderId, body.data);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ message: "Quality review recorded.", review });
  } catch (error) {
    if (error instanceof CustomerQcReviewError) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    throw error;
  }
}
