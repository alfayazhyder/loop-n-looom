import type { Response } from "express";

import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  acceptCustomerCustomQuote,
  createCustomerCustomRequest,
  createCustomerCustomRequestMessage,
  CustomerCustomRequestError,
  getCustomerCustomRequestById,
  getCustomerCustomRequests,
  rejectCustomerCustomQuote,
} from "../services/customerCustomRequest.service";
import {
  createCustomerCustomRequestMessageSchema,
  createCustomerCustomRequestSchema,
  customerCustomQuoteParamsSchema,
  customerCustomRequestIdParamSchema,
} from "../validators/customerCustomRequest";

function handleCustomerCustomRequestError(
  error: unknown,
  res: Response,
): boolean {
  if (error instanceof CustomerCustomRequestError) {
    res.status(error.statusCode).json({
      message: error.message,
    });

    return true;
  }

  return false;
}

function requireUserId(
  req: AuthenticatedRequest,
  res: Response,
): string | null {
  if (!req.user) {
    res.status(401).json({
      message: "Authentication required.",
    });

    return null;
  }

  return req.user.id;
}

export async function listCustomerCustomRequests(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const requests =
    await getCustomerCustomRequests(userId);

  res.status(200).json({
    requests,
  });
}

export async function getCustomerCustomRequest(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const parsedParams =
    customerCustomRequestIdParamSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  try {
    const request =
      await getCustomerCustomRequestById(
        userId,
        parsedParams.data.requestId,
      );

    res.status(200).json({
      request,
    });
  } catch (error) {
    if (
      handleCustomerCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function createCustomRequest(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const parsedBody =
    createCustomerCustomRequestSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid custom request details.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const request =
      await createCustomerCustomRequest(
        userId,
        parsedBody.data,
      );

    res.status(201).json({
      request,
      message:
        "Custom request submitted successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function createCustomRequestMessage(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const parsedParams =
    customerCustomRequestIdParamSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  const parsedBody =
    createCustomerCustomRequestMessageSchema.safeParse(
      req.body,
    );

  if (!parsedBody.success) {
    res.status(400).json({
      message:
        "Invalid custom request message.",
      errors: parsedBody.error.flatten(),
    });

    return;
  }

  try {
    const message =
      await createCustomerCustomRequestMessage(
        userId,
        parsedParams.data.requestId,
        parsedBody.data,
      );

    res.status(201).json({
      message,
      statusMessage:
        "Message sent successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function acceptCustomRequestQuote(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const parsedParams =
    customerCustomQuoteParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request or quote ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  try {
    const quote =
      await acceptCustomerCustomQuote(
        userId,
        parsedParams.data.requestId,
        parsedParams.data.quoteId,
      );

    res.status(200).json({
      quote,
      message:
        "Quotation accepted successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}

export async function rejectCustomRequestQuote(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req, res);

  if (!userId) {
    return;
  }

  const parsedParams =
    customerCustomQuoteParamsSchema.safeParse(
      req.params,
    );

  if (!parsedParams.success) {
    res.status(400).json({
      message:
        "Invalid custom request or quote ID.",
      errors: parsedParams.error.flatten(),
    });

    return;
  }

  try {
    const quote =
      await rejectCustomerCustomQuote(
        userId,
        parsedParams.data.requestId,
        parsedParams.data.quoteId,
      );

    res.status(200).json({
      quote,
      message:
        "Quotation rejected successfully.",
    });
  } catch (error) {
    if (
      handleCustomerCustomRequestError(
        error,
        res,
      )
    ) {
      return;
    }

    throw error;
  }
}
