import type {
  Response,
} from "express";

import type {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  CustomerOrderError,
  getCustomerOrderDetail,
  listCustomerOrders,
  trackCustomerOrder,
} from "../services/customerOrder.service";

import {
  customerOrderIdParamsSchema,
  customerOrderListQuerySchema,
  publicOrderTrackingQuerySchema,
} from "../validators/customerOrder";

function handleCustomerOrderError(
  error: unknown,
  res: Response,
): boolean {
  if (
    error instanceof
    CustomerOrderError
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

export async function listOrders(
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

  const parsedQuery =
    customerOrderListQuerySchema.safeParse(
      req.query,
    );

  if (!parsedQuery.success) {
    res.status(400).json({
      message:
        "Invalid order filters.",

      errors:
        parsedQuery.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await listCustomerOrders(
        req.user.id,
        parsedQuery.data,
      );

    res.status(200).json(
      result,
    );
  } catch (error) {
    if (
      handleCustomerOrderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function getOrderDetail(
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
    customerOrderIdParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid order ID.",

      errors:
        parsedParams.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await getCustomerOrderDetail(
        req.user.id,
        parsedParams.data.orderId,
      );

    res.status(200).json(
      result,
    );
  } catch (error) {
    if (
      handleCustomerOrderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function trackOrder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsedQuery =
    publicOrderTrackingQuerySchema.safeParse(
      req.query,
    );

  if (!parsedQuery.success) {
    res.status(400).json({
      message:
        "Invalid order tracking details.",

      errors:
        parsedQuery.error.flatten(),
    });

    return;
  }

  try {
    const result =
      await trackCustomerOrder(
        parsedQuery.data
          .orderNumber,
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
      handleCustomerOrderError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}
