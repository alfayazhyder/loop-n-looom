import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  CustomerPaymentError,
  getCustomerPaymentStatus,
  retryCustomerPayment,
  simulateCustomerPayment,
} from "../services/customerPayment.service";

import {
  paymentIdParamsSchema,
  paymentStatusQuerySchema,
  retryCustomerPaymentSchema,
  simulateCustomerPaymentSchema,
} from "../validators/customerPayment";

function handlePaymentError(
  error: unknown,
  res: Response,
): boolean {
  if (
    error instanceof
    CustomerPaymentError
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

export async function getPaymentStatus(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    paymentIdParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid payment ID.",

      errors:
        parsedParams.error.flatten(),
    });

    return;
  }

  const parsedQuery =
    paymentStatusQuerySchema.safeParse(
      req.query,
    );

  if (!parsedQuery.success) {
    res.status(400).json({
      message:
        "Invalid payment verification details.",

      errors:
        parsedQuery.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await getCustomerPaymentStatus(
        parsedParams.data.paymentId,
        {
          userId:
            req.user?.id,

          customerEmail:
            parsedQuery.data
              .customerEmail,
        },
      );

    res.status(200).json(
      result,
    );
  } catch (error) {
    if (
      handlePaymentError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function retryPayment(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    paymentIdParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid payment ID.",

      errors:
        parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    retryCustomerPaymentSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid payment retry details.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await retryCustomerPayment(
        parsedParams.data.paymentId,
        parsedBody.data.paymentMethod,
        {
          userId:
            req.user?.id,

          customerEmail:
            parsedBody.data
              .customerEmail,
        },
      );

    res.status(201).json({
      ...result,

      message:
        "A new payment attempt was created.",
    });
  } catch (error) {
    if (
      handlePaymentError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function simulatePayment(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedParams =
    paymentIdParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid payment ID.",

      errors:
        parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    simulateCustomerPaymentSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid payment simulation details.",

      errors:
        parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await simulateCustomerPayment(
        parsedParams.data.paymentId,
        parsedBody.data.outcome,
        parsedBody.data
          .failureReason,
        {
          userId:
            req.user?.id,

          customerEmail:
            parsedBody.data
              .customerEmail,
        },
      );

    res.status(200).json({
      ...result,

      message:
        `Development payment simulation completed with outcome ${parsedBody.data.outcome}.`,
    });
  } catch (error) {
    if (
      handlePaymentError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}
