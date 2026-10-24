import type { Request, Response } from "express";

import {
  AdminCustomerReviewError,
  getAdminCustomer,
  getAdminReview,
  listAdminCustomers,
  listAdminReviews,
  moderateAdminReview,
  updateAdminCustomerStatus,
} from "../services/adminCustomerReview.service";

import {
  adminCustomerParamsSchema,
  adminCustomerQuerySchema,
  adminCustomerStatusSchema,
  adminReviewModerationSchema,
  adminReviewParamsSchema,
  adminReviewQuerySchema,
} from "../validators/adminCustomerReview";

function invalid(res: Response, errors: unknown): void {
  res.status(400).json({
    message: "Invalid request details.",
    errors,
  });
}

async function respond(
  res: Response,
  action: () => Promise<unknown>,
): Promise<void> {
  try {
    const result = await action();
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AdminCustomerReviewError) {
      res.status(error.statusCode).json({
        message: error.message,
      });
      return;
    }

    throw error;
  }
}

export async function listCustomersAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = adminCustomerQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    invalid(res, parsed.error.flatten());
    return;
  }

  await respond(res, () => listAdminCustomers(parsed.data));
}

export async function getCustomerAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = adminCustomerParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    invalid(res, parsed.error.flatten());
    return;
  }

  await respond(res, () =>
    getAdminCustomer(parsed.data.customerId),
  );
}

export async function updateCustomerStatusAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const params = adminCustomerParamsSchema.safeParse(req.params);
  const body = adminCustomerStatusSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    invalid(res, {
      params: params.success ? null : params.error.flatten(),
      body: body.success ? null : body.error.flatten(),
    });
    return;
  }

  await respond(res, () =>
    updateAdminCustomerStatus(
      params.data.customerId,
      body.data.status,
    ),
  );
}

export async function listReviewsAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = adminReviewQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    invalid(res, parsed.error.flatten());
    return;
  }

  await respond(res, () => listAdminReviews(parsed.data));
}

export async function getReviewAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = adminReviewParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    invalid(res, parsed.error.flatten());
    return;
  }

  await respond(res, () =>
    getAdminReview(parsed.data.reviewId),
  );
}

export async function moderateReviewAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const params = adminReviewParamsSchema.safeParse(req.params);
  const body = adminReviewModerationSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    invalid(res, {
      params: params.success ? null : params.error.flatten(),
      body: body.success ? null : body.error.flatten(),
    });
    return;
  }

  await respond(res, () =>
    moderateAdminReview(
      params.data.reviewId,
      body.data.status,
    ),
  );
}