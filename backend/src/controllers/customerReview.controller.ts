import type {
  Request,
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  createCustomerReview,
  CustomerReviewError,
  deleteCustomerReview,
  getCustomerReview,
  listCustomerReviews,
  listPublicProductReviews,
  updateCustomerReview,
} from "../services/customerReview.service";

import {
  createCustomerReviewSchema,
  customerReviewIdParamsSchema,
  customerReviewListQuerySchema,
  publicProductReviewParamsSchema,
  publicProductReviewQuerySchema,
  updateCustomerReviewSchema,
} from "../validators/customerReview";

function handleCustomerReviewError(
  error: unknown,
  res: Response,
): boolean {
  if (
    error instanceof
    CustomerReviewError
  ) {
    res
      .status(
        error.statusCode,
      )
      .json({
        message:
          error.message,
      });

    return true;
  }

  return false;
}

export async function listReviews(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const parsed =
    customerReviewListQuerySchema.safeParse(
      req.query,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid review filters.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  const result =
    await listCustomerReviews(
      req.user.id,
      parsed.data,
    );

  res.status(200).json(
    result,
  );
}

export async function getReview(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const parsed =
    customerReviewIdParamsSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid review ID.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const review =
      await getCustomerReview(
        req.user.id,
        parsed.data.reviewId,
      );

    res.status(200).json({
      review,
    });
  } catch (error) {
    if (
      handleCustomerReviewError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function createReview(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const parsed =
    createCustomerReviewSchema.safeParse(
      req.body,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid review details.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const review =
      await createCustomerReview(
        req.user.id,
        parsed.data,
      );

    res.status(201).json({
      message:
        "Review submitted for moderation.",

      review,
    });
  } catch (error) {
    if (
      handleCustomerReviewError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function updateReview(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const parsedParams =
    customerReviewIdParamsSchema.safeParse(
      req.params,
    );

  if (
    !parsedParams.success
  ) {
    res.status(400).json({
      message:
        "Invalid review ID.",

      errors:
        parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    updateCustomerReviewSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid review details.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const review =
      await updateCustomerReview(
        req.user.id,
        parsedParams.data
          .reviewId,
        parsedBody.data,
      );

    res.status(200).json({
      message:
        "Review updated and submitted for moderation.",

      review,
    });
  } catch (error) {
    if (
      handleCustomerReviewError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function deleteReview(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      message:
        "Authentication required.",
    });

    return;
  }

  const parsed =
    customerReviewIdParamsSchema.safeParse(
      req.params,
    );

  if (!parsed.success) {
    res.status(400).json({
      message:
        "Invalid review ID.",

      errors:
        parsed.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await deleteCustomerReview(
        req.user.id,
        parsed.data.reviewId,
      );

    res.status(200).json(
      result,
    );
  } catch (error) {
    if (
      handleCustomerReviewError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function listProductReviews(
  req: Request,
  res: Response,
): Promise<void> {
  const parsedParams =
    publicProductReviewParamsSchema.safeParse(
      req.params,
    );

  if (
    !parsedParams.success
  ) {
    res.status(400).json({
      message:
        "Invalid product slug.",

      errors:
        parsedParams.error.flatten(),
    });

    return;
  }

  const parsedQuery =
    publicProductReviewQuerySchema.safeParse(
      req.query,
    );

  if (!parsedQuery.success) {
    res.status(400).json({
      message:
        "Invalid review filters.",

      errors:
        parsedQuery.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await listPublicProductReviews(
        parsedParams.data.slug,
        parsedQuery.data,
      );

    res.status(200).json(
      result,
    );
  } catch (error) {
    if (
      handleCustomerReviewError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}
